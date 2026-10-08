import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { confirmRegistrationPayment } from "@/lib/registration/service";
import { ipnKey } from "@/lib/yappy";

// IPN de Yappy. Autenticado por clave derivada del secreto del comercio, empotrada
// como ?k= en la ipnUrl que registramos al crear la orden. Sin esa clave, conocer un
// orderId ya no alcanza para marcar pagos como confirmados.

function extractOrderId(body: Record<string, unknown>): string | null {
  const cands = [body.orderId, body.order_id, (body.data as Record<string, unknown>)?.orderId];
  for (const c of cands) {
    if (typeof c === "string" && c.trim()) return c.trim();
  }
  return null;
}

export async function POST(req: Request) {
  // 1) Validar la clave IPN antes de tocar nada.
  let expected: string;
  try {
    expected = await ipnKey();
  } catch {
    return NextResponse.json({ error: "Yappy no configurado" }, { status: 503 });
  }
  const got = new URL(req.url).searchParams.get("k") ?? "";
  if (!got || got !== expected) {
    return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ received: true }); // nunca reintentar un webhook basura
  }
  const orderId = extractOrderId(body);
  if (!orderId) return NextResponse.json({ received: true });

  const status = String(body.status ?? body.estado ?? "").toLowerCase();
  if (status && !/success|aprobad|pagad|approved|paid|^e$/.test(status)) {
    return NextResponse.json({ received: true, ignored: status });
  }

  const result = await confirmRegistrationPayment(getDb(), orderId, { viaIpn: true });
  return NextResponse.json({ received: true, confirmed: result.ok, status: result.status });
}
