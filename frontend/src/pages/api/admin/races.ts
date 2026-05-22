import type { APIRoute } from 'astro';
import { apiFetch } from '../../../lib/api';
import { env } from 'cloudflare:workers';

export const GET: APIRoute = async () => {
  try {
    const result = await apiFetch('/api/collections/races/content?limit=100', env, { 
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
    
    const races = (result.data || [])
      .filter((item: any) => item.status === 'published')
      .map((item: any) => ({
        id: item.id,
        title: item.data?.title || item.title || 'Sin nombre',
        collectionId: item.collectionId || item.collection_id,
        data: item.data || {}
      }));

    return new Response(JSON.stringify({ success: true, races }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || 'Error al obtener carreras' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
