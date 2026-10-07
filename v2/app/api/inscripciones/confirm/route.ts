import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { confirmRegistrationPayment } from "@/lib/registration/service";

export async function POST(req: Request) {
  let body: { orderId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }
  const orderId = (body.orderId ?? "").trim();
  if (!orderId) return NextResponse.json({ error: "orderId requerido" }, { status: 400 });

  const result = await confirmRegistrationPayment(getDb(), orderId);
  if (!result.ok) {
    return NextResponse.json({ error: "Orden no encontrada", status: result.status }, { status: 404 });
  }
  return NextResponse.json(result);
}
