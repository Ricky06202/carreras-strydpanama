import type { APIRoute } from 'astro';
import { getDb } from '../../lib/db';
import { getRegistrationCode } from '../../lib/db/actions';
import { env } from 'cloudflare:workers';

export const POST: APIRoute = async ({ request }) => {
  try {
    const db = getDb(env.DB as any);
    const body = await request.json();
    const { code, raceId } = body;
    
    if (!code) {
      return new Response(JSON.stringify({ valid: false, message: 'Código requerido' }), { status: 400 });
    }
    
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
    
    return new Response(JSON.stringify({ valid: true, codeId: registrationCode.id }), { 
      headers: { 'Content-Type': 'application/json' } 
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ valid: false, message: e.message || 'Error al validar código' }), { status: 500 });
  }
};
