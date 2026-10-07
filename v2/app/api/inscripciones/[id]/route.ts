import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/lib/db";
import { getRunner } from "@/lib/auth/session";
import { getRegistrationStatus } from "@/lib/registration/service";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const reg = await getRegistrationStatus(getDb(), id);
  if (!reg) return NextResponse.json({ error: "no encontrada" }, { status: 404 });
  return NextResponse.json(reg);
}

const editSchema = z.object({
  phone: z.string().trim().regex(/^\+?\d{7,15}$/).optional(),
  shirtSize: z.enum(["S", "M", "L", "XL", "XXL"]).optional(),
  teamName: z.string().trim().max(80).optional(),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const runner = await getRunner();
  if (!runner) return NextResponse.json({ error: "Sin sesión" }, { status: 401 });
  const { id } = await ctx.params;

  const parsed = editSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success || Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: "Nada que actualizar" }, { status: 422 });
  }

  const db = getDb();
  const reg = await db.select().from(schema.registrations).where(eq(schema.registrations.id, id)).get();
  if (!reg) return NextResponse.json({ error: "no encontrada" }, { status: 404 });

  const mine = reg.runnerId === runner.id || reg.email === runner.email || (reg.cedula && reg.cedula === runner.cedula);
  if (!mine) return NextResponse.json({ error: "No te pertenece" }, { status: 403 });
  if (reg.status === "anulado") return NextResponse.json({ error: "Inscripción anulada" }, { status: 409 });

  const patch: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (parsed.data.phone) patch.phone = parsed.data.phone;
  if (parsed.data.teamName !== undefined) patch.teamName = parsed.data.teamName || null;
  if (parsed.data.shirtSize) {
    if (reg.paymentStatus === "pagado") return NextResponse.json({ error: "La talla no se puede cambiar después de confirmado el pago" }, { status: 409 });
    patch.shirtSize = parsed.data.shirtSize;
  }

  await db.update(schema.registrations).set(patch as never).where(eq(schema.registrations.id, id)).run();
  return NextResponse.json({ ok: true });
}
