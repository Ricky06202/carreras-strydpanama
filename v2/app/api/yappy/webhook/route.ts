import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { confirmRegistrationPayment } from "@/lib/registration/service";

// IPN de Yappy. Body flexible: el orderId puede venir en distintos campos.
function extractOrderId(body: Record<string, unknown>): string | null {
  const cands = [body.orderId, body.order_id, (body.data as Record<string, unknown>)?.orderId];
  for (const c of cands) {
    if (typeof c === "string" && c.trim()) return c.trim();
  }
  return null;
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ received: true }); // nunca reintentar un webhook basura
  }
  const orderId = extractOrderId(body);
  if (!orderId) return NextResponse.json({ received: true });

  const status = String(body.status ?? body.estado ?? "").toLowerCase();
  if (status && !/success|aprobad|pagad|approved|paid/.test(status)) {
    return NextResponse.json({ received: true, ignored: status });
  }

  const result = await confirmRegistrationPayment(getDb(), orderId);
  return NextResponse.json({ received: true, confirmed: result.ok, status: result.status });
}
