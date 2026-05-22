import type { APIRoute } from 'astro';
import { api, apiFetch } from '../../../lib/api';
import { env } from 'cloudflare:workers';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { raceId } = body;

    if (!raceId) {
      return new Response(JSON.stringify({ error: 'Falta el parámetro raceId' }), { status: 400 });
    }

    // 1. Obtener los participantes de la carrera
    const participantsRes = await api.getParticipants(env, raceId);
    if (!participantsRes || !participantsRes.data) {
      throw new Error('Error al consultar los participantes');
    }

    const raceParticipants = participantsRes.data.filter((p: any) => {
      return p.data?.race === raceId || p.data?.raceId === raceId;
    });

    // 2. Filtrar los que tienen finishTime o checkpointTime o timerUsed establecidos
    const participantsToReset = raceParticipants.filter((p: any) => {
      const data = p.data || {};
      return (
        (data.finishTime !== undefined && data.finishTime !== null && data.finishTime !== '') ||
        (data.checkpointTime !== undefined && data.checkpointTime !== null && data.checkpointTime !== '') ||
        (data.timerUsed !== undefined && data.timerUsed !== null && data.timerUsed !== '')
      );
    });

    // 3. Ejecutar las actualizaciones concurrentemente usando PUT
    const updatePromises = participantsToReset.map((p: any) => {
      const updatedData = { ...p.data };
      
      // Limpiamos los campos de cronometraje
      delete updatedData.finishTime;
      delete updatedData.checkpointTime;
      delete updatedData.timerUsed;

      const payload = {
        id: p.id,
        collectionId: p.collectionId || p.collection_id,
        collection_id: p.collectionId || p.collection_id,
        title: p.title,
        status: 'published',
        data: updatedData
      };

      return apiFetch(`/api/content/${p.id}`, env, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
    });

    await Promise.all(updatePromises);

    return new Response(JSON.stringify({
      success: true,
      count: participantsToReset.length
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Error resetting timing data:', error);
    return new Response(JSON.stringify({ error: error.message || 'Error al limpiar tiempos de los corredores' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
