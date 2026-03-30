import type { APIRoute } from 'astro';
import { apiFetch } from '../../../lib/api';
import { env } from 'cloudflare:workers';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { batchId, vendor, qtyToMark } = await request.json();
    
    if (!batchId || !vendor || !qtyToMark || qtyToMark <= 0) {
      return new Response(JSON.stringify({ error: 'Parámetros inválidos' }), { status: 400 });
    }

    // 1. Fetch available 'generated' codes for this batch
    const result = await apiFetch(`/api/collections/registration_codes/content?limit=500`, env, { method: 'GET' });
    
    const availableCodes = (result.data || []).filter((c: any) => 
       c.data?.batchId === batchId && 
       c.data?.vendor === vendor && 
       (c.data?.status === 'generated' || !c.data?.status)
    );

    if (availableCodes.length < qtyToMark) {
        return new Response(JSON.stringify({ error: `Sólo hay ${availableCodes.length} códigos disponibles sin vender en este lote, pero pides marcar ${qtyToMark}.` }), { status: 400 });
    }

    // 2. Mark the first N codes as "sold"
    const codesToUpdate = availableCodes.slice(0, qtyToMark);
    
    // We update them sequentially using PUT
    for (const code of codesToUpdate) {
        const payload = {
            id: code.id,
            collectionId: code.collectionId || code.collection_id,
            collection_id: code.collectionId || code.collection_id,
            title: code.title,
            status: 'published',
            data: {
                ...code.data,
                status: 'sold'
            }
        };

        await apiFetch(`/api/content/${code.id}`, env, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
    }

    return new Response(JSON.stringify({ success: true, marked: codesToUpdate.length }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || 'Error al actualizar códigos a Vendido' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
