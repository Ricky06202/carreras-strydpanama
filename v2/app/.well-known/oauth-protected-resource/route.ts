import { contextoMcpCarreras } from "@/lib/mcp-carreras";
import { oauthMetadata } from "@/lib/mcp-server";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  return oauthMetadata(request, contextoMcpCarreras(), "resource");
}
