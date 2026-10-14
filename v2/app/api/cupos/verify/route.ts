import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { verifyCupo } from "@/lib/cnft/issue";

// Verificador: pega el id del cupo, la direccion del cNFT, la firma o el codigo.
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") ?? "";
  if (!q.trim()) return NextResponse.json({ results: [] }, { headers: { "cache-control": "no-store" } });
  const results = await verifyCupo(getDb(), q);
  return NextResponse.json(
    { query: q.trim(), count: results.length, results },
    { headers: { "cache-control": "no-store" } },
  );
}
