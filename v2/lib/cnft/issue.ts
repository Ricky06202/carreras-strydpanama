// Emision del cupo digital (cNFT comprimido). Regla de oro: NUNCA romper la
// inscripcion. Cualquier fallo se guarda en la fila del cupo y se puede
// reintentar desde el panel; la inscripcion sigue su curso normal.
import { and, asc, desc, eq, sql as dsql } from "drizzle-orm";
import type { Db } from "@/lib/db";
import { schema } from "@/lib/db";
import { cnftConfig, readCnftEnv, type CnftConfig } from "./config";
import { buildTicketMetadata } from "./metadata";
import { getProvider } from "./provider";
import { ensureManagedWallet } from "./wallets";

export type TicketStatus = "pending" | "minted" | "error" | "skipped";

export interface IssueOutcome {
  status: TicketStatus | "already";
  registrationId: string;
  ticketId?: string;
  assetId?: string | null;
  ownerAddress?: string | null;
  network?: string;
  mock?: boolean;
  reason?: string;
}

const nowIso = () => new Date().toISOString();

function siteUrl(env: Record<string, string | undefined>): string {
  return (env.SITE_URL ?? "https://carreras.strydpanama.com").trim().replace(/\/+$/, "");
}

function raceImageUrl(rel: string | null | undefined, site: string): string | null {
  if (!rel) return null;
  if (rel.startsWith("http")) return rel;
  const key = rel.split("/").pop();
  return key ? `${site}/api/images/${key}` : null;
}

export async function findTicketByRegistration(db: Db, registrationId: string) {
  return (
    (await db
      .select()
      .from(schema.cnftTickets)
      .where(eq(schema.cnftTickets.registrationId, registrationId))
      .get()) ?? null
  );
}

/**
 * Emite (idempotente) el cupo de una inscripcion.
 * Si el flag esta apagado o falta config -> no toca la base: devuelve "skipped".
 */
export async function issueTicketForRegistration(
  db: Db,
  registrationId: string,
  opts?: { force?: boolean; cfg?: CnftConfig },
): Promise<IssueOutcome> {
  const env = readCnftEnv() as Record<string, string | undefined>;
  const cfg = opts?.cfg ?? cnftConfig(env);
  const base: IssueOutcome = { status: "skipped", registrationId };

  try {
    if (!cfg.enabled) {
      return { ...base, reason: "CNFT_RED apagado (o falta CNFT_WALLET_KEY)" };
    }

    const reg = await db.select().from(schema.registrations).where(eq(schema.registrations.id, registrationId)).get();
    if (!reg) return { ...base, reason: "inscripcion no encontrada" };

    const existing = await findTicketByRegistration(db, registrationId);
    if (existing && existing.status === "minted" && !opts?.force) {
      return {
        status: "already",
        registrationId,
        ticketId: existing.id,
        assetId: existing.assetId,
        ownerAddress: existing.ownerAddress,
        network: existing.network,
        mock: existing.mock,
      };
    }

    const race = await db.select().from(schema.races).where(eq(schema.races.id, reg.raceId)).get();
    if (!race) return { ...base, reason: "carrera no encontrada" };

    // 1) Fila del cupo (pending) — el indice unico garantiza 1 por inscripcion.
    let ticketId = existing?.id ?? null;
    if (!ticketId) {
      const id = crypto.randomUUID();
      const ts = nowIso();
      try {
        await db
          .insert(schema.cnftTickets)
          .values({
            id,
            registrationId,
            raceId: reg.raceId,
            network: cfg.mode === "live" ? cfg.network : "mock",
            status: "pending",
            mock: cfg.mode !== "live",
            attempts: 0,
            createdAt: ts,
            updatedAt: ts,
          })
          .run();
        ticketId = id;
      } catch {
        const again = await findTicketByRegistration(db, registrationId);
        if (!again) return { ...base, reason: "no se pudo preparar el cupo" };
        ticketId = again.id;
        if (again.status === "minted" && !opts?.force) {
          return { status: "already", registrationId, ticketId, assetId: again.assetId, ownerAddress: again.ownerAddress, network: again.network, mock: again.mock };
        }
      }
    }

    const markError = async (message: string): Promise<IssueOutcome> => {
      await db
        .update(schema.cnftTickets)
        .set({
          status: "error",
          attempts: dsql`${schema.cnftTickets.attempts} + 1`,
          lastError: message.slice(0, 400),
          updatedAt: nowIso(),
        })
        .where(eq(schema.cnftTickets.id, ticketId as string))
        .run();
      return { status: "error", registrationId, ticketId: ticketId as string, network: cfg.network, reason: message };
    };

    // 2) Wallet gestionada del atleta (por cuenta; si no hay cuenta, por inscripcion).
    const walletKey = (env.CNFT_WALLET_KEY ?? "").trim();
    if (!walletKey) return await markError("falta CNFT_WALLET_KEY");
    let wallet;
    try {
      wallet = await ensureManagedWallet(db, {
        ownerType: reg.runnerId ? "runner" : "registration",
        ownerId: (reg.runnerId ?? reg.id) as string,
        network: cfg.network,
        walletKey,
      });
    } catch (e) {
      return await markError(`wallet: ${e instanceof Error ? e.message : String(e)}`);
    }

    // 3) Metadata (Metaplex) servida por nosotros mismos.
    const site = siteUrl(env);
    const [dist, cat, runner] = await Promise.all([
      reg.distanceId
        ? db.select({ title: schema.raceDistances.title }).from(schema.raceDistances).where(eq(schema.raceDistances.id, reg.distanceId)).get()
        : null,
      reg.categoryId
        ? db.select({ title: schema.raceCategories.title }).from(schema.raceCategories).where(eq(schema.raceCategories.id, reg.categoryId)).get()
        : null,
      reg.runnerId ? db.select().from(schema.runners).where(eq(schema.runners.id, reg.runnerId)).get() : null,
    ]);

    const metadataUri = `${site}/api/cupos/meta/${registrationId}`;
    const metadata = buildTicketMetadata({
      network: cfg.mode === "live" ? cfg.network : "mock",
      registrationId,
      confirmationCode: reg.confirmationCode,
      raceTitle: race.title,
      raceDate: race.date,
      raceSlug: race.slug,
      distanceTitle: dist?.title ?? null,
      categoryTitle: cat?.title ?? null,
      bibNumber: reg.bibNumber,
      athleteName: runner ? `${runner.firstName} ${runner.lastName}` : reg.title,
      athleteAlias: null,
      athletePublic: runner ? runner.publicProfile : true,
      imageUrl: raceImageUrl(race.imageUrl, site),
      siteUrl: site,
      cupoIndex: reg.bibNumber,
      cupoTotal: race.maxParticipants,
      nonTransferable: true,
      issuer: null,
      createdAt: nowIso(),
    });

    // 4) Mint (real o simulado).
    const provider = getProvider(cfg.mode);
    const outcome = await provider.mint({
      network: cfg.mode === "live" ? cfg.network : "mock",
      ownerAddress: wallet.publicKey,
      metadataUri,
      metadata,
      registrationId,
      confirmationCode: reg.confirmationCode,
      nonTransferable: true,
      treasurySecret: env.CNFT_TREASURY_SECRET,
      treeAddress: cfg.treeAddress ?? undefined,
      rpcUrl: env.CNFT_RPC_URL,
    });

    if (!outcome.ok) return await markError(outcome.error ?? "mint fallo");

    await db
      .update(schema.cnftTickets)
      .set({
        status: "minted",
        mock: outcome.mock,
        assetId: outcome.assetId ?? null,
        ownerAddress: wallet.publicKey,
        signature: outcome.signature ?? null,
        treeAddress: outcome.treeAddress ?? cfg.treeAddress ?? null,
        metadataUri,
        metadataJson: JSON.stringify(metadata),
        provider: outcome.provider,
        walletId: wallet.id,
        attempts: dsql`${schema.cnftTickets.attempts} + 1`,
        lastError: null,
        mintedAt: nowIso(),
        updatedAt: nowIso(),
      })
      .where(eq(schema.cnftTickets.id, ticketId))
      .run();

    return {
      status: "minted",
      registrationId,
      ticketId,
      assetId: outcome.assetId ?? null,
      ownerAddress: wallet.publicKey,
      network: cfg.mode === "live" ? cfg.network : "mock",
      mock: outcome.mock,
    };
  } catch (e) {
    // Red de seguridad: jamas propagar hacia la inscripcion.
    return { ...base, status: "error", reason: e instanceof Error ? e.message : String(e) };
  }
}

/** Reintento desde el panel: un cupo en error/pending se vuelve a emitir sin duplicar. */
export async function retryTicket(db: Db, ticketId: string): Promise<IssueOutcome> {
  const ticket = await db.select().from(schema.cnftTickets).where(eq(schema.cnftTickets.id, ticketId)).get();
  if (!ticket) return { status: "error", registrationId: "", reason: "cupo no encontrado" };
  return issueTicketForRegistration(db, ticket.registrationId, { force: true });
}

export interface AdminTicketRow {
  id: string;
  registrationId: string;
  athlete: string;
  bibNumber: number | null;
  confirmationCode: string;
  status: string;
  mock: boolean;
  network: string;
  assetId: string | null;
  ownerAddress: string | null;
  attempts: number;
  lastError: string | null;
  mintedAt: string | null;
  updatedAt: string;
}

export async function listTicketsForRace(db: Db, raceId: string): Promise<AdminTicketRow[]> {
  const rows = await db
    .select({
      id: schema.cnftTickets.id,
      registrationId: schema.cnftTickets.registrationId,
      athlete: schema.registrations.title,
      bibNumber: schema.registrations.bibNumber,
      confirmationCode: schema.registrations.confirmationCode,
      status: schema.cnftTickets.status,
      mock: schema.cnftTickets.mock,
      network: schema.cnftTickets.network,
      assetId: schema.cnftTickets.assetId,
      ownerAddress: schema.cnftTickets.ownerAddress,
      attempts: schema.cnftTickets.attempts,
      lastError: schema.cnftTickets.lastError,
      mintedAt: schema.cnftTickets.mintedAt,
      updatedAt: schema.cnftTickets.updatedAt,
    })
    .from(schema.cnftTickets)
    .innerJoin(schema.registrations, eq(schema.registrations.id, schema.cnftTickets.registrationId))
    .where(eq(schema.cnftTickets.raceId, raceId))
    .orderBy(desc(schema.cnftTickets.updatedAt))
    .all();
  return rows;
}

export interface CupoPublic {
  found: boolean;
  registrationId?: string;
  athlete?: string;
  raceTitle?: string;
  raceSlug?: string;
  raceDate?: string;
  distance?: string | null;
  category?: string | null;
  bibNumber?: number | null;
  confirmationCode?: string;
  status?: string;
  mock?: boolean;
  network?: string;
  assetId?: string | null;
  ownerAddress?: string | null;
  signature?: string | null;
  metadataUri?: string | null;
  mintedAt?: string | null;
  onChain?: boolean;
}

/** Datos publicos del cupo (sin PII sensible: nada de cedula/correo/telefono). */
export async function getPublicCupo(db: Db, registrationId: string): Promise<CupoPublic> {
  const reg = await db.select().from(schema.registrations).where(eq(schema.registrations.id, registrationId)).get();
  if (!reg) return { found: false };
  const [race, dist, cat, ticket] = await Promise.all([
    db.select().from(schema.races).where(eq(schema.races.id, reg.raceId)).get(),
    reg.distanceId ? db.select({ title: schema.raceDistances.title }).from(schema.raceDistances).where(eq(schema.raceDistances.id, reg.distanceId)).get() : null,
    reg.categoryId ? db.select({ title: schema.raceCategories.title }).from(schema.raceCategories).where(eq(schema.raceCategories.id, reg.categoryId)).get() : null,
    findTicketByRegistration(db, registrationId),
  ]);
  return {
    found: true,
    registrationId: reg.id,
    athlete: reg.title,
    raceTitle: race?.title ?? "",
    raceSlug: race?.slug ?? "",
    raceDate: race?.date ?? "",
    distance: dist?.title ?? null,
    category: cat?.title ?? null,
    bibNumber: reg.bibNumber,
    confirmationCode: reg.confirmationCode,
    status: ticket?.status ?? "pending",
    mock: ticket?.mock ?? true,
    network: ticket?.network ?? "mock",
    assetId: ticket?.assetId ?? null,
    ownerAddress: ticket?.ownerAddress ?? null,
    signature: ticket?.signature ?? null,
    metadataUri: ticket?.metadataUri ?? null,
    mintedAt: ticket?.mintedAt ?? null,
    onChain: ticket?.status === "minted" && ticket?.mock === false,
  };
}

/** Verificador: acepta id de inscripcion, asset id, firma o direccion de wallet. */
export async function verifyCupo(db: Db, rawQuery: string): Promise<CupoPublic[]> {
  const q = (rawQuery ?? "").trim();
  if (!q) return [];
  const reg = await db.select({ id: schema.registrations.id }).from(schema.registrations).where(eq(schema.registrations.id, q)).get();
  if (reg) return [await getPublicCupo(db, reg.id)];

  const byCode = await db
    .select({ id: schema.registrations.id })
    .from(schema.registrations)
    .where(eq(schema.registrations.confirmationCode, q.toUpperCase()))
    .get();
  if (byCode) return [await getPublicCupo(db, byCode.id)];

  const rows = await db
    .select({ registrationId: schema.cnftTickets.registrationId })
    .from(schema.cnftTickets)
    .where(
      dsql`${schema.cnftTickets.assetId} = ${q} or ${schema.cnftTickets.signature} = ${q} or ${schema.cnftTickets.ownerAddress} = ${q}`,
    )
    .orderBy(asc(schema.cnftTickets.mintedAt))
    .limit(20)
    .all();
  const out: CupoPublic[] = [];
  for (const r of rows) out.push(await getPublicCupo(db, r.registrationId));
  return out;
}
