import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { verificarFirmaRsPay } from '../../../lib/rsPay';
import { confirmYappyOrder } from '../../../lib/yappyConfirm';

/**
 * Callback de RS Pay (webhook de salida de pay.rsanjur.com).
 *
 * RS Pay firma el cuerpo con comercios.callback_secret (HMAC-SHA256 hex) y lo
 * envia en el header X-RS-Pay-Signature. Verificamos la firma ANTES de tocar nada.
 *
 * Cuando el estado es "pagado" reutilizamos confirmYappyOrder(orderId=<concepto>),
 * el MISMO handler (idempotente) que confirma los pagos de Yappy directo: busca la
 * transaccion pendiente por orderId, ejecuta processRegistration/upgradePreinscrito
 * con isWebhookConfirmed=true y la marca Success_Pagado -> la inscripcion queda PAGADA.
 *
 * Respuestas: 200 = procesado/ignorado (RS Pay deja de reintentar); 401 = firma
 * invalida; 500 = error temporal (RS Pay reintenta hasta 6 veces).
 */
export const POST: APIRoute = async ({ request }) => {
  const json = (obj: any, status = 200) =>
    new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });

  let raw = '';
  try { raw = await request.text(); } catch { raw = ''; }

  const firma = request.headers.get('X-RS-Pay-Signature');
  const okFirma = await verificarFirmaRsPay(env?.RS_PAY_CALLBACK_SECRET, raw, firma);
  if (!okFirma) {
    console.warn('[RS Pay] callback con firma invalida (rechazado)');
    return json({ ok: false, error: 'firma_invalida' }, 401);
  }

  let payload: any = {};
  try { payload = JSON.parse(raw); } catch {
    return json({ ok: false, error: 'json_invalido' }, 400);
  }

  const orden = payload?.orden || {};
  const estado = String(payload?.estado || orden?.estado || '').toLowerCase();
  const orderId = String(orden?.concepto || '').trim();      // = confirmationCode de carreras
  const rsPayOrderId = String(orden?.id || '').trim();

  if (estado !== 'pagado') {
    // pendiente / expirado / cancelado -> no se toca la inscripcion
    return json({ ok: true, ignorado: estado || 'desconocido' }, 200);
  }
  if (!orderId) return json({ ok: true, ignorado: 'sin_concepto' }, 200);

  try {
    const result = await confirmYappyOrder(env, orderId, rsPayOrderId || null);
    console.log('[RS Pay] callback pagado ->', orderId, JSON.stringify(result));
    return json({ ok: true, estado: 'pagado', resultado: result }, 200);
  } catch (e: any) {
    console.error('[RS Pay] callback confirm error:', (e && e.message) || e);
    // 500 -> RS Pay reintenta el callback
    return json({ ok: false, error: 'confirm_error' }, 500);
  }
};
