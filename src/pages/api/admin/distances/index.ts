import type { APIRoute } from 'astro';
import { getDb } from '../../../../lib/db';
import { createDistance, getDistancesByRace } from '../../../../lib/db/actions';
import { randomUUID } from 'crypto';
import { env } from 'cloudflare:workers';

export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const raceId = url.searchParams.get('raceId');
    
    if (!raceId) {
      return new Response(JSON.stringify({ error: 'Race ID requerido' }), { status: 400 });
    }
    
    const db = getDb(env.DB as any);
    const distances = await getDistancesByRace(db, raceId);
    
    return new Response(JSON.stringify({ distances }), { 
      headers: { 'Content-Type': 'application/json' } 
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const db = getDb(env.DB as any);
    const body = await request.json();
    const { name, raceId } = body;
    
    if (!name || !raceId) {
      return new Response(JSON.stringify({ message: 'Nombre y Race ID son requeridos' }), { status: 400 });
    }
    
    const newDistance = await createDistance(db, {
      id: randomUUID(),
      name,
      raceId
    });
    
    return new Response(JSON.stringify({ success: true, distance: newDistance[0] }), { 
      headers: { 'Content-Type': 'application/json' } 
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ message: e.message }), { status: 500 });
  }
};
