import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/lib/db";
import { hashPassword, startSession } from "@/lib/auth/session";

const signupSchema = z.object({
  firstName: z.string().trim().min(2, "Nombre requerido").max(60),
  lastName: z.string().trim().min(2, "Apellido requerido").max(60),
  email: z.string().trim().toLowerCase().email("Correo inválido"),
  phone: z.string().trim().regex(/^\+?\d{7,15}$/, "Teléfono inválido").optional().or(z.literal("")),
  cedula: z.string().trim().regex(/^\d{6,15}$/, "Cédula requerida (solo dígitos)"),
  password: z.string().min(8, "Mínimo 8 caracteres").max(128),
});

export async function POST(req: Request) {
  const parsed = signupSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const i of parsed.error.issues) if (!fields[String(i.path[0])]) fields[String(i.path[0])] = i.message;
    return NextResponse.json({ error: "Revisa los datos", fields }, { status: 422 });
  }
  const d = parsed.data;
  const db = getDb();

  const clash = await db.select({ id: schema.runners.id }).from(schema.runners).where(eq(schema.runners.email, d.email)).get();
  if (clash) return NextResponse.json({ error: "Ese correo ya tiene cuenta. Inicia sesión.", fields: { email: "Ya registrado" } }, { status: 409 });

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

  // reclama inscripciones previas hechas con el mismo correo
  await db
    .update(schema.registrations)
    .set({ runnerId: id, updatedAt: ts })
    .where(eq(schema.registrations.email, d.email))
    .run();

  await startSession(id, new URL(req.url).protocol === "https:");
  return NextResponse.json({ ok: true });
}
