import type { APIRoute } from 'astro';
import { apiFetch } from '../../../lib/api';
import { env } from 'cloudflare:workers';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { codeIds } = await request.json();
    
    if (!codeIds || !Array.isArray(codeIds) || codeIds.length === 0) {
      return new Response(JSON.stringify({ error: 'No se enviaron códigos a actualizar' }), { status: 400 });
    }

    let marked = 0;

    // Actualizamos secuencialmente cada uno de los IDs dados
    for (const codeId of codeIds) {
        const res = await apiFetch(`/api/content/${codeId}`, env, { method: 'GET' });
        const code = res.data;
        if (!code) continue;

        // Validar que no estuviese usado ya
        if (code.data?.status === 'redeemed') continue;

        const payload = {
            id: code.id,
            collectionId: code.collectionId || code.collection_id || 'col-registration_codes-469bc379',
            collection_id: code.collectionId || code.collection_id || 'col-registration_codes-469bc379',
            title: code.title,
            status: 'published',
            data: {
                ...code.data,
                status: 'sold'
            }
        };

        const updateStatus = await apiFetch(`/api/content/${codeId}`, env, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        
        if (updateStatus) marked++;
    }

    return new Response(JSON.stringify({ success: true, marked: marked }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || 'Error al actualizar código' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
