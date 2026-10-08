import { NextResponse } from "next/server";
import { z } from "zod";
import { guardAdmin } from "@/lib/admin/api";
import { adminTeamAction, AdminTeamError } from "@/lib/admin/teams";

const bodySchema = z.object({
  action: z.enum(["approve", "unapprove", "rename", "delete"]),
  payload: z.unknown().optional(),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin();
  if (denied) return denied;

  const { id } = await ctx.params;
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
  }

  try {
    const result = await adminTeamAction(id, parsed.data.action, parsed.data.payload);
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof AdminTeamError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("admin equipos acción:", e);
    return NextResponse.json({ error: "Error inesperado" }, { status: 500 });
  }
}
