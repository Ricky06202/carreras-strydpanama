import { oauthMetadata } from "@/lib/mcp-server";
import { contextoMcpCarreras } from "@/lib/mcp-carreras";
export const dynamic = "force-dynamic";
export const GET = (req: Request) => oauthMetadata(req, contextoMcpCarreras(), "resource");
