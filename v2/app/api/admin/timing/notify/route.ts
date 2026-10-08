import { NextResponse } from "next/server";
import { z } from "zod";
import { guardAdmin } from "@/lib/admin/api";
import { sendRaceResults, AdminNotifyError } from "@/lib/admin/notify";

const bodySchema = z.object({ raceId: z.string().min(1) });

export async function POST(req: Request) {
  const denied = await guardAdmin();
  if (denied) return denied;
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Falta la carrera" }, { status: 422 });
  try {
    const res = await sendRaceResults(parsed.data.raceId);
    return NextResponse.json(res);
  } catch (e) {
    if (e instanceof AdminNotifyError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error("admin notify:", e);
    return NextResponse.json({ error: "Error inesperado" }, { status: 500 });
  }
}
