import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { rsPayActivo, crearOrdenRsPay, rsPayBaseUrl } from '../../../lib/rsPay';

/**
 * Crea la orden de pago en RS Pay para una inscripcion de carreras.
 *
 * Flujo (solo con el flag PAGO_RS_PAY encendido):
 *   1. El frontend ya registro la inscripcion como PENDIENTE via /api/register
 *      (eso crea la transaccion con el payload de registro y el orderId = confirmCode).
 *   2. Este endpoint crea la orden en RS Pay usando el confirmCode como "concepto"
 *      y la devuelve url_pago para redirigir al checkout de RS Pay.
 *   3. Cuando RS Pay confirme el pago llamara al callback /api/rs-pay/webhook,
 *      que reutiliza confirmYappyOrder() para marcar la inscripcion como pagada.
 *
 * La api_key de RS Pay vive SOLO en el servidor (secret del worker).
 * Con el flag APAGADO responde 404 (comportamiento inerte).
 */
export const POST: APIRoute = async ({ request }) => {
  const json = (obj: any, status = 200) =>
    new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });

  // Doble candado: si el flag esta apagado, este endpoint no existe para el mundo.
  if (!rsPayActivo(env)) return json({ success: false, error: 'rs_pay_deshabilitado' }, 404);

  try {
    const body = await request.json() as any;
    const orderId = String(body?.orderId || '').trim();
    const total = Number(body?.total);

    if (!orderId) return json({ success: false, error: 'orderId requerido' }, 400);
    if (!Number.isFinite(total) || total <= 0) {
      return json({ success: false, error: 'total invalido' }, 400);
    }

    const origin = new URL(request.url).origin;
    const callbackUrl = origin + '/api/rs-pay/webhook';
    const montoCents = Math.round(total * 100);

    const orden = await crearOrdenRsPay(env, { concepto: orderId, montoCents, callbackUrl });

    return json({
      success: true,
      orderId,
      url_pago: orden.url_pago,
      token: orden.token,
      monto_cents: montoCents,
      rs_pay: rsPayBaseUrl(env),
    }, 200);
  } catch (e: any) {
    console.error('[RS Pay] checkout error:', (e && e.message) || e);
    return json({ success: false, error: (e && e.message) || 'Error creando la orden en RS Pay' }, 502);
  }
};
