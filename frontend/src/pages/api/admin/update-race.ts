import type { APIRoute } from 'astro';
import { api } from '../../../lib/api';
import { env } from 'cloudflare:workers';

export const POST: APIRoute = async ({ request }) => {
  // En producción, aquí validaríamos un token de admin o password en el body/header
  // Para esta versión simplificada, confiamos en la ruta de admin del frontend
  
  try {
    const body = await request.json();
    const { id, startTime, stopTime, status } = body;
    
    if (!id) {
      return new Response(JSON.stringify({ error: 'ID de carrera requerido' }), { status: 400 });
    }

    // Actualizamos la carrera en SonicJS
    // Guardamos los datos en el objeto 'data' de la carrera
    const updateData: any = {};
    if (startTime !== undefined) updateData.timerStart = startTime;
    if (stopTime !== undefined) updateData.timerStop = stopTime;
    if (status !== undefined) updateData.status = status;

    const result = await api.updateRace(env, id, updateData);
    
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
