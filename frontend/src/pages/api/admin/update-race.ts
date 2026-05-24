import type { APIRoute } from 'astro';
import { api, apiFetch } from '../../../lib/api';
import { env } from 'cloudflare:workers';

export const POST: APIRoute = async ({ request }) => {
  // En producción, aquí validaríamos un token de admin o password en el body/header
  // Para esta versión simplificada, confiamos en la ruta de admin del frontend
  
  try {
    const body = await request.json();
    const { id, timerStart, timerStop, status } = body;
    
    if (!id) {
      return new Response(JSON.stringify({ error: 'ID de carrera requerido' }), { status: 400 });
    }

    // 1. Obtenemos la carrera actual
    const raceResponse = await api.getRace(env, id);
    const raceObj = raceResponse?.data;
    
    if (!raceObj) {
      console.error('Race not found for ID:', id);
      return new Response(JSON.stringify({ error: 'Carrera no encontrada' }), { status: 404 });
    }

    // 2. Preparamos el objeto completo para SonicJS
    const currentData = raceObj.data || {};
    const updatedData = { ...currentData };
    
    if (timerStart !== undefined) updatedData.timerStart = timerStart;
    if (timerStop !== undefined) updatedData.timerStop = timerStop;
    if (status !== undefined) updatedData.status = status;

    const payload = {
      id: raceObj.id,
      collectionId: raceObj.collectionId || raceObj.collection_id,
      collection_id: raceObj.collectionId || raceObj.collection_id,
      title: raceObj.title, // El título es obligatorio
      status: 'published',
      data: updatedData
    };

    console.log('Sending update to SonicJS:', JSON.stringify(payload).substring(0, 500));
    
    // Usamos apiFetch que ya maneja el token y las cabeceras
    const result = await apiFetch(`/api/content/${id}`, env, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });

    console.log('SonicJS response:', JSON.stringify(result));

    // Si la carrera se cierra (status === 'finished'), ponemos DNF (-1) a los corredores sin tiempo
    if (status === 'finished') {
      try {
        console.log('Race status is finished. Finding unfinished participants for auto-DNF...');
        const partsRes = await apiFetch('/api/collections/participants/content?limit=2000', env, {
          method: 'GET',
          headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
        });
        const participants = partsRes?.data || [];

        const activeUnfinishedParts = participants.filter((p: any) => {
          const isCorrectRace = (p.data?.race === id || p.data?.raceId === id) && p.status === 'published';
          if (!isCorrectRace) return false;

          const isPadrino = p.data?.participantType === 'padrino' || p.data?.isPadrino === true;
          if (isPadrino) return false;

          const isConfirmed = p.data?.paymentStatus === 'Confirmado' || 
                              p.data?.paymentStatus === 'Yappy' || 
                              p.data?.paymentStatus === 'Completado' || 
                              p.data?.paymentStatus === 'Cupon Padrino' || 
                              p.data?.paymentMethod === 'Cupon Padrino';
          const hasBib = p.data?.bibNumber !== undefined && p.data?.bibNumber !== null && p.data?.bibNumber !== '';

          if (!isConfirmed && !hasBib) return false;

          const hasFinishTime = p.data?.finishTime !== undefined && p.data?.finishTime !== null && p.data?.finishTime !== '';
          return !hasFinishTime;
        });

        console.log(`Auto-DNF: Found ${activeUnfinishedParts.length} active unfinished runners to update.`);

        if (activeUnfinishedParts.length > 0) {
          const updatePromises = activeUnfinishedParts.map((p: any) => {
            const updatedPartData = {
              ...p.data,
              finishTime: -1
            };
            const participantPayload = {
              id: p.id,
              collectionId: p.collectionId || p.collection_id || 'col-participants-93d1ac21',
              collection_id: p.collectionId || p.collection_id || 'col-participants-93d1ac21',
              title: p.title || p.data?.title || `${p.data?.firstName || ''} ${p.data?.lastName || ''}`.trim() || 'Participante',
              status: 'published',
              data: updatedPartData
            };
            return apiFetch(`/api/content/${p.id}`, env, {
              method: 'PUT',
              body: JSON.stringify(participantPayload)
            }).catch(err => {
              console.error(`Error updating participant ${p.id} to DNF:`, err);
              return null;
            });
          });

          await Promise.all(updatePromises);
          console.log(`Successfully completed auto-DNF updates.`);
        }
      } catch (err) {
        console.error('Error in auto-DNF execution:', err);
      }
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Error updating race:', error);
    return new Response(JSON.stringify({ error: error.message || 'Error al actualizar la carrera' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
