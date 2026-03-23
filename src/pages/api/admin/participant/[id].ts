import type { APIRoute } from 'astro';
import { getDb } from '../../../../lib/db';
import { updateParticipant, deleteParticipant } from '../../../../lib/db/actions';
import { env } from 'cloudflare:workers';

export const PUT: APIRoute = async ({ params, request }) => {
  try {
    const db = getDb(env.DB as any);
    const { id } = params;
    
    if (!id) {
      return new Response(JSON.stringify({ message: 'ID requerido' }), { status: 400 });
    }
    
    const body = await request.json();
    const updated = await updateParticipant(db, id, body);
    
    return new Response(JSON.stringify({ success: true, participant: updated[0] }), { 
      headers: { 'Content-Type': 'application/json' } 
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ message: e.message }), { status: 500 });
  }
};

export const DELETE: APIRoute = async ({ params }) => {
  try {
    const db = getDb(env.DB as any);
    const { id } = params;
    
    if (!id) {
      return new Response(JSON.stringify({ message: 'ID requerido' }), { status: 400 });
    }
    
    await deleteParticipant(db, id);
    
    return new Response(JSON.stringify({ success: true }), { 
      headers: { 'Content-Type': 'application/json' } 
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ message: e.message }), { status: 500 });
  }
};
