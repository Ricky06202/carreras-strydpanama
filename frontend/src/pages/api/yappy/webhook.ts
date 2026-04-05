import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { apiFetch } from '../../../lib/api';

export const POST: APIRoute = async ({ request }) => {
  try {
    const bodyText = await request.text();
    let yappyData;
    
    try {
      yappyData = JSON.parse(bodyText);
    } catch(e) {
      return new Response("error", { status: 400 });
    }

    const { status, orderId, transactionId } = yappyData;

    if (status === 'SUCCESS' && orderId) {
      const updatePayload = {
        paymentStatus: 'Pagado',
        transactionId: transactionId
      };

      // Realizamos PUT hacia BD de Sonic JS:
      // In this specific flow, orderId represents the participant ID
      await apiFetch(`/api/content/${orderId}`, env, {
         method: 'PUT',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
            data: updatePayload
         })
      });

      console.log(`[Yappy Webhook] Pago exitoso marcado en DB para orden: ${orderId}`);
    }

    // REGLA DE ORO: Responder un literal "success" en HTTP 200 independientemente del flujo
    return new Response("success", { status: 200 });

  } catch (error: any) {
    console.error("Yappy IPN Error:", error);
    return new Response("error", { status: 500 });
  }
};
