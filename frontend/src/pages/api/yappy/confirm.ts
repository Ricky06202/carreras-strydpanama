import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { confirmYappyOrder } from '../../../lib/yappyConfirm';

/**
 * Endpoint de safety net llamado desde el frontend cuando Yappy dispara
 * eventSuccess. Sirve de respaldo por si el webhook IPN de Yappy no llega.
 *
 * Es IDEMPOTENTE: si la transacción ya fue procesada (status = Success_Pagado),
 * no hace nada. Si está pendiente, ejecuta processRegistration y la marca como pagada.
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json() as any;
    const orderId = body.orderId || body.confirmationCode;
    const transactionId = body.transactionId || null;

    if (!orderId) {
      return new Response(JSON.stringify({ success: false, error: 'orderId requerido' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log(`[Yappy Confirm] Frontend safety net triggered for orderId=${orderId}`);

    const result = await confirmYappyOrder(env, orderId, transactionId);

    return new Response(JSON.stringify({
      success: true,
      ...result
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('[Yappy Confirm] Error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
