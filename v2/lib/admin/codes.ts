import { and, asc, count, eq, sql as dsql } from "drizzle-orm";
import { getDb, schema, type Db } from "@/lib/db";

export type AdminCodeItem = {
  id: string;
  code: string;
  status: "generated" | "sold" | "redeemed";
  vendor: string | null;
  batchId: string | null;
  allowedType: string;
  redeemedByCedula: string | null;
  usedAt: string | null;
  createdAt: string;
};

export type CodeStats = { generated: number; sold: number; redeemed: number };

const CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // sin 0/O/1/I/L para dictado por teléfono

function randomCode(): string {
  const rnd = crypto.getRandomValues(new Uint8Array(8));
  let out = "SPY-";
  for (let i = 0; i < 8; i++) {
    out += CHARS[(rnd[i] ?? 0) % CHARS.length];
    if (i === 3) out += "-";
  }
  return out;
}

async function genUniqueCodes(db: Db, raceId: string, qty: number): Promise<string[]> {
  const out = new Set<string>();
  let guard = 0;
  while (out.size < qty && guard < 60) {
    guard++;
    const batch = Array.from({ length: qty - out.size + 4 }, randomCode);
    const existing = await db
      .select({ code: schema.registrationCodes.code })
      .from(schema.registrationCodes)
      .where(dsql`${schema.registrationCodes.code} in (${dsql.join(batch.map((b) => dsql`${b}`), dsql`, `)})`);
    const taken = new Set(existing.map((e) => e.code));
    for (const c of batch) if (!taken.has(c)) out.add(c);
    if (out.size === 0 && guard > 3) break;
  }
  if (out.size < qty) throw new Error("No se pudieron generar códigos únicos, intenta de nuevo");
  return Array.from(out).slice(0, qty);
}

export async function generateCodes(opts: { raceId: string; qty: number; vendor?: string; allowedType?: string }): Promise<{ created: string[]; batchId: string }> {
  const db = getDb();
  const race = await db.select({ id: schema.races.id }).from(schema.races).where(eq(schema.races.id, opts.raceId)).get();
  if (!race) throw new Error("Carrera no encontrada");
  const qty = Math.max(1, Math.min(100, Math.floor(opts.qty)));
  const allowed = ["all", "general", "estudiante", "team"].includes(opts.allowedType ?? "") ? opts.allowedType! : "all";
  const codes = await genUniqueCodes(db, opts.raceId, qty);
  const batchId = crypto.randomUUID();
  const ts = new Date().toISOString();
  await db
    .insert(schema.registrationCodes)
    .values(codes.map((code) => ({ id: crypto.randomUUID(), raceId: opts.raceId, code, vendor: opts.vendor?.trim() || null, batchId, status: "generated" as const, allowedType: allowed as "all", createdAt: ts, updatedAt: ts })))
    .run();
  return { created: codes, batchId };
}

export async function listCodes(raceId: string, status?: string): Promise<{ items: AdminCodeItem[]; stats: CodeStats }> {
  const db = getDb();
  const conds = [eq(schema.registrationCodes.raceId, raceId)];
  if (status && ["generated", "sold", "redeemed"].includes(status)) conds.push(eq(schema.registrationCodes.status, status as "generated"));
  const rows = await db
    .select()
    .from(schema.registrationCodes)
    .where(and(...conds))
    .orderBy(asc(schema.registrationCodes.createdAt))
    .limit(200)
    .all();
  const statRows = await db
    .select({ status: schema.registrationCodes.status, n: count() })
    .from(schema.registrationCodes)
    .where(eq(schema.registrationCodes.raceId, raceId))
    .groupBy(schema.registrationCodes.status);
  const stats: CodeStats = { generated: 0, sold: 0, redeemed: 0 };
  for (const s of statRows) stats[s.status as keyof CodeStats] = s.n;
  return { items: rows.map((r) => ({ ...r, status: r.status, vendor: r.vendor, allowedType: r.allowedType })) as AdminCodeItem[], stats };
}

export async function deleteCode(id: string): Promise<{ code: string }> {
  const db = getDb();
  const row = await db.select().from(schema.registrationCodes).where(eq(schema.registrationCodes.id, id)).get();
  if (!row) throw new Error("Código no encontrado");
  if (row.status === "redeemed") throw new Error("No se puede eliminar un código ya canjeado");
  await db.delete(schema.registrationCodes).where(eq(schema.registrationCodes.id, id)).run();
  return { code: row.code };
}
