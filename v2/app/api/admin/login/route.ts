import { NextResponse } from "next/server";
import { checkAdminPassword, startAdminSession } from "@/lib/admin/session";

export async function POST(req: Request) {
  const { password } = (await req.json().catch(() => ({}))) as { password?: string };
  if (!(await checkAdminPassword(password ?? ""))) {
    return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 401 });
  }
  await startAdminSession(new URL(req.url).protocol === "https:");
  return NextResponse.json({ ok: true });
}
