import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/lib/db";
import { getRunner, hashPassword, startSession, verifyPassword } from "@/lib/auth/session";

const changeSchema = z.object({
  current: z.string().min(1),
  next: z.string().min(8, "Mínimo 8 caracteres").max(128),
});

export async function POST(req: Request) {
  const runner = await getRunner();
  if (!runner) return NextResponse.json({ error: "Sin sesión" }, { status: 401 });
  const parsed = changeSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Contraseña actual inválida", fields: { next: parsed.error.issues[0]?.message ?? "" } }, { status: 422 });

  const ok = runner.passwordHash && runner.passwordSalt
    ? await verifyPassword(parsed.data.current, runner.passwordHash, runner.passwordSalt)
    : false;
  if (!ok) return NextResponse.json({ error: "La contraseña actual no coincide", fields: { current: "Incorrecta" } }, { status: 401 });

  const { hash, salt } = await hashPassword(parsed.data.next);
  await getDb()
    .update(schema.runners)
    .set({ passwordHash: hash, passwordSalt: salt, updatedAt: new Date().toISOString() })
    .where(eq(schema.runners.id, runner.id))
    .run();
  // Rotar la sesión: un token robado muere al cambiar la contraseña.
  await startSession(runner.id, new URL(req.url).protocol === "https:");
  return NextResponse.json({ ok: true });
}
