import { NextResponse } from "next/server";
import { guardAdmin } from "@/lib/admin/api";
import { createRace, raceCoreSchema, RaceAdminError } from "@/lib/admin/races";

export async function POST(req: Request) {
  const denied = await guardAdmin();
  if (denied) return denied;

  const parsed = raceCoreSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json({ error: first ? `${first.path.join(".")}: ${first.message}` : "Datos inválidos" }, { status: 422 });
  }
  try {
    const res = await createRace(parsed.data);
    return NextResponse.json(res);
  } catch (e) {
    if (e instanceof RaceAdminError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error("admin carreras create:", e);
    return NextResponse.json({ error: "Error inesperado" }, { status: 500 });
  }
}
