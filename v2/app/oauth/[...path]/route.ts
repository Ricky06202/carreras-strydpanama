import { handleOAuth } from "@/lib/mcp-server";
import { contextoMcpCarreras } from "@/lib/mcp-carreras";
import { getAdminEmail } from "@/lib/admin/session";
export const dynamic = "force-dynamic";
async function route(req: Request) {
  const path = new URL(req.url).pathname.replace(/^\/oauth\//,"");
  return handleOAuth(req, contextoMcpCarreras(await getAdminEmail()), path);
}
export const GET = route;
export const POST = route;
