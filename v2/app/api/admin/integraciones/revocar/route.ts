import { NextResponse } from "next/server";
import { getAdminEmail } from "@/lib/admin/session";
import { guardAdmin } from "@/lib/admin/api";
import { revokeClient } from "@/lib/mcp-server";
import { contextoMcpCarreras } from "@/lib/mcp-carreras";
export async function POST(req: Request) {
  const denied = await guardAdmin();
  if (denied) return denied;
  if (req.headers.get("origin") !== new URL(req.url).origin) {
    return NextResponse.json({error:"Origen no permitido"},{status:403});
  }
  const email = await getAdminEmail();
  if (!email) return NextResponse.json({error:"Vuelve a iniciar sesión"},{status:401});
  await revokeClient(contextoMcpCarreras().db,email);
  return NextResponse.redirect(new URL("/admin/integraciones",req.url),303);
}
