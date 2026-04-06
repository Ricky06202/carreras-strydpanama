import type { APIRoute } from 'astro';
import { apiFetch } from '../../../lib/api';
import { env } from 'cloudflare:workers';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { categoryId, raceId, collectionId } = body;

    if (!categoryId) {
      return new Response(JSON.stringify({ error: 'categoryId requerido' }), { status: 400 });
    }

    const current = await apiFetch(`/api/content/${categoryId}`, env, { method: 'GET' });
    const catObj = current?.data;
    if (!catObj) {
      return new Response(JSON.stringify({ error: 'Categoría no encontrada' }), { status: 404 });
    }

    const currentData = catObj.data || {};
    const payload = {
      id: catObj.id,
      collectionId: collectionId || catObj.collectionId || catObj.collection_id || 'col-categories-26d3d058',
      collection_id: collectionId || catObj.collectionId || catObj.collection_id || 'col-categories-26d3d058',
      title: catObj.title,
      status: 'published',
      data: {
        ...currentData,
        race: raceId || '', // vacío para desasociar
      }
    };

    const result = await apiFetch(`/api/content/${categoryId}`, env, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });

    return new Response(JSON.stringify({ success: true, result }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || 'Error al actualizar categoría' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
