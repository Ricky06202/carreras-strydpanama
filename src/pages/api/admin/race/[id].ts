import type { APIRoute } from 'astro';
import { getDb } from '../../../../lib/db';
import { getRaceById, updateRace, createRegistrationCode, getCodesByRace, getParticipantsByRace, deleteRace, createRace, getRaceStats, getDistancesByRace, getCategoriesByRace } from '../../../../lib/db/actions';
import { randomUUID } from 'crypto';
import { env } from 'cloudflare:workers';

export const GET: APIRoute = async ({ params }) => {
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
    
    const stats = await getRaceStats(db, id);
    const participants = await getParticipantsByRace(db, id);
    const codes = await getCodesByRace(db, id);
    const distances = await getDistancesByRace(db, id);
    const categories = await getCategoriesByRace(db, id);
    
    return new Response(JSON.stringify({ race, stats, participants, codes, distances, categories }), { 
      headers: { 'Content-Type': 'application/json' } 
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};

export const PUT: APIRoute = async ({ params, request }) => {
  try {
    const db = getDb(env.DB as any);
    const { id } = params;
    
    if (!id) {
      return new Response(JSON.stringify({ message: 'ID requerido' }), { status: 400 });
    }
    
    const body = await request.json();
    const updated = await updateRace(db, id, body);
    
    return new Response(JSON.stringify({ success: true, race: updated[0] }), { 
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
    
    await deleteRace(db, id);
    
    return new Response(JSON.stringify({ success: true }), { 
      headers: { 'Content-Type': 'application/json' } 
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ message: e.message }), { status: 500 });
  }
};
