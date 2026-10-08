import { NextResponse } from "next/server";
import { z } from "zod";
import { guardAdmin } from "@/lib/admin/api";
import { adminListTiming, parseTimeSec, recordTiming, AdminTimingError, CHECKPOINTS, type Checkpoint } from "@/lib/admin/timing";

export async function GET(req: Request) {
  const denied = await guardAdmin();
  if (denied) return denied;
  const race = new URL(req.url).searchParams.get("race");
  if (!race) return NextResponse.json({ error: "Falta la carrera" }, { status: 422 });
  try {
    return NextResponse.json(await adminListTiming(race));
  } catch (e) {
    console.error("admin timing GET:", e);
    return NextResponse.json({ error: "Error inesperado" }, { status: 500 });
  }
}

const bodySchema = z.object({
  raceId: z.string().min(1),
  bib: z.coerce.number().int().min(1).max(99999),
  time: z.string().min(1),
  checkpoint: z.enum(CHECKPOINTS),
});

export async function POST(req: Request) {
  const denied = await guardAdmin();
  if (denied) return denied;
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Dorsal y tiempo (1:02:03 o 12:03) son obligatorios" }, { status: 422 });
  }
  const timeSec = parseTimeSec(parsed.data.time);
  if (timeSec == null) {
    return NextResponse.json({ error: "Tiempo inválido — usa 1:02:03 o 12:03" }, { status: 422 });
  }
  try {
    const res = await recordTiming({
      raceId: parsed.data.raceId,
      bib: parsed.data.bib,
      timeSec,
      checkpoint: parsed.data.checkpoint as Checkpoint,
    });
    return NextResponse.json(res);
  } catch (e) {
    if (e instanceof AdminTimingError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error("admin timing POST:", e);
    return NextResponse.json({ error: "Error inesperado" }, { status: 500 });
  }
}
