import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { guardAdmin } from "@/lib/admin/api";
import { adminListRegs, adminStats } from "@/lib/admin/registrations";

export async function GET(req: Request) {
  const denied = await guardAdmin();
  if (denied) return denied;

  const url = new URL(req.url);
  const race = url.searchParams.get("race");
  if (!race) return NextResponse.json({ error: "Falta la carrera" }, { status: 400 });

  const page = Number(url.searchParams.get("page") ?? "1");
  const [list, stats] = await Promise.all([
    adminListRegs({
      raceId: race,
      q: url.searchParams.get("q") ?? undefined,
      status: url.searchParams.get("status") ?? undefined,
      paymentStatus: url.searchParams.get("payment") ?? undefined,
      page: Number.isFinite(page) ? page : 1,
    }),
    adminStats(getDb(), race),
  ]);

  return NextResponse.json({ ...list, stats });
}
