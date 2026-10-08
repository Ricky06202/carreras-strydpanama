import { NextResponse } from "next/server";
import { guardAdmin } from "@/lib/admin/api";
import { buildResultsCsv } from "@/lib/admin/timing";

export async function GET(req: Request) {
  const denied = await guardAdmin();
  if (denied) return denied;
  const race = new URL(req.url).searchParams.get("race");
  if (!race) return NextResponse.json({ error: "Falta la carrera" }, { status: 422 });
  try {
    const out = await buildResultsCsv(race);
    if (!out) return NextResponse.json({ error: "Carrera no encontrada" }, { status: 404 });
    return new Response(out.csv, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="${out.filename}"`,
        "cache-control": "no-store",
      },
    });
  } catch (e) {
    console.error("admin timing export:", e);
    return NextResponse.json({ error: "Error inesperado" }, { status: 500 });
  }
}
