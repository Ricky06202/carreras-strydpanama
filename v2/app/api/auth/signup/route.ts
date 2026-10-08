import { NextResponse } from "next/server";
import { eq, sql as dsql } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/lib/db";
import { cedulaKey, formatCedula, phoneDigits } from "@/lib/cedula";
import { clientIp, rateLimited } from "@/lib/ratelimit";
import { hashPassword, startSession } from "@/lib/auth/session";

const signupSchema = z.object({
  firstName: z.string().trim().min(2, "Nombre requerido").max(60),
  lastName: z.string().trim().min(2, "Apellido requerido").max(60),
  email: z.string().trim().toLowerCase().email("Correo inválido"),
  phone: z.string().optional().or(z.literal("")).transform((v) => (v ? phoneDigits(v) : "")).refine((v) => v === "" || /^\d{7,10}$/.test(v), "Teléfono: solo números"),
  cedula: z.string().transform((v, ctx) => {
    const f = formatCedula(v);
    if (!f) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Cédula inválida (ej. 8-1234-567)" });
    return f ?? "";
  }),
  password: z.string().min(8, "Mínimo 8 caracteres").max(128),
});

export async function POST(req: Request) {
  const db = getDb();
  if (await rateLimited(db, `signup:${clientIp(req)}`, 5, 3600_000)) {
    return NextResponse.json({ error: "Demasiadas cuentas creadas desde esta conexión. Intenta en una hora." }, { status: 429 });
  }
  const parsed = signupSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const i of parsed.error.issues) if (!fields[String(i.path[0])]) fields[String(i.path[0])] = i.message;
    return NextResponse.json({ error: "Revisa los datos", fields }, { status: 422 });
  }
  const d = parsed.data;

  const clash = await db.select({ id: schema.runners.id }).from(schema.runners).where(eq(schema.runners.email, d.email)).get();
  if (clash) return NextResponse.json({ error: "Ese correo ya tiene cuenta. Inicia sesión.", fields: { email: "Ya registrado" } }, { status: 409 });
  const cEDup = await db
    .select({ id: schema.runners.id })
    .from(schema.runners)
    .where(dsql`REPLACE(UPPER(${schema.runners.cedula}), '-', '') = ${cedulaKey(d.cedula)}`)
    .get();
  if (cEDup) return NextResponse.json({ error: "Esa cédula ya tiene cuenta. Inicia sesión.", fields: { cedula: "Ya registrada" } }, { status: 409 });

  const { hash, salt } = await hashPassword(d.password);
  const id = crypto.randomUUID();
  const ts = new Date().toISOString();
  await db
    .insert(schema.runners)
    .values({
      id,
      cedula: d.cedula,
      email: d.email,
      firstName: d.firstName,
      lastName: d.lastName,
      phone: d.phone || null,
      passwordHash: hash,
      passwordSalt: salt,
      createdAt: ts,
      updatedAt: ts,
    })
    .run();

  // Sin reclamo automático por correo (correo no verificado): las inscripciones
  // previas se vinculan en /mi-portal vía /api/auth/claim con cédula+fecha de nacimiento.
  await startSession(id, new URL(req.url).protocol === "https:");
  return NextResponse.json({ ok: true });
}
