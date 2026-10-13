/**
 * RS Pay (pay.rsanjur.com) - integracion OPCIONAL para cobrar inscripciones.
 *
 * INTERRUPTOR (todo el flujo queda detras de un solo flag, APAGADO por defecto):
 *   - Var del worker `PAGO_RS_PAY`: "1" = encendido; ausente/cualquier otra cosa = APAGADO.
 *   - Override por evento: campo booleano `pagoRsPay` en la carrera (si existe y es true).
 * Con el flag APAGADO el comportamiento es IDENTICO al de hoy (Yappy directo):
 *   /api/rs-pay/checkout responde 404 y el frontend sigue usando <btn-yappy>.
 *
 * NO se expone nunca la api_key al navegador: la orden se crea server-side.
 */

export function rsPayActivo(env: any, raceFields?: any): boolean {
  if (String(env?.PAGO_RS_PAY ?? '') === '1') return true;
  if (raceFields && raceFields.pagoRsPay === true) return true;
  return false;
}

export function rsPayBaseUrl(env: any): string {
  return String(env?.RS_PAY_URL || 'https://pay.rsanjur.com').replace(/\/+$/, '');
}

/**
 * Crea una orden en RS Pay (server-side, header X-Api-Key).
 * @returns la respuesta JSON cruda de RS Pay ({ id, token, url_pago, ... })
 */
export async function crearOrdenRsPay(
  env: any,
  opts: { concepto: string; montoCents: number; callbackUrl: string; moneda?: string }
): Promise<any> {
  const apiKey = env?.RS_PAY_API_KEY;
  if (!apiKey) throw new Error('RS_PAY_API_KEY no configurada en el worker');

  const res = await fetch(`${rsPayBaseUrl(env)}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Api-Key': String(apiKey) },
    body: JSON.stringify({
      concepto: opts.concepto,
      monto_cents: opts.montoCents,
      moneda: opts.moneda || 'USD',
      callback_url: opts.callbackUrl,
      metodos_permitidos: ['yappy'],
    }),
  });

  const data: any = await res.json().catch(() => ({}));
  if (!res.ok || !data || !data.url_pago) {
    const err: any = new Error(`RS Pay no creo la orden (HTTP ${res.status})`);
    err.detail = data;
    throw err;
  }
  return data;
}

/**
 * Verifica la firma HMAC-SHA256 (hex) del callback de RS Pay.
 * RS Pay firma el CUERPO CRUDO con comercios.callback_secret y lo manda en
 * el header X-RS-Pay-Signature. Comparacion en tiempo constante.
 */
export async function verificarFirmaRsPay(secret: string | undefined, rawBody: string, firma: string | null | undefined): Promise<boolean> {
  if (!secret || !firma) return false;
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(rawBody));
  const hex = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
  if (hex.length !== firma.length) return false;
  let diff = 0;
  for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ firma.charCodeAt(i);
  return diff === 0;
}
