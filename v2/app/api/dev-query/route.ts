import { NextResponse } from "next/server";
import { env } from "cloudflare:workers";

// Solo-dev: inspeccion rapida del D1 simulado. No usar en prod.
export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "solo dev" }, { status: 403 });
  }
  const { sql } = (await req.json()) as { sql?: string };
  if (!sql) return NextResponse.json({ error: "sql requerido" }, { status: 400 });
  const res = await env.DB.prepare(sql).all();
  return NextResponse.json({ results: res.results });
}
