// RS ID - cliente del worker de identidad (id.rsanjur.com) desde carreras v2.
//
// Regla de oro: BEST-EFFORT. Si RS ID no responde, la inscripcion y el correo
// salen igual; solo se pierde el cupo en el RS ID.
//
// OJO cookies: carreras vive en strydpanama.com y el RS ID firma su cookie para
// .rsanjur.com. NO son el mismo dominio registrable, asi que el navegador nunca
// manda esa cookie aca: el login se hace por el flujo 'volver' + /api/auth/canjear
// (codigo de un solo uso), igual que en ricardosanjur.com.
import { env } from "cloudflare:workers";

const ID_ORIGEN_DEFECTO = "https://id.rsanjur.com";

export const rsidBase = (): string => {
  const v = (env as any)?.ID_ORIGEN;
  return String(v || ID_ORIGEN_DEFECTO).trim().replace(/\/+$/, "");
};

export const rsidListo = (): boolean => !!((env as any)?.RS_ID_MOD_SECRET);

/** Correos autorizados al panel de la mesa (allowlist). */
export const correosPanel = (): string[] =>
  String((env as any)?.RS_ID_PANEL_EMAILS || "eysbel@gmail.com,ricardosanjurg@gmail.com")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

export const esCorreoPanel = (email: string | null | undefined): boolean =>
  correosPanel().includes(String(email || "").trim().toLowerCase());

/** URL a la que mandamos al corredor para que entre con su RS ID y vuelva. */
export const urlEntrarRsId = (volver: string): string =>
  rsidBase() + "/id?volver=" + encodeURIComponent(volver);

async function pedir(ruta: string, opciones: { method?: string; body?: any } = {}) {
  const res = await fetch(rsidBase() + ruta, {
    method: opciones.method || "GET",
    headers: {
      "x-rsid-app-secret": String((env as any)?.RS_ID_MOD_SECRET || ""),
      ...(opciones.body ? { "content-type": "application/json" } : {}),
    },
    ...(opciones.body ? { body: JSON.stringify(opciones.body) } : {}),
  });
  const data = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, data: data as any };
}

/** Canjea el codigo de un solo uso que devuelve el RS ID en ?rsid=... .
 *  Devuelve { email, cuenta_id } o null. */
export async function canjearCodigoRsId(codigo: string, origen: string) {
  if (!rsidListo() || !codigo) return null;
  const r = await pedir("/api/auth/canjear", { method: "POST", body: { codigo, origen } });
  if (!r.ok || !r.data?.email) {
    console.error("[rsid] canje fallo:", r.status, JSON.stringify(r.data || {}));
    return null;
  }
  return { email: String(r.data.email), cuentaId: String(r.data.cuenta_id || "") };
}

/** Registra (idempotente) el cupo del corredor en su RS ID y devuelve el LINK. */
export async function registrarCupoRsId(o: {
  email: string;
  nombre?: string;
  titulo: string;
  evento?: string;
  idExterno: string;
  titular?: string;
  distancia?: string;
  dorsal?: string | number | null;
}): Promise<string | null> {
  if (!rsidListo() || !o?.email || !o?.idExterno) return null;
  try {
    const r = await pedir("/api/mod/cosa", {
      method: "POST",
      body: {
        email: o.email,
        nombre: o.nombre || o.titular || "",
        tipo: "cupo",
        titulo: o.titulo,
        origen: "carreras",
        id_externo: String(o.idExterno),
        evento: o.evento || "",
        meta: {
          titular: o.titular || o.nombre || "",
          distancia: o.distancia || "",
          dorsal: o.dorsal == null ? "" : String(o.dorsal),
        },
      },
    });
    if (!r.ok || !r.data?.link) {
      console.error("[rsid] no se registro el cupo:", r.status, JSON.stringify(r.data || {}));
      return null;
    }
    return String(r.data.link);
  } catch (e) {
    console.error("[rsid] error registrando cupo:", e);
    return null;
  }
}

/** Cupos de un evento (panel de la mesa). Filtra por nombre/dorsal si se pasa q. */
export async function buscarCuposRsId(o: { evento?: string; q?: string } = {}) {
  if (!rsidListo()) return null;
  const qs = new URLSearchParams();
  if (o.evento) qs.set("evento", o.evento);
  if (o.q) qs.set("q", o.q);
  const r = await pedir("/api/mod/cupos?" + qs.toString());
  return r.ok ? (r.data?.cupos || []) : null;
}

/** Valida el QR dinamico escaneado (NO lo marca usado). */
export async function verificarCupoRsId(token: string) {
  if (!rsidListo() || !token) return null;
  const r = await pedir("/api/mod/cupo/verificar", { method: "POST", body: { token } });
  return r.ok ? r.data?.cupo : null;
}

/** Marca el cupo ENTREGADO (un solo uso). Devuelve { entregado, ya_estaba }. */
export async function entregarCupoRsId(cosaId: string) {
  if (!rsidListo() || !cosaId) return null;
  const r = await pedir("/api/mod/cupo/entregar", { method: "POST", body: { cosa_id: cosaId } });
  return r.ok ? r.data : null;
}

// ---------------------------------------------------------------------------
// Ticket de alta/vinculacion
// ---------------------------------------------------------------------------
// El canje del RS ID prueba el correo, pero el navegador puede mentir sobre el
// resto. Cuando el correo del RS ID no corresponde a ninguna cuenta, el canje
// devuelve al alta con un ticket firmado (HMAC con el secreto de la app) que
// dice "este correo lo verifico el RS ID a tal hora". El alta y la vinculacion
// confian en el ticket, nunca en un parametro suelto.

const TICKET_TTL_MS = 20 * 60_000;

const b64url = (bytes: Uint8Array): string =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const deB64url = (s: string): Uint8Array =>
  Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

/** ArrayBuffer "propio" (no SharedArrayBuffer) para las APIs de WebCrypto. */
const buf = (b: Uint8Array): ArrayBuffer => b.slice().buffer as ArrayBuffer;

async function hmacKey(): Promise<CryptoKey | null> {
  const secret = String((env as any)?.RS_ID_MOD_SECRET || "");
  if (!secret) return null;
  return crypto.subtle.importKey("raw", buf(new TextEncoder().encode(secret)), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
}

/** Firma un ticket con el correo ya verificado por el RS ID. */
export async function firmarTicketAlta(email: string): Promise<string | null> {
  const key = await hmacKey();
  if (!key) return null;
  const exp = Date.now() + TICKET_TTL_MS;
  const payload = `${email.trim().toLowerCase()}|${exp}`;
  const firma = new Uint8Array(await crypto.subtle.sign("HMAC", key, buf(new TextEncoder().encode(payload))));
  return `${b64url(new TextEncoder().encode(payload))}.${b64url(firma)}`;
}

/** Devuelve el correo del ticket si la firma es valida y no expiro. */
export async function leerTicketAlta(ticket: string | null | undefined): Promise<string | null> {
  const key = await hmacKey();
  const raw = String(ticket || "").trim();
  if (!key || !raw.includes(".")) return null;
  const [p, f] = raw.split(".");
  try {
    const esperada = new Uint8Array(await crypto.subtle.sign("HMAC", key, buf(deB64url(p))));
    const recibida = deB64url(f);
    if (esperada.length !== recibida.length) return null;
    let diff = 0;
    for (let i = 0; i < esperada.length; i++) diff |= esperada[i] ^ recibida[i];
    if (diff !== 0) return null;
    const [email, exp] = new TextDecoder().decode(deB64url(p)).split("|");
    if (!email || Number(exp) < Date.now()) return null;
    return email;
  } catch {
    return null;
  }
}
