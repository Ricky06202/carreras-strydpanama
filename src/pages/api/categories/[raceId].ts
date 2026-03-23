import type { APIRoute } from 'astro';
import { getDb } from '../../../lib/db';
import { getCategoriesByRace } from '../../../lib/db/actions';
import { env } from 'cloudflare:workers';

export const GET: APIRoute = async ({ params }) => {
  try {
    const db = getDb(env.DB as any);
    const { raceId } = params;
    
    if (!raceId) {
      return new Response(JSON.stringify({ error: 'Race ID requerido' }), { status: 400 });
    }
    
    const categories = await getCategoriesByRace(db, raceId);
    
    return new Response(JSON.stringify({ categories }), { 
      headers: { 'Content-Type': 'application/json' } 
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};
