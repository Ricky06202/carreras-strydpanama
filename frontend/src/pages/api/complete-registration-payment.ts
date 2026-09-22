import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { apiFetch } from '../../lib/api';
import { upgradePreinscrito, beginYappyUpgrade } from '../../lib/registerLogic';

/**
 * Permite a un corredor preinscrito actualizar su método de pago y convertirse
 * en inscrito oficial (recibiendo su dorsal en el proceso).
 *
 * - paymentMethod === 'transfer': actualiza al instante (queda pendiente de validación
 *   del comprobante por el admin hasta que pulse CONFIRMAR).
 * - paymentMethod === 'yappy': crea una orden diferida que se completa cuando
 *   Yappy confirme el pago (webhook / safety net).
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json() as any;
    const { participantId, cedula, confirmationCode, paymentMethod } = body;

    if (!participantId) throw new Error('Falta el identificador de la preinscripción');
    if (!paymentMethod) throw new Error('Selecciona un método de pago');

    const partRes = await apiFetch(`/api/content/${participantId}`, env, { method: 'GET' });
    const participant = partRes?.data;
    if (!participant) throw new Error('Preinscripción no encontrada');

    const pd = participant.data || {};

    // Autorización: la persona debe coincidir con la preinscripción
    // (normalizada: "4-717-1802" = "47171802")
    const normalize = (s: any) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const targetCedula = normalize(cedula);
    const storedCedula = normalize(pd.cedula);
    if (targetCedula && storedCedula && targetCedula !== storedCedula) {
      throw new Error('La cédula no coincide con la preinscripción');
    }
    if (confirmationCode && pd.confirmationCode && normalize(confirmationCode) !== normalize(pd.confirmationCode)) {
      throw new Error('El código de confirmación no coincide con la preinscripción');
    }

    if (pd.registrationStatus === 'inscrito' && pd.bibNumber) {
      // Ya fue actualizada previamente
      return new Response(JSON.stringify({
        success: true,
        alreadyUpgraded: true,
        assignedBib: Number(pd.bibNumber) || null,
        confirmationCode: pd.confirmationCode || confirmationCode || '',
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    if (pd.registrationStatus !== 'preinscrito' && !pd.registrationStatus) {
      // Sin registrationStatus definido: asumimos inscrito normal, devolver sin cambios
      return new Response(JSON.stringify({
        success: true,
        alreadyUpgraded: true,
        assignedBib: Number(pd.bibNumber) || null,
        confirmationCode: pd.confirmationCode || confirmationCode || '',
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    if (String(paymentMethod).toLowerCase() === 'yappy') {
      const result = await beginYappyUpgrade(env, {
        ...body,
        participantId,
        email: pd.email,
        upgradeExistingId: true,
      });
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Transferencia (u otro): actualizar al instante con dorsal, queda "Pendiente" hasta validación admin
    const result = await upgradePreinscrito(env, {
      participantId,
      confirmationCode: pd.confirmationCode || confirmationCode || '',
      paymentMethod: String(paymentMethod),
      paymentStatus: String(paymentMethod),
      receiptUrl: body.receiptUrl || '',
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Error en /api/complete-registration-payment:', error);
    return new Response(JSON.stringify({ success: false, error: error.message || 'Error al completar la inscripción' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};