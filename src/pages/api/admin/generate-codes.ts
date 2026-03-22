import type { APIRoute } from 'astro';
import { getDb } from '../../../lib/db';
import { createRegistrationCode } from '../../../lib/db/actions';
import { randomUUID } from 'crypto';
import { env } from 'cloudflare:workers';

export const POST: APIRoute = async ({ request }) => {
  try {
    const db = getDb(env.DB as any);
    const body = await request.json();
    const { raceId, count } = body;
    
    const codes: string[] = [];
    for (let i = 0; i < (count || 10); i++) {
      const code = randomUUID().split('-')[0].toUpperCase();
      await createRegistrationCode(db, {
        id: randomUUID(),
        code,
        raceId,
        used: false,
        createdAt: Math.floor(Date.now() / 1000)
      });
      codes.push(code);
    }
    
    return new Response(JSON.stringify({ success: true, codes }), { 
      headers: { 'Content-Type': 'application/json' } 
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ message: e.message }), { status: 500 });
  }
};
