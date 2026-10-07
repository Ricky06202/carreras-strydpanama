import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/lib/db";
import { getRunner } from "@/lib/auth/session";

const profileSchema = z.object({
  firstName: z.string().trim().min(2).max(60).optional(),
  lastName: z.string().trim().min(2).max(60).optional(),
  phone: z.string().trim().regex(/^\+?\d{7,15}$/).optional().or(z.literal("")),
  bio: z.string().trim().max(500).optional().or(z.literal("")),
  instagram: z.string().trim().max(60).optional().or(z.literal("")),
});

export async function PATCH(req: Request) {
  const runner = await getRunner();
  if (!runner) return NextResponse.json({ error: "Sin sesión" }, { status: 401 });

  const parsed = profileSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 422 });

  const patch: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  for (const [k, v] of Object.entries(parsed.data)) if (v !== undefined) patch[k] = v === "" ? null : v;

  await getDb().update(schema.runners).set(patch as never).where(eq(schema.runners.id, runner.id)).run();
  return NextResponse.json({ ok: true });
}
