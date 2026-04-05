import type { APIRoute } from 'astro';
import { apiFetch } from '../../../lib/api';
import { env } from 'cloudflare:workers';

export const GET: APIRoute = async () => {
  try {
    // Usamos un límite alto para obtener todos los participantes
    const result = await apiFetch('/api/collections/participants/content?limit=5000', env, { 
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });

    const participants = (result.data || []).map((item: any) => ({
      id: item.id,
      collectionId: item.collectionId || item.collection_id,
      title: item.data?.title || item.title || 'Sin nombre',
      firstName: item.data?.firstName || '',
      lastName: item.data?.lastName || '',
      email: item.data?.email || '',
      phone: item.data?.phone || '',
      cedula: item.data?.cedula || '',
      race: item.data?.race || '',
      category: item.data?.category || '',
      distance: item.data?.distance || '',
      teamName: item.data?.teamName || '',
      bibNumber: item.data?.bibNumber || '',
      paymentStatus: item.data?.paymentStatus || 'Pendiente',
    }));

    return new Response(JSON.stringify({ success: true, participants }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || 'Error al obtener participantes' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
