import type { APIRoute } from 'astro';
import { getDb } from '../../lib/db';
import { getPublicRaces, getDistancesByRace } from '../../lib/db/actions';
import { env } from 'cloudflare:workers';

export const GET: APIRoute = async ({ request }) => {
  try {
    const db = getDb(env.DB as any);
    const races = await getPublicRaces(db);
    
    // Add distances to each race
    const racesWithDistances = await Promise.all(
      races.map(async (race) => {
        const distances = await getDistancesByRace(db, race.id);
        return { ...race, distances };
      })
    );
    
    return new Response(JSON.stringify({ races: racesWithDistances }), { 
      headers: { 'Content-Type': 'application/json' } 
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};
