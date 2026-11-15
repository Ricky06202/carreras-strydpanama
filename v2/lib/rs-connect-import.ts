import { z } from "zod";
import { eq } from "drizzle-orm";
import { confirmRegistrationPayment, createRegistration, RegError, registrationSchema, validateRegistrationCandidate } from "@/lib/registration/service";
import { cedulaKey } from "@/lib/cedula";
import { getDb, schema } from "@/lib/db";

const rowSchema = z.object({
  firstName: z.string().trim().min(2).max(60),
  lastName: z.string().trim().min(2).max(60),
  email: z.string().trim().toLowerCase().email(),
  phone: z.string().min(7).max(32),
  cedula: z.string().trim().min(5).max(30),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  gender: z.enum(["masculino", "femenino", "otro"]),
  distanceId: z.string().min(1).max(120),
  participantTypeKey: z.string().trim().max(80).optional(),
  teamName: z.string().trim().max(80).optional(),
  shirtSize: z.enum(["S", "M", "L", "XL", "XXL"]).optional(),
  paymentMethod: z.enum(["transferencia", "efectivo"]),
  paymentStatus: z.enum(["pendiente", "pagado"]),
  termsAccepted: z.literal(true),
  privacyAccepted: z.literal(true),
  adultOrGuardian: z.literal(true),
  consentAt: z.string().refine((value) => /(?:Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value)) && Date.parse(value) <= Date.now(), "Fecha de consentimiento inválida o futura").optional(),
}).strict();

const envelopeSchema = z.object({
  slug: z.string().trim().min(1).max(160),
  rows: z.array(rowSchema).min(1).max(30),
}).strict();

const commitSchema = envelopeSchema.extend({
  approvalToken: z.string().regex(/^[a-f0-9]{64}$/i),
  approvedByUser: z.literal(true),
}).strict();

type ImportRow = z.infer<typeof rowSchema>;
type ImportRegistration = Omit<z.infer<typeof registrationSchema>, "method"> & { method: ImportRow["paymentMethod"] };
type NormalizedRow = { registration: ImportRegistration; paymentStatus: ImportRow["paymentStatus"]; consentAt?: string };
type DbBinding = NonNullable<Parameters<typeof getDb>[0]>;

function canonical(value: unknown): string {
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (value !== null && typeof value === "object") {
    const object = value as Record<string, unknown>;
    return "{" + Object.keys(object).sort().map((key) => JSON.stringify(key) + ":" + canonical(object[key])).join(",") + "}";
  }
  return JSON.stringify(value) ?? "null";
}

async function sha256(value: string): Promise<string> {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function randomToken(): string {
  return [...crypto.getRandomValues(new Uint8Array(32))].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function normalize(slug: string, rows: ImportRow[]): { normalized: NormalizedRow[]; errors: { row: number; message: string }[] } {
  const normalized: NormalizedRow[] = [];
  const errors: { row: number; message: string }[] = [];
  rows.forEach((row, index) => {
    const parsed = registrationSchema.safeParse({
      slug,
      firstName: row.firstName,
      lastName: row.lastName,
      email: row.email,
      phone: row.phone,
      cedula: row.cedula,
      birthDate: row.birthDate,
      gender: row.gender,
      distanceId: row.distanceId,
      participantTypeKey: row.participantTypeKey,
      teamName: row.teamName,
      shirtSize: row.shirtSize,
      termsAccepted: row.termsAccepted,
      privacyAccepted: row.privacyAccepted,
      adultOrGuardian: row.adultOrGuardian,
      method: row.paymentMethod,
    });
    if (!parsed.success) {
      errors.push({ row: index + 1, message: parsed.error.issues.map((issue) => issue.message).join("; ") });
      return;
    }
    normalized.push({ registration: { ...parsed.data, method: row.paymentMethod }, paymentStatus: row.paymentStatus, ...(row.consentAt ? { consentAt: new Date(row.consentAt).toISOString() } : {}) });
  });
  return { normalized, errors };
}

function normalizedPayload(slug: string, rows: NormalizedRow[]): string {
  return canonical({ slug, rows });
}

function rowSummary(row: NormalizedRow, candidate?: Awaited<ReturnType<typeof validateRegistrationCandidate>>) {
  return {
    nombre: row.registration.firstName + " " + row.registration.lastName,
    cedula: row.registration.cedula,
    correo: row.registration.email,
    telefono: row.registration.phone,
    modalidad: candidate?.distance.title ?? row.registration.distanceId,
    categoria: candidate?.category?.title ?? null,
    monto: candidate ? candidate.distance.price ?? candidate.race.price : null,
    pago: row.paymentStatus,
    metodo: row.registration.method,
  };
}

export async function previewRegistrationImport(dbBinding: DbBinding | undefined, args: Record<string, unknown>, accountId: string) {
  const parsed = envelopeSchema.safeParse(args);
  if (!parsed.success) return { listo: false, errores: parsed.error.issues.map((issue) => ({ campo: issue.path.join("."), mensaje: issue.message })) };
  if (!dbBinding) return { listo: false, error: "La base de datos de Carrera no está disponible." };
  const { slug, rows } = parsed.data;
  const { normalized, errors } = normalize(slug, rows);
  if (errors.length) return { listo: false, filas: errors, total: rows.length };

  const db = getDb(dbBinding);
  const seenCedulas = new Set<string>();
  const candidates: Awaited<ReturnType<typeof validateRegistrationCandidate>>[] = [];
  const validationErrors: { row: number; message: string }[] = [];
  let reservedSlots = 0;
  for (let index = 0; index < normalized.length; index++) {
    const row = normalized[index]!;
    try {
      const candidate = await validateRegistrationCandidate(db, row.registration, { seenCedulas, reservedSlots });
      seenCedulas.add(cedulaKey(row.registration.cedula));
      reservedSlots++;
      candidates.push(candidate);
    } catch (error) {
      validationErrors.push({ row: index + 1, message: error instanceof RegError ? error.message : "No se pudo validar esta fila." });
      candidates.push(undefined as unknown as Awaited<ReturnType<typeof validateRegistrationCandidate>>);
    }
  }
  if (validationErrors.length) return { listo: false, filas: normalized.map((row, index) => ({ fila: index + 1, ...rowSummary(row, candidates[index]) })), errores: validationErrors };

  const payloadHash = await sha256(normalizedPayload(slug, normalized));
  const token = randomToken();
  const approvalHash = await sha256(token);
  const raceId = candidates[0]!.race.id;
  const expiresAt = Date.now() + 15 * 60_000;
  const committedBefore = new Date(Date.now() - 90 * 24 * 60 * 60_000).toISOString();
  await dbBinding.prepare("DELETE FROM mcp_registration_imports WHERE (committed_at IS NULL AND expires_at < ?) OR committed_at < ?")
    .bind(Date.now(), committedBefore).run();
  await dbBinding.prepare("INSERT INTO mcp_registration_imports (approval_hash, account_id, race_id, payload_hash, expires_at, committed_at) VALUES (?, ?, ?, ?, ?, NULL)")
    .bind(approvalHash, accountId, raceId, payloadHash, expiresAt).run();
  return {
    listo: true,
    carrera: candidates[0]!.race.title,
    total: normalized.length,
    filas: normalized.map((row, index) => ({ fila: index + 1, ...rowSummary(row, candidates[index]) })),
    venceEn: new Date(expiresAt).toISOString(),
    approvalToken: token,
    aviso: "Muestra estas filas y solicita aprobación explícita antes de llamar confirmar_importacion_inscripciones.",
  };
}

export async function commitRegistrationImport(dbBinding: DbBinding | undefined, args: Record<string, unknown>, accountId: string) {
  const parsed = commitSchema.safeParse(args);
  if (!parsed.success) return { ok: false, errores: parsed.error.issues.map((issue) => ({ campo: issue.path.join("."), mensaje: issue.message })) };
  if (!dbBinding) return { ok: false, error: "La base de datos de Carrera no está disponible." };
  const { slug, rows, approvalToken } = parsed.data;
  const { normalized, errors } = normalize(slug, rows);
  if (errors.length) return { ok: false, errores: errors };
  const payloadHash = await sha256(normalizedPayload(slug, normalized));
  const approvalHash = await sha256(approvalToken);
  const approval = await dbBinding.prepare("SELECT account_id, race_id, payload_hash, expires_at, committed_at FROM mcp_registration_imports WHERE approval_hash = ?")
    .bind(approvalHash).first<{ account_id: string; race_id: string; payload_hash: string; expires_at: number; committed_at: string | null }>();
  if (!approval || approval.account_id !== accountId || approval.payload_hash !== payloadHash ||
      (!approval.committed_at && approval.expires_at <= Date.now())) {
    return { ok: false, error: "La aprobación expiró, ya no coincide con estos datos o pertenece a otra cuenta. Vuelve a previsualizar." };
  }

  const db = getDb(dbBinding);
  const seenCedulas = new Set<string>();
  let reservedSlots = 0;
  for (let index = 0; index < normalized.length; index++) {
    const row = normalized[index]!;
    const importKey = approvalHash + ":" + index;
    const existing = await dbBinding.prepare("SELECT id FROM payments WHERE mcp_import_key = ?").bind(importKey).first();
    const cedula = cedulaKey(row.registration.cedula);
    if (seenCedulas.has(cedula)) return { ok: false, error: "El lote contiene una cédula repetida.", fila: index + 1 };
    seenCedulas.add(cedula);
    if (existing) continue;
    try {
      await validateRegistrationCandidate(db, row.registration, { seenCedulas: new Set([...seenCedulas].filter((item) => item !== cedula)), reservedSlots });
      reservedSlots++;
    } catch (error) {
      return { ok: false, error: error instanceof RegError ? error.message : "No se pudo revalidar el lote.", fila: index + 1 };
    }
  }

  const results: { fila: number; nombre: string; estado: string; pago: string; dorsal: number | null; codigo: string }[] = [];
  for (let index = 0; index < normalized.length; index++) {
    const row = normalized[index]!;
    try {
      const created = await createRegistration(db, row.registration, {
        suppressEmail: true,
        importKey: approvalHash + ":" + index,
        consentAt: row.consentAt,
      });
      let status = created.status;
      let paymentStatus = created.paymentStatus;
      let bibNumber: number | null = null;
      if (row.paymentStatus === "pagado") {
        const confirmed = await confirmRegistrationPayment(db, created.confirmationCode, { trusted: true, method: row.registration.method });
        if (!confirmed.ok) throw new RegError(409, "No se pudo confirmar el pago de esta fila");
        status = confirmed.status ?? "inscrito";
        paymentStatus = "pagado";
        bibNumber = confirmed.bibNumber ?? null;
      } else {
        const registration = await db.select().from(schema.registrations).where(eq(schema.registrations.id, created.registrationId)).get();
        bibNumber = registration?.bibNumber ?? null;
      }
      results.push({
        fila: index + 1,
        nombre: created.runnerName,
        estado: status,
        pago: paymentStatus,
        dorsal: bibNumber,
        codigo: created.confirmationCode,
      });
    } catch (error) {
      return {
        ok: false,
        parcial: results.length > 0,
        procesadas: results,
        fila: index + 1,
        error: error instanceof RegError ? error.message : "No se pudo completar la importación. Puedes reintentar con la misma aprobación.",
      };
    }
  }
  await dbBinding.prepare("UPDATE mcp_registration_imports SET committed_at = ? WHERE approval_hash = ? AND account_id = ? AND payload_hash = ?")
    .bind(new Date().toISOString(), approvalHash, accountId, payloadHash).run();
  return { ok: true, carrera: (await db.select().from(schema.races).where(eq(schema.races.id, approval.race_id)).get())?.title ?? slug, total: results.length, filas: results };
}
