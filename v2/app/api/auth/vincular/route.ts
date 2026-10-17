import { NextResponse } from "next/server";
import { and, eq, isNull, or, sql as dsql } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/lib/db";
import { cedulaKey, formatCedula } from "@/lib/cedula";
import { clientIp, rateLimited } from "@/lib/ratelimit";
import { startSession } from "@/lib/auth/session";
import { leerTicketAlta } from "@/lib/rsid";

// POST /api/auth/vincular — une la cuenta existente con el correo del RS ID.
//
// Caso real: el corredor se inscribio con un correo y su RS ID usa otro. El
// canje no lo reconoce y el alta choca con "esa cedula ya tiene cuenta".
// Prueba de propiedad: cedula + fecha de nacimiento (la cedula sola es
// enumerable). Si coincide con la cuenta o con alguna de sus inscripciones, se
// guarda el correo del RS ID en runners.rsid_email y se abre la sesion.
const bodySchema = z.object({
  ticket: z.string().min(10),
  cedula: z
    .string()
    .transform((v) => formatCedula(v) ?? "")
    .refine((v) => v.length > 0, "Cédula inválida (ej. 8-1234-567)"),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha de nacimiento inválida"),
});

export async function POST(req: Request) {
  const db = getDb();
  if (await rateLimited(db, `vincular-rsid:${clientIp(req)}`, 10, 3600_000)) {
    return NextResponse.json({ error: "Demasiados intentos. Espera una hora." }, { status: 429 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Cédula y fecha de nacimiento requeridas" }, { status: 422 });
  }
  const { cedula, birthDate } = parsed.data;

  const email = await leerTicketAlta(parsed.data.ticket);
  if (!email) {
    return NextResponse.json({ error: "El enlace con el RS ID expiró. Entra de nuevo con tu RS ID." }, { status: 401 });
  }

  const key = cedulaKey(cedula);
  const cuenta = await db
    .select()
    .from(schema.runners)
    .where(dsql`REPLACE(UPPER(${schema.runners.cedula}), '-', '') = ${key}`)
    .get();
  if (!cuenta) {
    return NextResponse.json({ error: "No encontramos ninguna cuenta con esa cédula. Crea tu cuenta con el RS ID." }, { status: 404 });
  }

  // La cuenta no siempre guarda la fecha; las inscripciones si. Vale cualquiera.
  const inscripcion = await db
    .select({ id: schema.registrations.id })
    .from(schema.registrations)
    .where(
      and(
        dsql`REPLACE(UPPER(${schema.registrations.cedula}), '-', '') = ${key}`,
        eq(schema.registrations.birthDate, birthDate),
        or(isNull(schema.registrations.runnerId), eq(schema.registrations.runnerId, cuenta.id)),
      ),
    )
    .get();

  if (cuenta.birthDate !== birthDate && !inscripcion) {
    return NextResponse.json({ error: "Los datos no coinciden con esa cuenta." }, { status: 422 });
  }

  const ts = new Date().toISOString();
  await db.update(schema.runners).set({ rsidEmail: email, updatedAt: ts }).where(eq(schema.runners.id, cuenta.id)).run();

  // Inscripciones hechas con el correo del RS ID (o con la cedula) sin cuenta.
  await db
    .update(schema.registrations)
    .set({ runnerId: cuenta.id, updatedAt: ts })
    .where(
      and(
        or(dsql`LOWER(${schema.registrations.email}) = ${email}`, dsql`REPLACE(UPPER(${schema.registrations.cedula}), '-', '') = ${key}`),
        isNull(schema.registrations.runnerId),
      ),
    )
    .run();

  await startSession(cuenta.id, new URL(req.url).protocol === "https:");
  return NextResponse.json({ ok: true });
}
