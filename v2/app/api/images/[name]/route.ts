import { env } from "cloudflare:workers";

const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
  svg: "image/svg+xml",
};

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ name: string }> },
) {
  const { name: raw } = await ctx.params;
  const name = decodeURIComponent(raw ?? "");
  if (!name || name.includes("/") || name.includes("..")) {
    return new Response("bad name", { status: 400 });
  }
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const contentType = CONTENT_TYPES[ext];
  if (!contentType) return new Response("unsupported type", { status: 400 });

  const object = await env.MEDIA.get(name);
  if (!object) return new Response("not found", { status: 404 });

  return new Response(object.body, {
    headers: {
      "content-type": contentType,
      "cache-control": "public, max-age=31536000, immutable",
      etag: object.etag ?? "",
    },
  });
}
