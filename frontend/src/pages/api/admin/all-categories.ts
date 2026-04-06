import type { APIRoute } from 'astro';
import { apiFetch } from '../../../lib/api';
import { env } from 'cloudflare:workers';

export const GET: APIRoute = async () => {
  try {
    const result = await apiFetch('/api/collections/categories/content?limit=500', env, { method: 'GET' });
    const categories = (result.data || [])
      .filter((item: any) => item.status === 'published')
      .map((item: any) => ({
        id: item.id,
        name: item.data?.title || item.title || 'Sin nombre',
        title: item.data?.title || item.title || 'Sin nombre',
        race: item.data?.race || '',
        minAge: item.data?.minAge,
        maxAge: item.data?.maxAge,
        gender: item.data?.gender,
        collectionId: item.collectionId || item.collection_id || 'col-categories-26d3d058',
      }));

    return new Response(JSON.stringify({ success: true, categories }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || 'Error al obtener categorías' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
