import type { APIRoute } from 'astro';
import { api, apiFetch } from '../../../lib/api';
import { env } from 'cloudflare:workers';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { raceId, bibNumber, timerStart } = body;

    if (!raceId || !bibNumber || timerStart === undefined) {
      return new Response(JSON.stringify({ error: 'Faltan parámetros requeridos (raceId, bibNumber, timerStart)' }), { status: 400 });
    }

    const participantsRes = await api.getParticipants(env, raceId);
    if (!participantsRes?.data) throw new Error('Error al consultar los participantes');

    const targetBib = Number(bibNumber);
    const participant = participantsRes.data.find((p: any) => {
      const belongsToRace = p.data?.race === raceId || p.data?.raceId === raceId;
      const hasCorrectBib = p.data?.bibNumber !== undefined && Number(p.data.bibNumber) === targetBib;
      return belongsToRace && hasCorrectBib;
    });

    if (!participant) {
      return new Response(JSON.stringify({ error: `Corredor con dorsal #${bibNumber} no encontrado en esta carrera.` }), { status: 404 });
    }

    const checkpointTime = Math.floor(Date.now() / 1000) - timerStart;

    await apiFetch(`/api/content/${participant.id}`, env, {
      method: 'PUT',
      body: JSON.stringify({
        id: participant.id,
        collectionId: participant.collectionId || participant.collection_id,
        collection_id: participant.collectionId || participant.collection_id,
        title: participant.title,
        status: 'published',
        data: { ...participant.data, checkpointTime },
      }),
    });

    return new Response(JSON.stringify({
      success: true,
      participant: {
        id: participant.id,
        name: participant.title,
        bibNumber: targetBib,
        checkpointTime,
      },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || 'Error al registrar retorno' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
