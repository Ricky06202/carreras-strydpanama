import { NextResponse } from "next/server";
import { z } from "zod";
import { guardAdmin } from "@/lib/admin/api";
import { generateCodes, listCodes } from "@/lib/admin/codes";

export async function GET(req: Request) {
  const denied = await guardAdmin();
  if (denied) return denied;
  const url = new URL(req.url);
  const race = url.searchParams.get("race");
  if (!race) return NextResponse.json({ items: [], stats: { generated: 0, sold: 0, redeemed: 0 } });
  const data = await listCodes(race, url.searchParams.get("status") ?? undefined);
  return NextResponse.json(data);
}

const bodySchema = z.object({
  raceId: z.string().min(1),
  qty: z.coerce.number().int().min(1).max(100),
  vendor: z.string().trim().max(60).optional(),
  allowedType: z.enum(["all", "general", "estudiante", "team"]).optional(),
});

export async function POST(req: Request) {
  const denied = await guardAdmin();
  if (denied) return denied;
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Cantidad debe ser 1-100" }, { status: 422 });
  }
  try {
    const res = await generateCodes(parsed.data);
    return NextResponse.json(res);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error generando códigos" }, { status: 400 });
  }
}
