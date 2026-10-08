import { NextResponse } from "next/server";
import { and, eq, isNull, or, sql as dsql } from "drizzle-orm";
import { cedulaKey, formatCedula } from "@/lib/cedula";
import { z } from "zod";
import { getDb, schema } from "@/lib/db";
import { rateLimited } from "@/lib/ratelimit";
import { getRunner } from "@/lib/auth/session";

// Vincula inscripciones hechas antes de tener cuenta. Prueba de propiedad:
// cédula + fecha de nacimiento (la cédula sola es enumerable).
const claimSchema = z.object({
  cedula: z
    .string()
    .transform((v) => formatCedula(v) ?? "")
    .refine((v) => v.length > 0, "Cédula inválida (ej. 8-1234-567)"),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
});

export async function POST(req: Request) {
  const runner = await getRunner();
  if (!runner) return NextResponse.json({ error: "Sin sesión" }, { status: 401 });
  const parsed = claimSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Cédula y fecha de nacimiento requeridas" }, { status: 422 });

  const db = getDb();
  if (await rateLimited(db, `claim:${runner.id}`, 10, 3600_000)) {
    return NextResponse.json({ error: "Demasiados intentos de vinculación. Intenta en una hora." }, { status: 429 });
  }
  const claimable = await db
    .select({ id: schema.registrations.id })
    .from(schema.registrations)
    .where(
      and(
        dsql`REPLACE(UPPER(${schema.registrations.cedula}), '-', '') = ${cedulaKey(parsed.data.cedula)}`,
        eq(schema.registrations.birthDate, parsed.data.birthDate),
        or(isNull(schema.registrations.runnerId), eq(schema.registrations.runnerId, runner.id)),
      ),
    )
    .all();

  if (claimable.length > 0) {
    const ts = new Date().toISOString();
    for (const r of claimable) {
      await db.update(schema.registrations).set({ runnerId: runner.id, updatedAt: ts }).where(eq(schema.registrations.id, r.id)).run();
    }
    if (!runner.cedula) {
      await db.update(schema.runners).set({ cedula: parsed.data.cedula, updatedAt: ts }).where(eq(schema.runners.id, runner.id)).run();
    }
  }
  return NextResponse.json({ ok: true, claimed: claimable.length });
}
