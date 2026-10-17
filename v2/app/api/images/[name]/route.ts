import { env } from "cloudflare:workers";
import { getRunner } from "@/lib/auth/session";
import { isAdmin } from "@/lib/admin/session";

const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
  svg: "image/svg+xml",
  pdf: "application/pdf",
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

  // Los comprobantes de pago son privados: solo el corredor con sesión o un admin.
  if (name.startsWith("comprobante-")) {
    const [runner, admin] = await Promise.all([getRunner(), isAdmin()]);
    if (!runner && !admin) return new Response("forbidden", { status: 403 });
  }

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
