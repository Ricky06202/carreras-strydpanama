import { NextResponse } from "next/server";
import { guardAdmin } from "@/lib/admin/api";
import { deleteExpense, expenseSchema, updateExpense } from "@/lib/admin/finance";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin();
  if (denied) return denied;
  const { id } = await ctx.params;
  const parsed = expenseSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json({ error: first ? first.message : "Datos inválidos" }, { status: 422 });
  }
  try {
    await updateExpense(id, parsed.data);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: msg }, { status: msg.includes("no encontrado") ? 404 : 500 });
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin();
  if (denied) return denied;
  const { id } = await ctx.params;
  await deleteExpense(id);
  return NextResponse.json({ ok: true });
}
