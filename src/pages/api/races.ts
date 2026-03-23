import type { APIRoute } from 'astro';
import { getDb } from '../../lib/db';
import { getPublicRaces } from '../../lib/db/actions';
import { env } from 'cloudflare:workers';

export const GET: APIRoute = async ({ request }) => {
  try {
    const db = getDb(env.DB as any);
    const races = await getPublicRaces(db);
    return new Response(JSON.stringify({ races }), { 
      headers: { 'Content-Type': 'application/json' } 
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};
