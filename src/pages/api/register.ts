import type { APIRoute } from 'astro';
import { getDb } from '../../lib/db';
import { getRaceById, getRegistrationCode, createParticipant, useRegistrationCode, createTransaction } from '../../lib/db/actions';
import { randomUUID } from 'crypto';
import { env } from 'cloudflare:workers';

export const POST: APIRoute = async ({ request }) => {
  try {
    const db = getDb(env.DB as any);
    const body = await request.json();
    const { firstName, lastName, email, phone, birthDate, gender, categoryId, distanceId, teamName, teamMembers, size, paymentMethod, code, raceId, termsAccepted } = body;
    
    const race = await getRaceById(db, raceId);
    if (!race) {
      return new Response(JSON.stringify({ message: 'Carrera no encontrada' }), { status: 404 });
    }

    if (race.status !== 'accepting') {
      return new Response(JSON.stringify({ message: 'Las inscripciones no están abiertas para esta carrera' }), { status: 400 });
    }
    
    if (!termsAccepted) {
      return new Response(JSON.stringify({ message: 'Debes aceptar los términos y condiciones' }), { status: 400 });
    }
    
    let codeId: string | undefined;
    let finalPrice = race.price;
    const isTeam = teamMembers && Array.isArray(teamMembers) && teamMembers.length > 0;
    const teamPrice = isTeam ? race.price * teamMembers.length : race.price;
    
    if (code) {
      const registrationCode = await getRegistrationCode(db, code);
      if (registrationCode && !registrationCode.used && (!registrationCode.raceId || registrationCode.raceId === raceId)) {
        codeId = registrationCode.id;
        finalPrice = 0;
      }
    }
    
    if (isTeam) {
      // Register all team members
      const participants = [];
      const firstParticipantId = randomUUID();
      
      for (let i = 0; i < teamMembers.length; i++) {
        const member = teamMembers[i];
        if (!member.firstName || !member.lastName || !member.email) {
          return new Response(JSON.stringify({ message: `Faltan datos del integrante ${i + 1}` }), { status: 400 });
        }
        
        const participantId = i === 0 ? firstParticipantId : randomUUID();
        
        const participant = await createParticipant(db, {
          id: participantId,
          raceId,
          firstName: member.firstName,
          lastName: member.lastName,
          email: member.email,
          phone: member.phone || null,
          birthDate: member.birthDate || null,
          gender: member.gender || null,
          categoryId: categoryId || null,
          distanceId: distanceId || null,
          team: teamName || null,
          size: member.size || null,
          codeId: i === 0 ? codeId || null : null,
          paymentMethod: paymentMethod || null,
          paymentStatus: finalPrice === 0 ? 'paid' : 'pending',
          termsAccepted: true,
          registeredAt: Math.floor(Date.now() / 1000)
        });
        participants.push(participant[0]);
      }
      
      if (codeId) {
        await useRegistrationCode(db, codeId, firstParticipantId);
      }
      
      if (finalPrice > 0) {
        const transaction = await createTransaction(db, {
          id: randomUUID(),
          participantId: firstParticipantId,
          amount: isTeam ? teamPrice : finalPrice,
          status: 'pending',
          createdAt: Math.floor(Date.now() / 1000),
          updatedAt: Math.floor(Date.now() / 1000)
        });
        
        return new Response(JSON.stringify({ 
          success: true, 
          participants,
          teamName,
          paymentUrl: `/pay/${transaction[0].id}`,
          amount: isTeam ? teamPrice : finalPrice
        }), { headers: { 'Content-Type': 'application/json' } });
      }
      
      return new Response(JSON.stringify({ 
        success: true, 
        participants,
        teamName,
        message: 'Inscripción de equipo completada'
      }), { headers: { 'Content-Type': 'application/json' } });
    } else {
      // Individual registration
      if (!firstName || !lastName || !email || !raceId) {
        return new Response(JSON.stringify({ message: 'Faltan datos requeridos' }), { status: 400 });
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
        categoryId: categoryId || null,
        distanceId: distanceId || null,
        team: null,
        size: size || null,
        codeId: codeId || null,
        paymentMethod: paymentMethod || null,
        paymentStatus: finalPrice === 0 ? 'paid' : 'pending',
        termsAccepted: true,
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
        
        return new Response(JSON.stringify({ 
          success: true, 
          participant: participant[0],
          paymentUrl: `/pay/${transaction[0].id}`,
          amount: finalPrice
        }), { headers: { 'Content-Type': 'application/json' } });
      }
      
      return new Response(JSON.stringify({ 
        success: true, 
        participant: participant[0],
        message: 'Inscripción gratuita completada'
      }), { headers: { 'Content-Type': 'application/json' } });
    }
  } catch (e: any) {
    return new Response(JSON.stringify({ message: e.message || 'Error al registrar' }), { status: 500 });
  }
};
