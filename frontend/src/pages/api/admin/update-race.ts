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

    // 1. Obtenemos la carrera actual para no perder datos al actualizar (PUT sobreescribe el objeto data)
    const currentRace = await api.getRace(env, id);
    if (!currentRace?.data) {
      return new Response(JSON.stringify({ error: 'Carrera no encontrada' }), { status: 404 });
    }

    const currentData = currentRace.data.data || {};

    // 2. Mezclamos los datos nuevos con los existentes
    const updateData: any = { ...currentData };
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
