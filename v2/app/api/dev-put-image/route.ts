import { NextResponse } from "next/server";
import { env } from "cloudflare:workers";

// Solo-dev: sube un objeto al R2 simulado (usado por scripts/sync-races.ts).
export async function POST(req: Request) {
  if (
    (import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV !== true &&
    !(typeof process !== "undefined" && process.env?.NODE_ENV === "development")
  ) return NextResponse.json({ error: "solo dev" }, { status: 403 });
  const key = new URL(req.url).searchParams.get("key");
  if (!key || key.includes("..") || key.startsWith("/")) return NextResponse.json({ error: "key inválida" }, { status: 400 });
  const buf = await req.arrayBuffer();
  if (buf.byteLength === 0 || buf.byteLength > 10 * 1024 * 1024) return NextResponse.json({ error: "tamano invalido" }, { status: 400 });
  await env.MEDIA.put(key, buf, { httpMetadata: { contentType: req.headers.get("content-type") ?? "image/jpeg" } });
  return NextResponse.json({ ok: true, key, bytes: buf.byteLength });
}
