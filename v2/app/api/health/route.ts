import { NextResponse } from "next/server";

export async function GET() {
  // Sin conteos: no publicar volumen de carreras/inscripciones (enumeración comercial).
  return NextResponse.json({ ok: true });
}
