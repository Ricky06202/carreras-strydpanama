import type { APIRoute } from 'astro';
import { getDb } from '../../lib/db';
import { getRaceById, updateRace, createRegistrationCode, getCodesByRace, getParticipantsByRace, deleteRace, createRace, getRaceStats } from '../../lib/db/actions';
import { randomUUID } from 'crypto';

export const GET: APIRoute = async ({ request, env }) => {
  const db = getDb(env);
  const url = new URL(request.url);
  const path = url.pathname;
  
  if (path.startsWith('/api/admin/race/')) {
    const id = path.split('/').pop();
    if (id) {
      const race = await getRaceById(db, id);
      if (!race) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
      const stats = await getRaceStats(db, id);
      const participants = await getParticipantsByRace(db, id);
      const codes = await getCodesByRace(db, id);
      return new Response(JSON.stringify({ race, stats, participants, codes }), { headers: { 'Content-Type': 'application/json' } });
    }
  }
  
  return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
};

export const POST: APIRoute = async ({ request, env }) => {
  const db = getDb(env);
  const url = new URL(request.url);
  const path = url.pathname;
  
  if (path === '/api/admin/start-race') {
    try {
      const body = await request.json();
      const { raceId } = body;
      
      const race = await getRaceById(db, raceId);
      if (!race) return new Response(JSON.stringify({ message: 'Carrera no encontrada' }), { status: 404 });
      
      const startTimestamp = Math.floor(Date.now() / 1000);
      
      await updateRace(db, raceId, { 
        status: 'active', 
        startTimestamp 
      });
      
      return new Response(JSON.stringify({ 
        success: true, 
        startTimestamp,
        message: 'Carrera iniciada correctamente' 
      }), { headers: { 'Content-Type': 'application/json' } });
    } catch (e: any) {
      return new Response(JSON.stringify({ message: e.message }), { status: 500 });
    }
  }
  
  if (path === '/api/admin/race') {
    try {
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
      
      return new Response(JSON.stringify({ success: true, race: newRace[0] }), { headers: { 'Content-Type': 'application/json' } });
    } catch (e: any) {
      return new Response(JSON.stringify({ message: e.message }), { status: 500 });
    }
  }
  
  if (path === '/api/admin/generate-codes') {
    try {
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
      
      return new Response(JSON.stringify({ success: true, codes }), { headers: { 'Content-Type': 'application/json' } });
    } catch (e: any) {
      return new Response(JSON.stringify({ message: e.message }), { status: 500 });
    }
  }
  
  return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
};

export const PUT: APIRoute = async ({ request, env }) => {
  const db = getDb(env);
  const url = new URL(request.url);
  const path = url.pathname;
  
  if (path.startsWith('/api/admin/race/')) {
    try {
      const id = path.split('/').pop();
      if (!id) return new Response(JSON.stringify({ message: 'ID requerido' }), { status: 400 });
      
      const body = await request.json();
      const updated = await updateRace(db, id, body);
      
      return new Response(JSON.stringify({ success: true, race: updated[0] }), { headers: { 'Content-Type': 'application/json' } });
    } catch (e: any) {
      return new Response(JSON.stringify({ message: e.message }), { status: 500 });
    }
  }
  
  return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
};

export const DELETE: APIRoute = async ({ request, env }) => {
  const db = getDb(env);
  const url = new URL(request.url);
  const path = url.pathname;
  
  if (path.startsWith('/api/admin/race/')) {
    try {
      const id = path.split('/').pop();
      if (!id) return new Response(JSON.stringify({ message: 'ID requerido' }), { status: 400 });
      
      await deleteRace(db, id);
      
      return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
    } catch (e: any) {
      return new Response(JSON.stringify({ message: e.message }), { status: 500 });
    }
  }
  
  return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
};