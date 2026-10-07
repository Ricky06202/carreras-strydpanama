import { NextResponse } from "next/server";
import { env } from "cloudflare:workers";

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "solo dev" }, { status: 403 });
  }
  const { key, base64 } = (await req.json()) as { key?: string; base64?: string };
  if (!key || !base64 || key.includes("/") || !/^[A-Za-z0-9._-]+$/.test(key)) {
    return NextResponse.json({ error: "key/base64 invalidos" }, { status: 400 });
  }
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  await env.MEDIA.put(key, bytes, { httpMetadata: { contentType: "image/jpeg" } });
  return NextResponse.json({ ok: true, key, size: bytes.length });
}
