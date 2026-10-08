import { NextResponse } from "next/server";
import { guardAdmin } from "@/lib/admin/api";
import { deleteTimingEvent, AdminTimingError } from "@/lib/admin/timing";

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin();
  if (denied) return denied;
  const { id } = await ctx.params;
  try {
    const res = await deleteTimingEvent(id);
    return NextResponse.json({ ok: true, ...res });
  } catch (e) {
    if (e instanceof AdminTimingError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error("admin timing deshacer:", e);
    return NextResponse.json({ error: "Error inesperado" }, { status: 500 });
  }
}
