import { NextResponse } from "next/server";
import { eq, or } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { canjearCodigoRsId, esCorreoPanel, firmarTicketAlta, rsidListo } from "@/lib/rsid";
import { startSession } from "@/lib/auth/session";
import { clientIp, rateLimited } from "@/lib/ratelimit";

// GET /api/auth/canjear?rsid=<codigo>[&volver=<ruta>]
//
// Cierra el SSO con el RS ID (id.rsanjur.com). El RS ID manda al corredor a
// /entrar?rsid=<codigo>; el navegador pide este endpoint, que:
//   1. canjea el codigo de UN SOLO USO contra el RS ID (con el secreto de app),
//   2. si el correo YA tiene runner -> abre sesion y va a /mi-portal
//      si NO lo tiene -> manda a /entrar para que complete su cuenta (cedula
//        obligatoria) y luego crea el runner con el correo ya verificado.
//
// Por que no creamos la cuenta aqui: `runners.cedula` es NOT NULL UNIQUE y el
// RS ID no la entrega. Inventarla seria un dato falso; mejor pedirla una vez.
//
// BEST-EFFORT: si el RS ID no responde o el codigo es invalido, no rompe nada:
// devuelve al login normal con un aviso. El login por correo/contraseña sigue igual.
export const dynamic = "force-dynamic";

/** Solo rutas internas relativas (evita open-redirect). */
function rutaInterna(v: string | null): string {
  if (!v) return "/mi-portal";
  if (!v.startsWith("/") || v.startsWith("//")) return "/mi-portal";
  return v;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const codigo = url.searchParams.get("rsid")?.trim() || "";

  // Redirige SIEMPRE al mismo origen real de la peticion (localhost en dev).
  const redirect = (ruta: string, params: Record<string, string> = {}) => {
    const u = new URL(ruta, url.origin);
    for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
    return NextResponse.redirect(u, 303);
  };

  if (!rsidListo()) return redirect("/entrar", { rsid_error: "no_configurado" });
  if (!codigo) return redirect("/entrar", { rsid_error: "sin_codigo" });

  const db = getDb();
  if (await rateLimited(db, `canjear:${clientIp(req)}`, 30, 15 * 60_000)) {
    return redirect("/entrar", { rsid_error: "demasiados_intentos" });
  }

  const canje = await canjearCodigoRsId(codigo, url.origin);
  if (!canje?.email) return redirect("/entrar", { rsid_error: "canje_fallido" });

  const email = canje.email.trim().toLowerCase();
  // Se busca por el correo de la cuenta Y por el correo que el corredor uso en
  // su RS ID: si ya los vinculamos una vez, el siguiente canje lo reconoce.
  const runner = await db
    .select()
    .from(schema.runners)
    .where(or(eq(schema.runners.email, email), eq(schema.runners.rsidEmail, email)))
    .get();

  // Cuenta nueva: no podemos crearla sin cedula. La mandamos al formulario con
  // un ticket firmado que prueba que el RS ID ya verifico ese correo.
  if (!runner) {
    const ticket = await firmarTicketAlta(email);
    if (!ticket) return redirect("/entrar", { rsid_error: "no_configurado" });
    return redirect("/entrar", {
      rsid_alta: "1",
      t: ticket,
      volver: rutaInterna(url.searchParams.get("volver")),
    });
  }

  await startSession(runner.id, url.protocol === "https:");

  // Correos de la mesa (allowlist) entran directo al panel; el resto a su portal.
  const destino = esCorreoPanel(email) ? "/admin" : rutaInterna(url.searchParams.get("volver"));
  return redirect(destino);
}

// Evita que un preflight/crawler queme el codigo: solo GET.
export async function POST() {
  return NextResponse.json({ error: "Usa GET /api/auth/canjear?rsid=<codigo>" }, { status: 405 });
}
