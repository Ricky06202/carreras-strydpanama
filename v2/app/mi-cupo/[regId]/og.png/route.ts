import { getDb } from "@/lib/db";
import { getPublicCupo } from "@/lib/cnft/issue";
import { OG_HEIGHT, OG_WIDTH, renderCupoOg } from "@/lib/cupo/og";
import { SITE_URL } from "@/lib/seo";

// Tarjeta OG dinamica por cupo: GET /mi-cupo/<regId>/og.png (1200x630, PNG).
// Se genera con los datos REALES del cupo y se cachea (Cache API + Cache-Control)
// para no rasterizar en cada request.
export const dynamic = "force-dynamic";

const MAX_AGE = 600; // navegador
const S_MAXAGE = 86400; // borde/CDN

export async function GET(req: Request, ctx: { params: Promise<{ regId: string }> }) {
  const { regId } = await ctx.params;

  const url = new URL(req.url);
  // Clave canonica de cache (ignora querystring de cache-busting).
  const cacheKey = new Request(`${url.origin}${url.pathname}`, { method: "GET" });
  const cache = (globalThis as { caches?: { default?: Cache } }).caches?.default ?? null;
  if (cache) {
    const hit = await cache.match(cacheKey);
    if (hit) return hit;
  }

  const cupo = await getPublicCupo(getDb(), regId);
  if (!cupo.found) return new Response("Cupo no encontrado", { status: 404 });

  const site = SITE_URL.replace(/\/+$/, "");
  const verifyUrl = `${site}/verificar/${cupo.registrationId}`;
  const siteHost = (() => {
    try {
      return new URL(site).host;
    } catch {
      return "carreras.strydpanama.com";
    }
  })();

  const image = renderCupoOg({ ...cupo, verifyUrl, siteHost });
  const headers = new Headers(image.headers);
  headers.set("content-type", "image/png");
  headers.set("cache-control", `public, max-age=${MAX_AGE}, s-maxage=${S_MAXAGE}`);
  headers.set("x-og-size", `${OG_WIDTH}x${OG_HEIGHT}`);

  const response = new Response(image.body, { status: 200, headers });
  if (cache && response.body) {
    try {
      await cache.put(cacheKey, response.clone());
    } catch {
      /* la cache es best-effort: nunca rompe la imagen */
    }
  }
  return response;
}
