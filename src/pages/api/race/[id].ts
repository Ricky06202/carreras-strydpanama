import type { APIRoute } from 'astro';
import { getDb } from '../../../lib/db';
import { getRaceById, getDistancesByRace, getCategoriesByRace } from '../../../lib/db/actions';
import { env } from 'cloudflare:workers';

export const GET: APIRoute = async ({ request, params }) => {
  try {
    const db = getDb(env.DB as any);
    const { id } = params;
    
    if (!id) {
      return new Response(JSON.stringify({ error: 'ID requerido' }), { status: 400 });
    }
    
    const race = await getRaceById(db, id);
    
    if (!race) {
      return new Response(JSON.stringify({ error: 'Carrera no encontrada' }), { status: 404 });
    }
    
    const distances = await getDistancesByRace(db, id);
    const categories = await getCategoriesByRace(db, id);
    
    return new Response(JSON.stringify({ race, distances, categories }), { 
      headers: { 'Content-Type': 'application/json' } 
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};
