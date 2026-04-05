import type { APIRoute } from 'astro';
import { api, apiFetch } from '../../../lib/api';
import { env } from 'cloudflare:workers';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { id, updates } = await request.json();
    if (!id) throw new Error('ID de participante no proporcionado');

    const result = await apiFetch(`/api/content/${id}`, env, { method: 'GET' });
    const participant = result.data;
    if (!participant) throw new Error('Participante no encontrado');

    const colId = participant.collectionId || participant.collection_id;

    // Actualizamos los datos
    const payload = {
        id: id,
        collectionId: colId,
        collection_id: colId,
        title: updates.title || participant.title || participant.data?.title,
        status: 'published',
        data: {
            ...participant.data,
            ...updates
        }
    };

    const updateResult = await apiFetch(`/api/content/${id}`, env, {
        method: 'PUT',
        body: JSON.stringify(payload)
    });

    return new Response(JSON.stringify({ success: true, updated: updateResult.data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || 'Error al actualizar participante' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
