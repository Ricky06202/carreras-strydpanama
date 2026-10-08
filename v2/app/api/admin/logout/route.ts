import { NextResponse } from "next/server";
import { clearAdminSession } from "@/lib/admin/session";

export async function POST(req: Request) {
  const res = NextResponse.json({ ok: true });
  await clearAdminSession(res, new URL(req.url).protocol === "https:");
  return res;
}
