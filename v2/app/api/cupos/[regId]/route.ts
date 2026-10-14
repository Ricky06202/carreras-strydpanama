import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getPublicCupo } from "@/lib/cnft/issue";

// Cupo publico (JSON): lo consume /mi-cupo y el verificador.
export async function GET(_req: Request, ctx: { params: Promise<{ regId: string }> }) {
  const { regId } = await ctx.params;
  const cupo = await getPublicCupo(getDb(), regId);
  if (!cupo.found) return NextResponse.json({ error: "Cupo no encontrado" }, { status: 404 });
  return NextResponse.json(cupo, { headers: { "cache-control": "no-store" } });
}
