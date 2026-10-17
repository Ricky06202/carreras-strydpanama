import { NextResponse } from "next/server";
import { eq, or } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { canjearCodigoRsId, esCorreoPanelDb, firmarTicketAlta, perfilRsId, rsidListo } from "@/lib/rsid";
import { startAdminSession } from "@/lib/admin/session";
import { crearRunnerDesdePerfil, perfilUtilizable } from "@/lib/registro-rsid";
import { startSession } from "@/lib/auth/session";
import { clientIp, rateLimited } from "@/lib/ratelimit";

// GET /api/auth/canjear?rsid=<codigo>[&volver=<ruta>]
//
// Cierra el SSO con el RS ID (id.rsanjur.com). El RS ID manda al corredor a
// /entrar?rsid=<codigo>; el navegador pide este endpoint, que:
//   1. canjea el codigo de UN SOLO USO contra el RS ID (con el secreto de app),
//   2. si el correo YA tiene runner -> abre sesion y va a /mi-portal
//      si NO lo tiene -> lee su PERFIL en el RS ID (nombre, apellido, cedula,
//        telefono, fecha de nacimiento) y crea la cuenta del corredor sin
//        pedirle nada. El RS ID no lo deja llegar aca con el perfil incompleto.
//      Si la cedula ya tiene cuenta con otro correo -> /entrar para vincular.
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

  // Cuenta nueva: el RS ID ya tiene sus datos, asi que se crea sin formulario.
  if (!runner) {
    const perfil = canje.cuentaId ? await perfilRsId(canje.cuentaId) : null;
    if (perfilUtilizable(perfil) && perfil) {
      const alta = await crearRunnerDesdePerfil(db, { email, perfil });
      if (alta.ok) {
        await startSession(alta.runnerId, url.protocol === "https:");
        if (await esCorreoPanelDb(email)) {
          // Correo de la mesa: entra al panel CON su sesion de admin (antes solo
          // lo mandabamos a /admin y el guard lo rebotaba al login).
          const res = redirect("/admin");
          await startAdminSession(res, url.protocol === "https:");
          return res;
        }
        return redirect(rutaInterna(url.searchParams.get("volver")));
      }
      // Cedula de otra cuenta: prueba de propiedad (cedula + fecha), sin duplicar.
      if (alta.motivo === "vincular") {
        const ticketV = await firmarTicketAlta(email, canje.cuentaId);
        if (ticketV) {
          return redirect("/entrar", { rsid_alta: "1", rsid_vincular: "1", t: ticketV, cedula: alta.cedula || "", volver: rutaInterna(url.searchParams.get("volver")) });
        }
      }
    }
    // Sin perfil utilizable (RS ID caido o perfil viejo): formulario pre-llenado.
    const ticket = await firmarTicketAlta(email, canje.cuentaId);
    if (!ticket) return redirect("/entrar", { rsid_error: "no_configurado" });
    return redirect("/entrar", {
      rsid_alta: "1",
      t: ticket,
      volver: rutaInterna(url.searchParams.get("volver")),
    });
  }

  await startSession(runner.id, url.protocol === "https:");

  // Correos de la mesa (allowlist) entran directo al panel; el resto a su portal.
  if (await esCorreoPanelDb(email)) {
    const res = redirect("/admin");
    await startAdminSession(res, url.protocol === "https:");
    return res;
  }
  return redirect(rutaInterna(url.searchParams.get("volver")));
}

// Evita que un preflight/crawler queme el codigo: solo GET.
export async function POST() {
  return NextResponse.json({ error: "Usa GET /api/auth/canjear?rsid=<codigo>" }, { status: 405 });
}
