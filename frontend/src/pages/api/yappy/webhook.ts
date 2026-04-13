import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { apiFetch, api } from '../../../lib/api';
import { sendRegistrationEmail } from '../../../lib/mailer';

export const GET: APIRoute = async ({ request }) => handleRequest(request);
export const POST: APIRoute = async ({ request }) => handleRequest(request);

async function handleRequest(request: Request) {
  try {
    const url = new URL(request.url);
    const searchParams = url.searchParams;
    
    let orderId = searchParams.get('orderId');
    let status = searchParams.get('status');
    let transactionId = searchParams.get('transactionId');

    // Si es POST, intentar sacar del body si no están en URL
    if (request.method === 'POST' && (!orderId || !status)) {
        try {
            const body = await request.json() as any;
            orderId = orderId || body.orderId;
            status = status || body.status;
            transactionId = transactionId || body.transactionId;
        } catch (e) {}
    }

    console.log(`[Yappy Webhook] Recibido: orderId=${orderId}, status=${status}`);

    // "E" significa Ejecutado (Éxito) en la V2 de Yappy
    if ((status === 'E' || status === 'SUCCESS') && orderId) {
      
      // 1. Obtener al comprador original (Capitán o Individuo)
      const mainParticipantRes = await apiFetch(`/api/content/${orderId}`, env, { method: 'GET' });
      if (!mainParticipantRes?.data) {
          console.error(`[Yappy Webhook] Participante principal ${orderId} NO encontrado en BD.`);
          return new Response("success", { status: 200 });
      }

      const mainData = mainParticipantRes.data.data || {};
      const confirmationCode = mainData.confirmationCode;
      const registrationType = mainData.registrationType || 'individual';
      
      // 2. Determinar a cuántos afectar (si es equipo, a todos los bajo el mismo código)
      let participantsToUpdate = [mainParticipantRes.data];

      if (registrationType === 'team' && confirmationCode) {
         try {
           const allRes = await apiFetch(`/api/collections/participants/content?limit=5000`, env, { method: 'GET' });
           const teamMembers = (allRes?.data || []).filter((p: any) => p.data?.confirmationCode === confirmationCode);
           if (teamMembers.length > 0) {
               participantsToUpdate = teamMembers;
           }
         } catch(e) {
           console.error(`[Yappy Webhook] Error buscando miembros del equipo:`, e);
         }
      }

      // 3. Pre-cargar datos estéticos de Carrera y Distancia para los correos
      let raceName = 'Carrera';
      if (mainData.race || mainData.raceId) {
          try {
             // Algunas veces se guarda como 'race' (el ID) o 'raceId'
             const rObj = await api.getRace(env, mainData.raceId || mainData.race);
             if (rObj) raceName = rObj.data?.title || rObj.title || 'Carrera';
          } catch(e) {}
      }
      
      let allDistances: any[] = [];
      try {
         const dRes = await api.getDistances(env);
         allDistances = dRes?.data || [];
      } catch(e) {}

      // 4. Actualizar estado y Disparar Correos Reales
      for (const p of participantsToUpdate) {
         const pData = p.data || {};
         const colId = p.collectionId || 'col-participants-93d1ac21';
         
         // 4.1 Update en DB de Pendiente a Pagado
         try {
             await apiFetch(`/api/content/${p.id}`, env, {
                 method: 'PUT',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({
                    id: p.id,
                    collectionId: colId,
                    collection_id: colId, 
                    title: p.title,
                    status: 'published',
                    data: {
                        ...pData,
                        paymentStatus: 'Pagado',
                        transactionId: transactionId || 'YAPPY_CONFIRMED'
                    }
                 })
             });
             console.log(`[Yappy Webhook] Updated paymentStatus to 'Pagado' for ${p.id}`);
         } catch (e) {
             console.error(`[Yappy Webhook] Fail updating DB for ${p.id}`, e);
         }

         // 4.2 Enviar Correo Oficial (sabiendo que el dinero ya entró)
         if (pData.email) {
             let distName = pData.categoryName || 'General';
             if (pData.distanceId || pData.distance) {
                 const dObj = allDistances.find(d => d.id === (pData.distanceId || pData.distance));
                 if (dObj) distName = dObj.data?.name || dObj.name || distName;
             }

             try {
                await sendRegistrationEmail(env, {
                    email: pData.email,
                    firstName: pData.firstName || '',
                    lastName: pData.lastName || '',
                    raceName: raceName,
                    bibNumber: pData.bibNumber || '',
                    distance: distName,
                    category: pData.categoryName || '',
                    cedula: pData.cedula || '',
                    size: pData.size || '',
                    paymentMethod: 'Yappy',
                    confirmationCode: pData.confirmationCode || '',
                    teamName: pData.teamName || '',
                    registrationType: pData.registrationType || 'individual'
                });
                console.log(`[Yappy Webhook] Correo de confirmación oficial enviado a ${pData.email}`);
             } catch(e) {
                console.error(`[Yappy Webhook] Fail sending email to ${pData.email}`, e);
             }
         }
      }
    }

    return new Response("success", { status: 200 });

  } catch (error: any) {
    console.error("Yappy IPN Error:", error);
    return new Response("error", { status: 500 });
  }
}
