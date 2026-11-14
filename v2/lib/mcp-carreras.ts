import { env } from "cloudflare:workers";
import { isAllowedAdmin } from "./admin/google";
import type { McpContext, McpTool } from "./mcp-server";
const tools: McpTool[] = [
  {
    name: "resumen_carreras",
    description: "Consulta el número de carreras e inscripciones por estado sin datos personales.",
    inputSchema: {type:"object",properties:{},additionalProperties:false},
    async run(db) {
      const races = await db.prepare("SELECT COUNT(*) AS n FROM races").first();
      const regs = await db.prepare("SELECT status, COUNT(*) AS n FROM registrations GROUP BY status").all();
      return { carreras:races?.n ?? 0, inscripciones_por_estado:regs.results ?? [] };
    }
  },
  {
    name: "listar_carreras",
    description: "Consulta hasta 20 carreras con título, fecha, lugar y estado. Solo lectura.",
    inputSchema: {type:"object",properties:{},additionalProperties:false},
    async run(db) {
      const rows = await db.prepare("SELECT id, slug, title, date, location, status FROM races ORDER BY date DESC LIMIT 20").all();
      return { carreras:rows.results ?? [] };
    }
  }
];
export function contextoMcpCarreras(accountId: string | null = null): McpContext {
  return {
    db:env.DB, appName:"Carreras STRYD Panamá V2", scope:"carreras:read",
    accountId, tools, checkAccount:isAllowedAdmin
  };
}
