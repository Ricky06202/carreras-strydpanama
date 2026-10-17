import { NextResponse } from "next/server";
import { eq, isNull, sql as dsql } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/lib/db";
import { cedulaKey, formatCedula, phoneDigits } from "@/lib/cedula";
import { clientIp, rateLimited } from "@/lib/ratelimit";
import { startSession } from "@/lib/auth/session";
import { leerTicketAlta } from "@/lib/rsid";

// POST /api/auth/alta — crea la cuenta de un corredor que entra por RS ID.
//
// El correo ya lo verifico el RS ID, y llega firmado en `ticket` (HMAC con
// RS_ID_MOD_SECRET). Por eso esta cuenta NO tiene contraseña: la unica puerta
// de entrada al portal es el RS ID. Si la cedula ya pertenece a una cuenta con
// otro correo, se responde `vincular: true` para que el corredor pruebe que es
// suya con cedula + fecha de nacimiento (POST /api/auth/vincular).
const schemaBody = z.object({
  ticket: z.string().min(10),
  firstName: z.string().trim().min(2, "Nombre requerido").max(60),
  lastName: z.string().trim().min(2, "Apellido requerido").max(60),
  cedula: z.string().transform((v, ctx) => {
    const f = formatCedula(v);
    if (!f) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Cédula inválida (ej. 8-1234-567)" });
    return f ?? "";
  }),
  phone: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? phoneDigits(v) : ""))
    .refine((v) => v === "" || /^\d{7,10}$/.test(v), "Teléfono: solo números"),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida").optional().or(z.literal("")),
});

export async function POST(req: Request) {
  const db = getDb();
  if (await rateLimited(db, `alta-rsid:${clientIp(req)}`, 6, 3600_000)) {
    return NextResponse.json({ error: "Demasiados intentos desde esta conexión. Intenta en una hora." }, { status: 429 });
  }

  const parsed = schemaBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const i of parsed.error.issues) if (!fields[String(i.path[0])]) fields[String(i.path[0])] = i.message;
    return NextResponse.json({ error: "Revisa los datos", fields }, { status: 422 });
  }
  const d = parsed.data;

  const email = await leerTicketAlta(d.ticket);
  if (!email) {
    return NextResponse.json({ error: "El enlace con el RS ID expiró. Entra de nuevo con tu RS ID." }, { status: 401 });
  }

  // ¿Ese correo ya tiene cuenta? (el canje ya lo habria encontrado, pero el alta
  // puede repetirse con el mismo ticket).
  const porCorreo = await db
    .select({ id: schema.runners.id })
    .from(schema.runners)
    .where(eq(schema.runners.email, email))
    .get();
  if (porCorreo) {
    await db.update(schema.runners).set({ rsidEmail: email, updatedAt: new Date().toISOString() }).where(eq(schema.runners.id, porCorreo.id)).run();
    await startSession(porCorreo.id, new URL(req.url).protocol === "https:");
    return NextResponse.json({ ok: true });
  }

  // ¿La cedula ya esta en otra cuenta? -> hay que vincular, no duplicar.
  const cedulaDup = await db
    .select({ id: schema.runners.id })
    .from(schema.runners)
    .where(dsql`REPLACE(UPPER(${schema.runners.cedula}), '-', '') = ${cedulaKey(d.cedula)}`)
    .get();
  if (cedulaDup) {
    return NextResponse.json(
      {
        error: "Esa cédula ya tiene una cuenta con otro correo.",
        vincular: true,
        fields: { cedula: "Esa cédula ya tiene cuenta" },
      },
      { status: 409 },
    );
  }

  const id = crypto.randomUUID();
  const ts = new Date().toISOString();
  await db
    .insert(schema.runners)
    .values({
      id,
      cedula: d.cedula,
      email,
      rsidEmail: email,
      firstName: d.firstName,
      lastName: d.lastName,
      phone: d.phone || null,
      birthDate: d.birthDate || null,
      createdAt: ts,
      updatedAt: ts,
    })
    .run();

  // Inscripciones hechas con ese correo antes de tener cuenta.
  await db
    .update(schema.registrations)
    .set({ runnerId: id, updatedAt: ts })
    .where(dsql`LOWER(${schema.registrations.email}) = ${email} AND ${isNull(schema.registrations.runnerId)}`)
    .run();

  await startSession(id, new URL(req.url).protocol === "https:");
  return NextResponse.json({ ok: true });
}
