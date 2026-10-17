import { env } from "cloudflare:workers";

/**
 * RS Pay (pay.rsanjur.com) — cobro de inscripciones.
 *
 * La orden se crea SIEMPRE server-side con la api_key del comercio (`stryd-carreras`);
 * la llave nunca llega al navegador. El frontend abre el checkout embebido con el
 * helper oficial `rs-pay.js` (`window.RSPay.open(url_pago, {...})`).
 *
 * INTERRUPTOR: si `PAGO_RS_PAY` no es "1" o faltan las llaves, se cae al Yappy
 * directo de siempre (`lib/yappy.ts`). Ningún camino queda a medias.
 */

/** Lectura tolerante de bindings: los tipos de Env los genera el deploy. */
const envVar = (name: string): string | undefined => {
  const v = (env as unknown as Record<string, unknown>)[name];
  return typeof v === "string" && v.trim() ? v : undefined;
};

export function rsPayConfigurado(): boolean {
  return Boolean(envVar("RS_PAY_API_KEY") && envVar("RS_PAY_CALLBACK_SECRET"));
}

/** true = cobrar por RS Pay (flag encendido y llaves puestas). */
export function rsPayActivo(): boolean {
  return envVar("PAGO_RS_PAY") === "1" && rsPayConfigurado();
}

export function rsPayBaseUrl(): string {
  return (envVar("RS_PAY_URL") || "https://pay.rsanjur.com").replace(/\/+$/, "");
}

export interface OrdenRsPay {
  id: string;
  token: string;
  url_pago: string;
  estado: string;
  expira_en?: string;
}

/**
 * Crea una orden en RS Pay. `concepto` lleva el código de confirmación de la
 * inscripción: es lo que el webhook usa para reconciliar (igual que en v1).
 */
export async function crearOrdenRsPay(opts: {
  concepto: string;
  monto: number;
  callbackUrl: string;
}): Promise<OrdenRsPay> {
  const apiKey = envVar("RS_PAY_API_KEY");
  if (!apiKey) throw new Error("RS_PAY_API_KEY no configurada");

  const res = await fetch(`${rsPayBaseUrl()}/api/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Api-Key": String(apiKey) },
    body: JSON.stringify({
      concepto: opts.concepto,
      monto_cents: Math.round(opts.monto * 100),
      moneda: "USD",
      callback_url: opts.callbackUrl,
      metodos_permitidos: ["yappy"],
    }),
  });

  const data = (await res.json().catch(() => ({}))) as Partial<OrdenRsPay> & { error?: string };
  if (!res.ok || !data.url_pago || !data.token) {
    throw new Error(`RS Pay no creó la orden (HTTP ${res.status}): ${data.error ?? "respuesta inválida"}`);
  }
  return data as OrdenRsPay;
}

/** HMAC-SHA256 hex del cuerpo CRUDO con el callback_secret del comercio. */
export async function verificarFirmaRsPay(
  rawBody: string,
  firma: string | null | undefined,
): Promise<boolean> {
  const secret = envVar("RS_PAY_CALLBACK_SECRET");
  if (!secret || !firma) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(String(secret)),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const hex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  if (hex.length !== firma.length) return false;
  let diff = 0;
  for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ firma.charCodeAt(i);
  return diff === 0;
}
