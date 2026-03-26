import type { APIRoute } from 'astro';
import { api, apiFetch } from '../../../lib/api';
import { env } from 'cloudflare:workers';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { raceId, bibNumber, finishTime } = body;
    
    if (!raceId || !bibNumber || finishTime === undefined) {
      return new Response(JSON.stringify({ error: 'Faltan parámetros requeridos (raceId, bibNumber, finishTime)' }), { status: 400 });
    }

    // 1. Obtener los participantes de la carrera
    const participantsRes = await api.getParticipants(env, raceId);
    if (!participantsRes || !participantsRes.data) {
      throw new Error('Error al consultar los participantes');
    }

    const allParticipants = participantsRes.data;
    
    // 2. Buscar al participante con el dorsal indicado
    // Convertimos ambos a número para evitar problemas string vs number
    const targetBib = Number(bibNumber);
    
    const participant = allParticipants.find((p: any) => {
      // Filtrar por carrera (por si acaso SonicJS devolvió de más)
      const belongsToRace = p.data?.race === raceId || p.data?.raceId === raceId;
      const hasCorrectBib = p.data?.bibNumber !== undefined && Number(p.data.bibNumber) === targetBib;
      return belongsToRace && hasCorrectBib;
    });

    if (!participant) {
      return new Response(JSON.stringify({ error: `Corredor con dorsal #${bibNumber} no encontrado en esta carrera.` }), { status: 404 });
    }

    // 3. Preparar el payload de actualización
    const currentData = participant.data || {};
    const updatedData = {
      ...currentData,
      finishTime: finishTime // Tiempo total de carrera cruzando meta
    };

    const payload = {
      id: participant.id,
      collectionId: participant.collectionId || participant.collection_id,
      collection_id: participant.collectionId || participant.collection_id,
      title: participant.title, // Obligatorio
      status: 'published',
      data: updatedData
    };

    // 4. Enviar actualización a SonicJS
    const updateRes = await apiFetch(`/api/content/${participant.id}`, env, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });

    return new Response(JSON.stringify({
      success: true,
      participant: {
        id: participant.id,
        name: participant.title,
        bibNumber: targetBib,
        finishTime: finishTime
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Error recording finish time:', error);
    return new Response(JSON.stringify({ error: error.message || 'Error al procesar la llegada' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
