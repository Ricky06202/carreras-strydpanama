import type { APIRoute } from 'astro';
import { getDb } from '../../../../lib/db';
import { createCategory } from '../../../../lib/db/actions';
import { randomUUID } from 'crypto';
import { env } from 'cloudflare:workers';

export const POST: APIRoute = async ({ request }) => {
  try {
    const db = getDb(env.DB as any);
    const body = await request.json();
    const { raceId, name, description, priceAdjustment, maxParticipants } = body;
    
    if (!raceId || !name) {
      return new Response(JSON.stringify({ message: 'Race ID y nombre son requeridos' }), { status: 400 });
    }
    
    const newCategory = await createCategory(db, {
      id: randomUUID(),
      raceId,
      name,
      description: description || null,
      priceAdjustment: priceAdjustment || 0,
      maxParticipants: maxParticipants || null,
      createdAt: Math.floor(Date.now() / 1000)
    });
    
    return new Response(JSON.stringify({ success: true, category: newCategory[0] }), { 
      headers: { 'Content-Type': 'application/json' } 
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ message: e.message }), { status: 500 });
  }
};
