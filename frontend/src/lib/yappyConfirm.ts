import { apiFetch } from './api';
import { processRegistration } from './registerLogic';

/**
 * Busca una transacción Yappy pendiente por orderId (tolerando guiones o no),
 * ejecuta processRegistration con isWebhookConfirmed=true y marca la transacción
 * como Success_Pagado. Es IDEMPOTENTE: si ya fue procesada, no duplica.
 *
 * Usado tanto por el webhook de Yappy como por el endpoint /api/yappy/confirm
 * llamado desde el frontend en eventSuccess como safety net.
 */
export async function confirmYappyOrder(env: any, orderId: string, transactionId?: string | null) {
  const normalizedOrderId = (orderId || '').replace(/-/g, '').trim();

  if (!normalizedOrderId) {
    return { foundTransaction: false, status: 'no-orderId', message: 'orderId vacío' };
  }

  let txMatch: any = null;
  try {
    const txRes = await apiFetch(`/api/collections/transactions/content?limit=5000`, env, { method: 'GET' });
    txMatch = (txRes?.data || []).find((t: any) => {
      const txOrderId = ((t.data?.orderId || '') as string).replace(/-/g, '').trim();
      const txTitle = ((t.data?.title || '') as string).replace(/-/g, '');
      return txOrderId === normalizedOrderId || txTitle.includes(normalizedOrderId);
    });
  } catch (e) {
    console.error('[confirmYappyOrder] Error fetching transactions', e);
    return { foundTransaction: false, status: 'fetch-error', message: String(e) };
  }

  if (!txMatch) {
    return { foundTransaction: false, status: 'not-found', message: `Transacción ${orderId} no encontrada` };
  }

  // Idempotencia: si la transacción ya fue procesada, salir sin hacer nada.
  if (txMatch.data?.status === 'Success_Pagado') {
    return { foundTransaction: true, status: 'already-processed', message: 'Ya procesada anteriormente' };
  }

  if (!txMatch.data?.payload) {
    return { foundTransaction: true, status: 'no-payload', message: 'Transacción sin payload de registro' };
  }

  let transactionPayload: any = null;
  try {
    transactionPayload = JSON.parse(txMatch.data.payload);
  } catch (e) {
    console.error('[confirmYappyOrder] Error parsing payload', e);
    return { foundTransaction: true, status: 'parse-error', message: 'Payload corrupto' };
  }

  // Marcar como "procesando" ANTES de ejecutar processRegistration,
  // para evitar que webhook + frontend disparen ambos y creen participantes duplicados.
  try {
    await apiFetch(`/api/content/${txMatch.id}`, env, {
      method: 'PUT',
      body: JSON.stringify({
        id: txMatch.id,
        collectionId: txMatch.collectionId || 'col-transactions-e06da228',
        collection_id: txMatch.collectionId || 'col-transactions-e06da228',
        title: txMatch.title,
        status: 'published',
        data: { ...txMatch.data, status: 'Processing' }
      })
    });
  } catch (e) {
    console.error('[confirmYappyOrder] No se pudo marcar Processing', e);
  }

  try {
    await processRegistration(env, {
      ...transactionPayload,
      isWebhookConfirmed: true,
      paymentStatus: 'Pagado'
    });
    console.log(`[confirmYappyOrder] Registro procesado exitosamente para ${orderId}`);
  } catch (regError) {
    console.error('[confirmYappyOrder] Error ejecutando processRegistration:', regError);
    // Revertir a pending para permitir reintentos
    try {
      await apiFetch(`/api/content/${txMatch.id}`, env, {
        method: 'PUT',
        body: JSON.stringify({
          id: txMatch.id,
          collectionId: txMatch.collectionId || 'col-transactions-e06da228',
          collection_id: txMatch.collectionId || 'col-transactions-e06da228',
          title: txMatch.title,
          status: 'published',
          data: { ...txMatch.data, status: 'pending' }
        })
      });
    } catch {}
    return { foundTransaction: true, status: 'registration-error', message: String(regError) };
  }

  // Marcar la transacción como exitosa
  try {
    await apiFetch(`/api/content/${txMatch.id}`, env, {
      method: 'PUT',
      body: JSON.stringify({
        id: txMatch.id,
        collectionId: txMatch.collectionId || 'col-transactions-e06da228',
        collection_id: txMatch.collectionId || 'col-transactions-e06da228',
        title: txMatch.title,
        status: 'published',
        data: { ...txMatch.data, status: 'Success_Pagado', transactionId: transactionId || 'YAPPY_CONFIRMED' }
      })
    });
  } catch (e) {
    console.error('[confirmYappyOrder] No se pudo marcar Success_Pagado', e);
  }

  return { foundTransaction: true, status: 'processed', message: 'OK' };
}
