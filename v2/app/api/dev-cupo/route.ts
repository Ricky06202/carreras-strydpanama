import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { issueTicketForRegistration, retryTicket } from "@/lib/cnft/issue";

// Solo-dev: dispara/observa la emision del cupo sin pasar por el admin.
// Fail-closed: solo habilitado en dev real (igual que /api/dev-query).
function devOnly(): boolean {
  return (
    (import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV === true ||
    (typeof process !== "undefined" && process.env?.NODE_ENV === "development")
  );
}

export async function POST(req: Request) {
  if (!devOnly()) return NextResponse.json({ error: "solo dev" }, { status: 403 });
  const body = (await req.json().catch(() => ({}))) as { registrationId?: string; ticketId?: string };
  const db = getDb();
  if (body.ticketId) {
    const out = await retryTicket(db, body.ticketId);
    return NextResponse.json(out, { status: out.status === "minted" ? 200 : 202 });
  }
  if (!body.registrationId) return NextResponse.json({ error: "registrationId requerido" }, { status: 400 });
  const out = await issueTicketForRegistration(db, body.registrationId, { force: true });
  return NextResponse.json(out, { status: out.status === "minted" ? 200 : 202 });
}
