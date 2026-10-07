import type { APIRoute } from 'astro';
import { apiFetch } from '../../../lib/api';
import { env } from 'cloudflare:workers';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { id, updates } = await request.json();
    if (!id || !updates) throw new Error('Faltan id o updates');

    const current = await apiFetch(`/api/content/${id}`, env, { method: 'GET' });
    const doc = current.data ?? current;
    const data = { ...(doc.data || {}), ...updates };
    if (data.amount !== undefined) data.amount = Number(data.amount);

    await apiFetch(`/api/content/${id}`, env, {
      method: 'PUT',
      body: JSON.stringify({
        collectionId: doc.collectionId || doc.collection_id,
        collection_id: doc.collectionId || doc.collection_id,
        title: data.title ?? doc.title,
        status: 'published',
        data,
      }),
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || 'Error al actualizar pago' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
