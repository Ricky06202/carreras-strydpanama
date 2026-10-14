import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { guardAdmin } from "@/lib/admin/api";
import { listTicketsForRace, retryTicket } from "@/lib/cnft/issue";
import { cnftConfig } from "@/lib/cnft/config";

// Lista de cupos emitidos de una carrera (estado + asset + wallet).
export async function GET(req: Request) {
  const denied = await guardAdmin();
  if (denied) return denied;
  const race = new URL(req.url).searchParams.get("race");
  if (!race) return NextResponse.json({ error: "Falta la carrera" }, { status: 400 });
  const tickets = await listTicketsForRace(getDb(), race);
  const cfg = cnftConfig();
  return NextResponse.json(
    {
      tickets,
      config: {
        enabled: cfg.enabled,
        mode: cfg.mode,
        network: cfg.network,
        reasons: cfg.reasons,
      },
    },
    { headers: { "cache-control": "no-store" } },
  );
}

// Reintento idempotente de la emision de un cupo que fallo.
export async function POST(req: Request) {
  const denied = await guardAdmin();
  if (denied) return denied;
  const body = (await req.json().catch(() => ({}))) as { ticketId?: string };
  const ticketId = (body.ticketId ?? "").trim();
  if (!ticketId) return NextResponse.json({ error: "Falta ticketId" }, { status: 400 });
  const result = await retryTicket(getDb(), ticketId);
  return NextResponse.json(result, { status: result.status === "minted" ? 200 : 202 });
}
