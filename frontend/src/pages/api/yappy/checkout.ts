import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { YappyAPI } from '../../../lib/yappy';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { orderId, total, telefono } = body;

    // 1. Sanitizar el número de Yappy (sólo números, máximo/mínimo 8 dígitos en Panamá)
    const telefonoSanitizado = (telefono || '').replace(/\D/g, '');
    const telefonoYappy = telefonoSanitizado.slice(-8);

    if (telefonoYappy.length !== 8) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'El teléfono de Yappy debe tener exactamente 8 dígitos numéricos válidos en Panamá.' 
      }), { status: 400 });
    }

    if (!orderId || !total) {
      return new Response(JSON.stringify({ success: false, error: 'Falta orderId o total' }), { status: 400 });
    }

    // 2. Invocar Cliente de Yappy
    const paymentData = await YappyAPI.createYappyPayment(env, orderId, Number(total), telefonoYappy);

    // 3. Devolver JSON estricto esperado por Frontend WebComponent
    return new Response(JSON.stringify({ 
      success: true, 
      body: { 
        transactionId: paymentData.transactionId, 
        token: paymentData.token, 
        documentName: paymentData.documentName 
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error("Yappy Checkout Endpoint Error:", error.message);
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500 });
  }
};
