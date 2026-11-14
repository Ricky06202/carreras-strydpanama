import { handleMcp } from "@/lib/mcp-server";
import { contextoMcpCarreras } from "@/lib/mcp-carreras";
export const dynamic = "force-dynamic";
export const POST = (req: Request) => handleMcp(req, contextoMcpCarreras());
export const GET = (req: Request) => handleMcp(req, contextoMcpCarreras());
