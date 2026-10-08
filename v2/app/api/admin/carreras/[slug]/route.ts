import { NextResponse } from "next/server";
import { guardAdmin } from "@/lib/admin/api";
import { getRaceAdmin, updateRace, raceFullSchema, RaceAdminError } from "@/lib/admin/races";

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const denied = await guardAdmin();
  if (denied) return denied;
  const { slug } = await ctx.params;
  try {
    return NextResponse.json(await getRaceAdmin(slug));
  } catch (e) {
    if (e instanceof RaceAdminError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

export async function PUT(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const denied = await guardAdmin();
  if (denied) return denied;
  const { slug } = await ctx.params;

  const parsed = raceFullSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json({ error: first ? `${first.path.join(".")}: ${first.message}` : "Datos inválidos" }, { status: 422 });
  }
  try {
    const fresh = await updateRace(slug, parsed.data);
    return NextResponse.json({ ok: true, message: "Carrera actualizada", slug: fresh.race.slug });
  } catch (e) {
    if (e instanceof RaceAdminError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error("admin carreras update:", e);
    return NextResponse.json({ error: "Error inesperado" }, { status: 500 });
  }
}
