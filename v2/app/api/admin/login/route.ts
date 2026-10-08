import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { clientIp, rateLimited } from "@/lib/ratelimit";
import { checkAdminPassword, startAdminSession } from "@/lib/admin/session";

export async function POST(req: Request) {
  const db = getDb();
  if (await rateLimited(db, `admin-login:${clientIp(req)}`, 8, 15 * 60_000)) {
    return NextResponse.json({ error: "Demasiados intentos. Intenta de nuevo en 15 minutos." }, { status: 429 });
  }
  const { password } = (await req.json().catch(() => ({}))) as { password?: string };
  if (!(await checkAdminPassword(password ?? ""))) {
    return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 401 });
  }
  await startAdminSession(new URL(req.url).protocol === "https:");
  return NextResponse.json({ ok: true });
}
