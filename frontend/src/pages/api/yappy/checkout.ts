import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { YappyAPI } from '../../../lib/yappy';
import { normalizePanamaPhone } from '../../../lib/phone';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { orderId, total, telefono } = body;

    // 1. Validar celular panameño para Yappy: 8 dígitos empezando con 6
    // (acepta guiones/espacios/+507 al pegar, pero guarda solo los dígitos)
    const telefonoYappy = normalizePanamaPhone(telefono || '');
    if (!telefonoYappy || !telefonoYappy.startsWith('6')) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Ese no es un celular panameño válido para Yappy. Debe tener 8 dígitos y empezar con 6 (ej. 6123-4567).' 
      }), { status: 400 });
    }

    if (!orderId || !total) {
      return new Response(JSON.stringify({ success: false, error: 'Falta orderId o total' }), { status: 400 });
    }

    // 2. Invocar Cliente de Yappy
    const paymentData = await YappyAPI.createYappyPayment(env, orderId, Number(total), telefonoYappy);

    // Detect if nested body exists from Yappy's response
    const yappyBody = paymentData.body || paymentData;

    // 3. Devolver JSON estricto esperado por Frontend WebComponent
    return new Response(JSON.stringify({ 
      success: true, 
      body: { 
        transactionId: yappyBody.transactionId, 
        token: yappyBody.token, 
        documentName: yappyBody.documentName 
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
