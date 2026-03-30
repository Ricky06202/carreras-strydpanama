import type { APIRoute } from 'astro';
import { apiFetch } from '../../../lib/api';
import { env } from 'cloudflare:workers';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { distanceId, raceId, collectionId } = body;

    if (!distanceId) {
      return new Response(JSON.stringify({ error: 'distanceId requerido' }), { status: 400 });
    }

    // Fetch the current distance record
    const current = await apiFetch(`/api/content/${distanceId}`, env, { method: 'GET' });
    const distObj = current?.data;
    if (!distObj) {
      return new Response(JSON.stringify({ error: 'Distancia no encontrada' }), { status: 404 });
    }

    const currentData = distObj.data || {};
    const payload = {
      id: distObj.id,
      collectionId: collectionId || distObj.collectionId || distObj.collection_id || 'col-distances-93815733',
      collection_id: collectionId || distObj.collectionId || distObj.collection_id || 'col-distances-93815733',
      title: distObj.title,
      status: 'published',
      data: {
        ...currentData,
        race: raceId || '', // vacío para desasociar
      }
    };

    const result = await apiFetch(`/api/content/${distanceId}`, env, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });

    return new Response(JSON.stringify({ success: true, result }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || 'Error al actualizar distancia' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
