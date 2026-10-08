import { NextResponse } from "next/server";
import { guardAdmin } from "@/lib/admin/api";
import { deleteCode } from "@/lib/admin/codes";

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin();
  if (denied) return denied;
  const { id } = await ctx.params;
  try {
    const res = await deleteCode(id);
    return NextResponse.json({ ok: true, message: `Código ${res.code} eliminado` });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    const status = msg.includes("no encontrado") ? 404 : 409;
    return NextResponse.json({ error: msg }, { status });
  }
}
