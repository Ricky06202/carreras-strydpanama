import type { APIRoute } from 'astro';
import { getDb } from '../../../lib/db';
import { getRaceById, updateRace } from '../../../lib/db/actions';
import { env } from 'cloudflare:workers';

export const POST: APIRoute = async ({ request }) => {
  try {
    const db = getDb(env.DB as any);
    const body = await request.json();
    const { raceId } = body;
    
    const race = await getRaceById(db, raceId);
    if (!race) {
      return new Response(JSON.stringify({ message: 'Carrera no encontrada' }), { status: 404 });
    }
    
    const startTimestamp = Math.floor(Date.now() / 1000);
    
    await updateRace(db, raceId, { 
      status: 'active', 
      startTimestamp 
    });
    
    return new Response(JSON.stringify({ 
      success: true, 
      startTimestamp,
      message: 'Carrera iniciada correctamente' 
    }), { headers: { 'Content-Type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ message: e.message }), { status: 500 });
  }
};
