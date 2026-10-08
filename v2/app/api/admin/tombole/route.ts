import { NextResponse } from "next/server";
import { z } from "zod";
import { guardAdmin } from "@/lib/admin/api";
import { drawWinner, listRaffle, AdminRaffleError } from "@/lib/admin/raffle";

export async function GET(req: Request) {
  const denied = await guardAdmin();
  if (denied) return denied;
  const race = new URL(req.url).searchParams.get("race");
  if (!race) return NextResponse.json({ error: "Falta la carrera" }, { status: 422 });
  try {
    return NextResponse.json(await listRaffle(race));
  } catch (e) {
    console.error("admin tómbola GET:", e);
    return NextResponse.json({ error: "Error inesperado" }, { status: 500 });
  }
}

const bodySchema = z.object({
  raceId: z.string().min(1),
  prize: z.string().trim().max(60).optional(),
  finishersOnly: z.boolean().optional(),
});

export async function POST(req: Request) {
  const denied = await guardAdmin();
  if (denied) return denied;
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 422 });
  try {
    return NextResponse.json(await drawWinner(parsed.data));
  } catch (e) {
    if (e instanceof AdminRaffleError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error("admin tómbola sorteo:", e);
    return NextResponse.json({ error: "Error inesperado" }, { status: 500 });
  }
}
