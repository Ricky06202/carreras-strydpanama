import type { APIRoute } from 'astro';
import { getDb } from '../../../../lib/db';
import { createRace } from '../../../../lib/db/actions';
import { randomUUID } from 'crypto';
import { env } from 'cloudflare:workers';

export const POST: APIRoute = async ({ request }) => {
  try {
    const db = getDb(env.DB as any);
    const body = await request.json();
    const { name, description, date, location, routeGpxUrl, price, maxParticipants } = body;
    
    if (!name || !date) {
      return new Response(JSON.stringify({ message: 'Nombre y fecha son requeridos' }), { status: 400 });
    }
    
    const newRace = await createRace(db, {
      id: randomUUID(),
      name,
      description: description || null,
      date,
      location: location || null,
      routeGpxUrl: routeGpxUrl || null,
      price: price || 0,
      maxParticipants: maxParticipants || null,
      status: 'upcoming',
      createdAt: Math.floor(Date.now() / 1000),
      updatedAt: Math.floor(Date.now() / 1000)
    });
    
    return new Response(JSON.stringify({ success: true, race: newRace[0] }), { 
      headers: { 'Content-Type': 'application/json' } 
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ message: e.message }), { status: 500 });
  }
};
