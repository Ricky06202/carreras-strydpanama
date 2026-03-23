import type { APIRoute } from 'astro';
import { getDb } from '../../lib/db';
import { getRaceById, getRegistrationCode, getCategoryById, createParticipant, useRegistrationCode, createTransaction } from '../../lib/db/actions';
import { randomUUID } from 'crypto';
import { env } from 'cloudflare:workers';

export const POST: APIRoute = async ({ request }) => {
  try {
    const db = getDb(env.DB as any);
    const body = await request.json();
    const { firstName, lastName, email, phone, birthDate, gender, categoryId, team, size, paymentMethod, code, raceId } = body;
    
    if (!firstName || !lastName || !email || !raceId || !categoryId) {
      return new Response(JSON.stringify({ message: 'Faltan datos requeridos' }), { status: 400 });
    }
    
    const race = await getRaceById(db, raceId);
    if (!race) {
      return new Response(JSON.stringify({ message: 'Carrera no encontrada' }), { status: 404 });
    }

    if (race.status !== 'accepting') {
      return new Response(JSON.stringify({ message: 'Las inscripciones no están abiertas para esta carrera' }), { status: 400 });
    }

    const category = await getCategoryById(db, categoryId);
    if (!category) {
      return new Response(JSON.stringify({ message: 'Categoría no encontrada' }), { status: 404 });
    }
    
    let codeId: string | undefined;
    let finalPrice = race.price + (category.priceAdjustment || 0);
    
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
      categoryId,
      team: team || null,
      size: size || null,
      codeId: codeId || null,
      paymentMethod: paymentMethod || null,
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
};
