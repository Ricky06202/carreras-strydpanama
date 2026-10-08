import { NextResponse } from "next/server";
import { z } from "zod";
import { guardAdmin } from "@/lib/admin/api";
import { setRaceTimer, AdminTimingError } from "@/lib/admin/timing";

const bodySchema = z.object({
  raceId: z.string().min(1),
  action: z.enum(["start", "stop", "reset"]),
});

export async function POST(req: Request) {
  const denied = await guardAdmin();
  if (denied) return denied;
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Acción inválida" }, { status: 422 });
  try {
    const res = await setRaceTimer(parsed.data.raceId, parsed.data.action);
    return NextResponse.json(res);
  } catch (e) {
    if (e instanceof AdminTimingError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error("admin timer:", e);
    return NextResponse.json({ error: "Error inesperado" }, { status: 500 });
  }
}
