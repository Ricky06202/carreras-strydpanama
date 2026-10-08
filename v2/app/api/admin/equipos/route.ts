import { NextResponse } from "next/server";
import { z } from "zod";
import { guardAdmin } from "@/lib/admin/api";
import { adminListTeams, createTeam, AdminTeamError } from "@/lib/admin/teams";

export async function GET(req: Request) {
  const denied = await guardAdmin();
  if (denied) return denied;
  const url = new URL(req.url);
  try {
    const data = await adminListTeams({
      q: url.searchParams.get("q") ?? undefined,
      status: url.searchParams.get("status") ?? undefined,
      page: Number(url.searchParams.get("page") ?? 1) || 1,
    });
    return NextResponse.json(data);
  } catch (e) {
    console.error("admin equipos GET:", e);
    return NextResponse.json({ error: "Error inesperado" }, { status: 500 });
  }
}

const bodySchema = z.object({
  name: z.string().min(2, "Mínimo 2 caracteres").max(80, "Máximo 80 caracteres"),
  approve: z.boolean().optional(),
});

export async function POST(req: Request) {
  const denied = await guardAdmin();
  if (denied) return denied;
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 422 });
  }
  try {
    const res = await createTeam({ name: parsed.data.name, approve: parsed.data.approve });
    return NextResponse.json(res);
  } catch (e) {
    if (e instanceof AdminTeamError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error("admin equipos POST:", e);
    return NextResponse.json({ error: "Error inesperado" }, { status: 500 });
  }
}
