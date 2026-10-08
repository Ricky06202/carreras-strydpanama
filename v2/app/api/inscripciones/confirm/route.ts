import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { confirmRegistrationPayment } from "@/lib/registration/service";

// Safety net del comprador tras eventSuccess de Yappy. Ya no basta conocer el
// orderId: exige el token de posesión que el servidor entregó SOLO al crear la orden.
export async function POST(req: Request) {
  let body: { orderId?: string; confirmToken?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }
  const orderId = (body.orderId ?? "").trim();
  if (!orderId) return NextResponse.json({ error: "orderId requerido" }, { status: 400 });

  const result = await confirmRegistrationPayment(getDb(), orderId, {
    token: (body.confirmToken ?? "").trim(),
  });
  if (!result.ok) {
    if (result.status === "unauthorized") {
      return NextResponse.json({ error: "No autorizado a confirmar este pago", status: "unauthorized" }, { status: 403 });
    }
    if (result.status === "verify-pending") {
      return NextResponse.json(
        { ok: false, status: "verify-pending", message: "Pago en verificación; se confirma automáticamente cuando la organizadora valide el recibo" },
        { status: 202 },
      );
    }
    return NextResponse.json({ error: "Orden no encontrada", status: result.status }, { status: 404 });
  }
  return NextResponse.json(result);
}
