import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { confirmRegistrationPayment } from "@/lib/registration/service";
import { verificarFirmaRsPay } from "@/lib/rspay";

/**
 * Callback de RS Pay (webhook de salida de pay.rsanjur.com).
 *
 * RS Pay firma el CUERPO CRUDO con el `callback_secret` del comercio
 * (HMAC-SHA256 hex) y lo manda en `X-RS-Pay-Signature`. Verificamos la firma
 * antes de tocar nada y comparamos en tiempo constante.
 *
 * `orden.concepto` = código de confirmación de la inscripción, así que
 * reutilizamos `confirmRegistrationPayment()` (idempotente): el mismo handler
 * que confirma el IPN de Yappy directo.
 *
 * 200 = procesado o ignorado (RS Pay deja de reintentar) · 401 = firma inválida
 * · 500 = error temporal (RS Pay reintenta).
 */
export async function POST(req: Request) {
  const raw = await req.text().catch(() => "");

  const firma = req.headers.get("X-RS-Pay-Signature");
  const okFirma = await verificarFirmaRsPay(raw, firma);
  if (!okFirma) {
    return NextResponse.json({ ok: false, error: "firma_invalida" }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "json_invalido" }, { status: 400 });
  }

  const orden = (payload.orden ?? {}) as Record<string, unknown>;
  const estado = String(payload.estado ?? orden.estado ?? "").toLowerCase();
  const orderId = String(orden.concepto ?? "").trim();
  const rsPayOrderId = String(orden.id ?? "").trim();

  if (estado !== "pagado") {
    return NextResponse.json({ ok: true, ignorado: estado || "desconocido" });
  }
  if (!orderId) {
    return NextResponse.json({ ok: true, ignorado: "sin_concepto" });
  }

  try {
    const result = await confirmRegistrationPayment(getDb(), orderId, { viaIpn: true });
    console.log("[rspay] pagado", orderId, rsPayOrderId, JSON.stringify(result));
    return NextResponse.json({ ok: true, estado: "pagado", confirmed: result.ok, status: result.status });
  } catch (e) {
    console.error("[rspay] error confirmando", orderId, e);
    return NextResponse.json({ ok: false, error: "confirm_error" }, { status: 500 });
  }
}
