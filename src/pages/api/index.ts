import type { APIRoute } from 'astro';
import { getDb } from '../../lib/db';
import { getRaces, getRaceById, getRegistrationCode, createParticipant, useRegistrationCode, createTransaction, getParticipantById, updateParticipant } from '../../lib/db/actions';
import { randomUUID } from 'crypto';

export const prerender = false;

export const GET: APIRoute = async ({ request, env }) => {
  const db = getDb(env);
  const url = new URL(request.url);
  
  if (url.pathname === '/api/races') {
    const races = await getRaces(db);
    return new Response(JSON.stringify({ races }), { headers: { 'Content-Type': 'application/json' } });
  }
  
  if (url.pathname.startsWith('/api/race/')) {
    const id = url.pathname.split('/').pop();
    if (id) {
      const race = await getRaceById(db, id);
      return new Response(JSON.stringify({ race }), { headers: { 'Content-Type': 'application/json' } });
    }
  }
  
  return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
};

export const POST: APIRoute = async ({ request, env }) => {
  const db = getDb(env);
  const url = new URL(request.url);
  
  if (url.pathname === '/api/validate-code') {
    try {
      const body = await request.json();
      const { code, raceId } = body;
      
      const registrationCode = await getRegistrationCode(db, code);
      
      if (!registrationCode) {
        return new Response(JSON.stringify({ valid: false, message: 'Código no encontrado' }), { status: 400 });
      }
      
      if (registrationCode.used) {
        return new Response(JSON.stringify({ valid: false, message: 'Código ya utilizado' }), { status: 400 });
      }
      
      if (raceId && registrationCode.raceId !== raceId) {
        return new Response(JSON.stringify({ valid: false, message: 'Código no válido para esta carrera' }), { status: 400 });
      }
      
      return new Response(JSON.stringify({ valid: true, codeId: registrationCode.id }), { headers: { 'Content-Type': 'application/json' } });
    } catch (e) {
      return new Response(JSON.stringify({ valid: false, message: 'Error al validar código' }), { status: 500 });
    }
  }
  
  if (url.pathname === '/api/register') {
    try {
      const body = await request.json();
      const { firstName, lastName, email, phone, birthDate, gender, size, code, raceId } = body;
      
      if (!firstName || !lastName || !email || !raceId) {
        return new Response(JSON.stringify({ message: 'Faltan datos requeridos' }), { status: 400 });
      }
      
      const race = await getRaceById(db, raceId);
      if (!race) {
        return new Response(JSON.stringify({ message: 'Carrera no encontrada' }), { status: 404 });
      }
      
      let codeId: string | undefined;
      let finalPrice = race.price;
      
      if (code) {
        const registrationCode = await getRegistrationCode(db, code);
        if (registrationCode && !registrationCode.used && (!registrationCode.raceId || registrationCode.raceId === raceId)) {
          codeId = registrationCode.id;
          finalPrice = 0;
        }
      }
      
      const participantId = randomUUID();
      
      const participant = await createParticipant(db, {
        id: participantId,
        raceId,
        firstName,
        lastName,
        email,
        phone: phone || null,
        birthDate: birthDate || null,
        gender: gender || null,
        size: size || null,
        codeId: codeId || null,
        paymentStatus: finalPrice === 0 ? 'paid' : 'pending',
        registeredAt: Math.floor(Date.now() / 1000)
      });
      
      if (codeId) {
        await useRegistrationCode(db, codeId, participantId);
      }
      
      if (finalPrice > 0) {
        const transaction = await createTransaction(db, {
          id: randomUUID(),
          participantId,
          amount: finalPrice,
          status: 'pending',
          createdAt: Math.floor(Date.now() / 1000),
          updatedAt: Math.floor(Date.now() / 1000)
        });
        
        const paymentUrl = `/pay/${transaction[0].id}`;
        
        return new Response(JSON.stringify({ 
          success: true, 
          participant: participant[0],
          paymentUrl,
          amount: finalPrice
        }), { headers: { 'Content-Type': 'application/json' } });
      }
      
      return new Response(JSON.stringify({ 
        success: true, 
        participant: participant[0],
        message: 'Inscripción gratuita completada'
      }), { headers: { 'Content-Type': 'application/json' } });
    } catch (e: any) {
      return new Response(JSON.stringify({ message: e.message || 'Error al registrar' }), { status: 500 });
    }
  }
  
  return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
};