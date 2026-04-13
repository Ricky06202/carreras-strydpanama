import type { APIRoute } from 'astro';
import { apiFetch } from '../../lib/api';
import { env } from 'cloudflare:workers';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { code, raceId } = body;
    
    // Buscamos todos los codigos y filtramos en la app
    const result = await apiFetch(`/api/collections/registration_codes/content?limit=500`, env, { method: 'GET' });
    const match = (result.data || []).find((c: any) => c.data?.code === code && c.data?.race === raceId);

    if (!match) {
        return new Response(JSON.stringify({ valid: false, message: 'Código no encontrado o inválido para esta carrera' }), { status: 400 });
    }

    const { participantType = 'general', registrationType = 'individual' } = body;
    
    // Validar restricción de Tipo de Registro
    if (match.data?.allowedType && match.data.allowedType !== 'all') {
        const typeAllowed = match.data.allowedType;
        if (typeAllowed === 'team' && registrationType !== 'team') {
            return new Response(JSON.stringify({ valid: false, message: 'Este código es exclusivo para inscripciones en EQUIPO.' }), { status: 400 });
        }
        if (typeAllowed === 'estudiante' && participantType !== 'estudiante') {
            return new Response(JSON.stringify({ valid: false, message: 'Este código es exclusivo para ESTUDIANTES.' }), { status: 400 });
        }
        if (typeAllowed === 'general' && (participantType !== 'general' || registrationType === 'team')) {
            return new Response(JSON.stringify({ valid: false, message: 'Este código es exclusivo para PÚBLICO GENERAL INDIVIDUAL.' }), { status: 400 });
        }
    }

    if (match.data?.status === 'redeemed' || match.data?.used === true) {
        return new Response(JSON.stringify({ valid: false, message: 'Este código ya fue utilizado' }), { status: 400 });
    }

    return new Response(JSON.stringify({ valid: true, message: 'Código validado con éxito.', codeId: match.id, codeData: match.data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ valid: false, message: error.message || 'Error al validar el código' }), { status: 500 });
  }
};
