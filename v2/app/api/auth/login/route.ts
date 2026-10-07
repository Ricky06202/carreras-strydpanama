import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/lib/db";
import { startSession, verifyPassword } from "@/lib/auth/session";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  const parsed = loginSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Correo y contraseña requeridos" }, { status: 422 });
  const { email, password } = parsed.data;

  const runner = await getDb().select().from(schema.runners).where(eq(schema.runners.email, email)).get();
  if (!runner?.passwordHash || !runner.passwordSalt) {
    return NextResponse.json({ error: "Correo o contraseña incorrectos" }, { status: 401 });
  }
  if (!(await verifyPassword(password, runner.passwordHash, runner.passwordSalt))) {
    return NextResponse.json({ error: "Correo o contraseña incorrectos" }, { status: 401 });
  }

  // reclama inscripciones por correo que aun no tengan cuenta
  await getDb()
    .update(schema.registrations)
    .set({ runnerId: runner.id })
    .where(eq(schema.registrations.email, runner.email))
    .run();

  await startSession(runner.id, new URL(req.url).protocol === "https:");
  return NextResponse.json({ ok: true });
}
