import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/lib/db";
import { clientIp, rateLimited } from "@/lib/ratelimit";
import { startSession, verifyPassword } from "@/lib/auth/session";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  const db = getDb();
  const parsed = loginSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Correo y contraseña requeridos" }, { status: 422 });
  const { email, password } = parsed.data;
  if (await rateLimited(db, `login:${email}:${clientIp(req)}`, 10, 15 * 60_000)) {
    return NextResponse.json({ error: "Demasiados intentos. Intenta de nuevo en 15 minutos." }, { status: 429 });
  }

  const runner = await db.select().from(schema.runners).where(eq(schema.runners.email, email)).get();
  if (!runner?.passwordHash || !runner.passwordSalt) {
    return NextResponse.json({ error: "Correo o contraseña incorrectos" }, { status: 401 });
  }
  if (!(await verifyPassword(password, runner.passwordHash, runner.passwordSalt))) {
    return NextResponse.json({ error: "Correo o contraseña incorrectos" }, { status: 401 });
  }

  // Sin reclamo automático por correo: el correo no está verificado. Las
  // inscripciones previas se vinculan en /mi-portal vía /api/auth/claim (cédula+fecha).
  await startSession(runner.id, new URL(req.url).protocol === "https:");
  return NextResponse.json({ ok: true });
}
