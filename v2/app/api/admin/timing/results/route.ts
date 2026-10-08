import { NextResponse } from "next/server";
import { z } from "zod";
import { guardAdmin } from "@/lib/admin/api";
import { computeResults, listResults, AdminTimingError } from "@/lib/admin/timing";

export async function GET(req: Request) {
  const denied = await guardAdmin();
  if (denied) return denied;
  const race = new URL(req.url).searchParams.get("race");
  if (!race) return NextResponse.json({ error: "Falta la carrera" }, { status: 422 });
  try {
    return NextResponse.json(await listResults(race));
  } catch (e) {
    console.error("admin timing resultados GET:", e);
    return NextResponse.json({ error: "Error inesperado" }, { status: 500 });
  }
}

const bodySchema = z.object({ raceId: z.string().min(1) });

export async function POST(req: Request) {
  const denied = await guardAdmin();
  if (denied) return denied;
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Falta la carrera" }, { status: 422 });
  try {
    const res = await computeResults(parsed.data.raceId);
    return NextResponse.json(res);
  } catch (e) {
    if (e instanceof AdminTimingError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error("admin timing resultados POST:", e);
    return NextResponse.json({ error: "Error inesperado" }, { status: 500 });
  }
}
