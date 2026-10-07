import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { YappyAPI } from '../../../lib/yappy';
import { apiFetch } from '../../../lib/api';
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

    // 3. AUDITORIA DE MONTO REAL: Yappy ya cobrara `total`, pero la transaccion
    //    se creo al registrarse con el precio vigente ENTONCES (bug 20/25 del
    //    5/10). Sobrescribir amount + totalAmount/amountPaid del payload para
    //    que la confirmacion (processRegistration) use el monto cobrado real.
    //    best-effort: nunca bloquear el pago por esto.
    try {
      const norm = String(orderId).replace(/-/g, '').trim();
      const realTotal = Number(total);
      const txRes = await apiFetch(`/api/collections/transactions/content?limit=5000&_t=${Date.now()}`, env, { method: 'GET' });
      const tx = (txRes?.data || []).find((t: any) => {
        const txOrderId = ((t.data?.orderId || '') as string).replace(/-/g, '').trim();
        const txTitle = ((t.data?.title || '') as string).replace(/-/g, '');
        return txOrderId === norm || txTitle.includes(norm);
      });
      if (tx && tx.data?.status !== 'Success_Pagado' && Number(tx.data?.amount) !== realTotal) {
        let patchedPayload = tx.data?.payload;
        try {
          const payloadObj = JSON.parse(tx.data.payload);
          payloadObj.totalAmount = realTotal;
          payloadObj.amountPaid = realTotal;
          patchedPayload = JSON.stringify(payloadObj);
        } catch {}
        const colId = tx.collectionId || 'col-transactions-e06da228';
        await apiFetch(`/api/content/${tx.id}`, env, {
          method: 'PUT',
          body: JSON.stringify({
            id: tx.id,
            collectionId: colId,
            collection_id: colId,
            title: tx.title,
            status: tx.status || 'published',
            data: { ...tx.data, amount: realTotal, payload: patchedPayload }
          })
        });
        console.log(`[Yappy Checkout] amount corregido ${tx.data?.amount} -> ${realTotal} (orderId=${norm})`);
      }
    } catch (e) {
      console.error('[Yappy Checkout] No se pudo registrar el monto real:', e);
    }

    // 4. Devolver JSON estricto esperado por Frontend WebComponent
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
