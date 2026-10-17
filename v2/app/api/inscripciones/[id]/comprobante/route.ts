import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { getDb, schema } from "@/lib/db";
import { getRunner } from "@/lib/auth/session";
import { cedulaKey } from "@/lib/cedula";

/**
 * Sube el comprobante de pago (transferencia/efectivo) de una inscripción.
 * Solo el dueño de la ficha puede subirlo. El archivo va a R2 y se guarda la
 * URL en `payments.receipt_url`; el admin lo revisa y confirma el pago a mano.
 */
const MAX_BYTES = 4 * 1024 * 1024;
const TIPOS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const runner = await getRunner();
  if (!runner) return NextResponse.json({ error: "Sin sesión" }, { status: 401 });

  const { id } = await ctx.params;
  const db = getDb();
  const reg = await db.select().from(schema.registrations).where(eq(schema.registrations.id, id)).get();
  if (!reg) return NextResponse.json({ error: "Inscripción no encontrada" }, { status: 404 });

  const mine =
    reg.runnerId === runner.id ||
    (!!reg.cedula && !!runner.cedula && cedulaKey(reg.cedula) === cedulaKey(runner.cedula));
  if (!mine) return NextResponse.json({ error: "No te pertenece" }, { status: 403 });
  if (reg.status === "anulado") return NextResponse.json({ error: "La inscripción está anulada" }, { status: 409 });
  if (reg.paymentStatus === "pagado") {
    return NextResponse.json({ error: "Esta inscripción ya está pagada" }, { status: 409 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Adjunta una imagen o PDF del comprobante" }, { status: 422 });
  }
  const ext = TIPOS[file.type];
  if (!ext) return NextResponse.json({ error: "Formato no válido: JPG, PNG, WEBP o PDF" }, { status: 422 });
  if (file.size === 0) return NextResponse.json({ error: "El archivo está vacío" }, { status: 422 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "El archivo pasa de 4 MB" }, { status: 413 });

  const name = `comprobante-${id.slice(0, 8)}-${Date.now().toString(36)}.${ext}`;
  await env.MEDIA.put(name, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type },
  });
  const receiptUrl = `/api/images/${name}`;

  // Un solo pago por ficha para el flujo manual: si ya existe (yappy, rspay o
  // manual) se actualiza el comprobante, no se duplica.
  const previo = await db
    .select({ id: schema.payments.id, status: schema.payments.status })
    .from(schema.payments)
    .where(eq(schema.payments.registrationId, id))
    .orderBy(desc(schema.payments.createdAt))
    .get();

  if (previo) {
    await db
      .update(schema.payments)
      .set({ receiptUrl, provider: "manual", updatedAt: new Date().toISOString() })
      .where(eq(schema.payments.id, previo.id))
      .run();
  } else {
    const dist = reg.distanceId
      ? await db.select({ price: schema.raceDistances.price }).from(schema.raceDistances).where(eq(schema.raceDistances.id, reg.distanceId)).get()
      : null;
    await db
      .insert(schema.payments)
      .values({
        id: crypto.randomUUID(),
        registrationId: id,
        amount: Number(dist?.price ?? 0),
        currency: "USD",
        status: "pending",
        provider: "manual",
        orderId: reg.confirmationCode,
        receiptUrl,
      })
      .run();
  }

  return NextResponse.json({ ok: true, receiptUrl, estado: "en revisión" });
}
