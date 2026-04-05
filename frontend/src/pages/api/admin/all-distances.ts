import type { APIRoute } from 'astro';
import { apiFetch } from '../../../lib/api';
import { env } from 'cloudflare:workers';

export const GET: APIRoute = async () => {
  try {
    const result = await apiFetch('/api/collections/distances/content?limit=200', env, { method: 'GET' });
    const distances = (result.data || [])
      .filter((item: any) => item.status === 'published')
      .map((item: any) => ({
        id: item.id,
        name: item.data?.title || item.title || 'Sin nombre',
        race: item.data?.race || '',
        kilometers: item.data?.kilometers || '',
      }));

    return new Response(JSON.stringify({ success: true, distances }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || 'Error al obtener distancias' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
