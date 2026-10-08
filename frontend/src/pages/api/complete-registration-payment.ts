import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { apiFetch } from '../../lib/api';
import { upgradePreinscrito, beginYappyUpgrade } from '../../lib/registerLogic';
import { normalizePanamaPhone } from '../../lib/phone';

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

    // Cupon promocional/gratuito: sin cobro, upgrade directo + marca el codigo como canjeado.
    // Mismas reglas que el flujo de inscripcion nueva (registerLogic processRegistration).
    const discountCode = String(body.discountCode || '').trim().toUpperCase();
    if (String(paymentMethod).toLowerCase() === 'cupon' || discountCode) {
      if (!discountCode) throw new Error('Escribe el codigo del cupon');
      const codeRaceId = pd.race || pd.raceId;
      const codesRes = await apiFetch(`/api/collections/registration_codes/content?limit=500&_t=${Date.now()}`, env, { method: 'GET' });
      const match = (codesRes?.data || []).find((c: any) => String(c.data?.code || '').toUpperCase() === discountCode && c.data?.race === codeRaceId);
      if (!match) throw new Error('Codigo no encontrado o no pertenece a esta carrera');
      const cd = match.data || {};
      if (cd.status === 'redeemed' || cd.used === true) throw new Error('El codigo del cupon ya fue utilizado');

      const label = cd.isFreeCode ? 'Cupon Gratuito' : (cd.isPadrinoCode ? 'Cupon Padrino' : 'Boleto Fisico');
      const result = await upgradePreinscrito(env, {
        participantId,
        confirmationCode: pd.confirmationCode || confirmationCode || '',
        paymentMethod: label,
        paymentStatus: label,
        amountPaid: 0,
        receiptUrl: '',
      });

      if (result.success && !result.alreadyUpgraded) {
        try {
          const colIdCode = match.collectionId || 'col-registration_codes-469bc379';
          await apiFetch(`/api/content/${match.id}`, env, {
            method: 'PUT',
            body: JSON.stringify({
              id: match.id,
              collectionId: colIdCode,
              collection_id: colIdCode,
              title: match.title,
              status: 'published',
              data: {
                ...cd,
                used: true,
                status: 'redeemed',
                usedDate: new Date().toISOString(),
                redeemedBy: `${pd.firstName || ''} ${pd.lastName || ''}`.trim(),
                redeemedByCedula: pd.cedula || '',
              }
            })
          });
        } catch (e) {
          console.error('Cupon validado pero fallo marcar el codigo como canjeado:', e);
        }
      }

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (String(paymentMethod).toLowerCase() === 'yappy') {
      const yappyPhone = normalizePanamaPhone(body.phone || pd.phone || '');
      if (!yappyPhone || !yappyPhone.startsWith('6')) {
        return new Response(JSON.stringify({ error: 'Para pagar con Yappy se requiere un celular panameño válido (8 dígitos que empiezan con 6). Actualízalo e intenta de nuevo.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }
      if (yappyPhone !== normalizePanamaPhone(pd.phone || '')) {
        const colId = participant.collectionId || 'col-participants-93d1ac21';
        await apiFetch(`/api/content/${participantId}`, env, {
          method: 'PUT',
          body: JSON.stringify({ id: participantId, collectionId: colId, collection_id: colId, title: participant.title, status: 'published', data: { ...pd, phone: yappyPhone } })
        });
      }
      const result = await beginYappyUpgrade(env, {
        ...body,
        phone: yappyPhone,
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