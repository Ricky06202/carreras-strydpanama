import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { apiFetch } from '../../../lib/api';

export const GET: APIRoute = async ({ request }) => handleRequest(request);
export const POST: APIRoute = async ({ request }) => handleRequest(request);

async function handleRequest(request: Request) {
  try {
    const url = new URL(request.url);
    const searchParams = url.searchParams;
    
    let orderId = searchParams.get('orderId');
    let status = searchParams.get('status');
    let transactionId = searchParams.get('transactionId');

    // Si es POST, intentar sacar del body si no están en URL
    if (request.method === 'POST' && (!orderId || !status)) {
        try {
            const body = await request.json() as any;
            orderId = orderId || body.orderId;
            status = status || body.status;
            transactionId = transactionId || body.transactionId;
        } catch (e) {}
    }

    console.log(`[Yappy Webhook] Recibido: orderId=${orderId}, status=${status}`);

    // "E" significa Ejecutado (Éxito) en la V2 de Yappy
    if ((status === 'E' || status === 'SUCCESS') && orderId) {
      const updatePayload = {
        paymentStatus: 'Pagado',
        transactionId: transactionId || 'YAPPY_CONFIRMED'
      };

      // Nota: orderId para nosotros es el ID del participante en SonicJS
      await apiFetch(`/api/content/${orderId}`, env, {
         method: 'PUT',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
            data: updatePayload
         })
      });

      console.log(`[Yappy Webhook] Pago exitoso (E) procesado para: ${orderId}`);
    }

    // Yappy espera un literal "success"
    return new Response("success", { status: 200 });

  } catch (error: any) {
    console.error("Yappy IPN Error:", error);
    return new Response("error", { status: 500 });
  }
}
