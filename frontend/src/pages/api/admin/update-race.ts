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
