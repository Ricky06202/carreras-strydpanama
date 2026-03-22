import type { APIRoute } from 'astro';
import { getDb } from '../../lib/db';
import { getRaces } from '../../lib/db/actions';
import { env } from 'cloudflare:workers';

export const GET: APIRoute = async ({ request }) => {
  try {
    const db = getDb(env.DB as any);
    const races = await getRaces(db);
    return new Response(JSON.stringify({ races }), { 
      headers: { 'Content-Type': 'application/json' } 
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};
