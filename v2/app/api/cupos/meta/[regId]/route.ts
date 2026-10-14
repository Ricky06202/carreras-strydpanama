import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { findTicketByRegistration } from "@/lib/cnft/issue";

// Metadata publica del cupo (estandar Metaplex). Es la "uri" que apunta el cNFT.
// CORS abierto: wallets y exploradores la leen desde el cliente.
export async function GET(_req: Request, ctx: { params: Promise<{ regId: string }> }) {
  const { regId } = await ctx.params;
  const ticket = await findTicketByRegistration(getDb(), regId);
  if (!ticket || !ticket.metadataJson) {
    return NextResponse.json({ error: "Metadata no disponible" }, { status: 404 });
  }
  return new NextResponse(ticket.metadataJson, {
    status: 200,
    headers: {
      "content-type": "application/json",
      "cache-control": "public, max-age=300",
      "access-control-allow-origin": "*",
    },
  });
}
