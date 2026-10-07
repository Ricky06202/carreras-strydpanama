import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getRegistrationStatus } from "@/lib/registration/service";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const reg = await getRegistrationStatus(getDb(), id);
  if (!reg) return NextResponse.json({ error: "no encontrada" }, { status: 404 });
  return NextResponse.json(reg);
}
