import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { upgradePreinscrito } from '../../../lib/registerLogic';

/**
 * Admin: oficializa el pago de un preinscrito. Le asigna dorsal y lo mueve
 * al Directorio de Inscritos (registrationStatus = 'inscrito', paymentStatus = 'Confirmado').
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json() as any;
    const { id } = body;
    if (!id) throw new Error('ID del preinscrito requerido');

    console.log(`[Admin] Oficializando preinscripción ${id}`);
    const result = await upgradePreinscrito(env, {
      participantId: id,
      paymentStatus: 'Confirmado',
      paymentMethod: body.paymentMethod || '',
    });

    return new Response(JSON.stringify({ success: true, ...result }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Error en /api/admin/officialize-preinscrito:', error);
    return new Response(JSON.stringify({ error: error.message || 'Error al oficializar la preinscripción' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};