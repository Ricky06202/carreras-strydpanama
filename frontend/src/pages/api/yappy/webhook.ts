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
      
      // El orderId que Yappy devuelve está truncado a 15 caracteres y sin guiones
      // por limitaciones de su API. Corresponde al confirmationCode (ej. STRYD12345678)
      
      let participantsToUpdate: any[] = [];
      let raceName = 'Carrera';
      
      try {
           // Buscamos a TODOS los participantes que tengan este código de confirmación
           const allRes = await apiFetch(`/api/collections/participants/content?limit=5000`, env, { method: 'GET' });
           
           participantsToUpdate = (allRes?.data || []).filter((p: any) => {
               const code = p.data?.confirmationCode || '';
               const normalizedCode = code.replace(/-/g, ''); // Quitamos guiones para comparar con lo de Yappy
               return code === orderId || normalizedCode === orderId || p.id.replace(/-/g, '').slice(0, 15) === orderId;
           });
           
           if (participantsToUpdate.length === 0) {
               console.error(`[Yappy Webhook] Participante con orderId (confirmationCode) ${orderId} NO encontrado en BD.`);
               return new Response("success", { status: 200 });
           }

           // Sacar el nombre de la carrera del primer participante
           const mainData = participantsToUpdate[0].data || {};
           if (mainData.race || mainData.raceId) {
               try {
                   const rObj = await api.getRace(env, mainData.raceId || mainData.race);
                   if (rObj) raceName = rObj.data?.title || rObj.title || 'Carrera';
               } catch(e) {}
           }
      } catch(e) {
           console.error(`[Yappy Webhook] Error buscando miembros:`, e);
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
