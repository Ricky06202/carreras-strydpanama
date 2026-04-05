import type { APIRoute } from 'astro';
import { api, apiFetch } from '../../lib/api';
import { env } from 'cloudflare:workers';
import { sendRegistrationEmail } from '../../lib/mailer';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();

    let usedCodeId = null;
    let usedCodeData = null;

    // 0. Validar Código si existe
    if (body.discountCode) {
        const resultCodes = await apiFetch(`/api/collections/registration_codes/content?limit=500`, env, { method: 'GET' });
        const match = (resultCodes.data || []).find((c: any) => c.data?.code === body.discountCode && c.data?.race === body.raceId);

        if (!match) throw new Error('Código de registro no encontrado o no pertenece a esta carrera');
        if (match.data?.status === 'redeemed' || match.data?.used === true) throw new Error('El código ingresado ya fue utilizado');
        
        usedCodeId = match.id;
        usedCodeData = match.data;
    }
    
    // 1. Obtener la carrera para conocer su startingBib
    const raceRes = await api.getRace(env, body.raceId);
    if (!raceRes) throw new Error('Carrera no encontrada en la base de datos');
    
    // SonicJS item structure: { id, title, data: { ...fields } }
    const raceFields = raceRes.data || {};
    const startingBib = raceFields.startingBib ? Number(raceFields.startingBib) : 1;
    const raceName = raceFields.title || raceRes.title || 'Carrera';
    
    // 2. Obtener participantes actuales para calcular el siguiente dorsal
    const participantsRes = await api.getParticipants(env, body.raceId);
    const allParticipants = participantsRes?.data || [];
    
    // Filtramos manualmente por si SonicJS no aplica el filtro en la query
    const raceParticipants = allParticipants.filter((p: any) => p.data?.race === body.raceId || p.data?.raceId === body.raceId);
    
    let nextBib = startingBib;
    if (raceParticipants.length > 0) {
      const highestBib = raceParticipants.reduce((max: number, p: any) => {
        const bib = p.data?.bibNumber ? Number(p.data.bibNumber) : 0;
        return bib > max ? bib : max;
      }, 0);
      
      if (highestBib >= startingBib) {
        nextBib = highestBib + 1;
      }
    }
    
    // Asignar el dorsal calculado
    body.bibNumber = nextBib;

    // 3. Registrar al participante con un título único para evitar conflictos de slug
    const participantTitle = `${body.firstName} ${body.lastName} - Dorsal ${nextBib}`;
    const result = await api.registerParticipant(env, { ...body, title: participantTitle });

    // 4. Marcar Código como canjeado si se usó
    if (usedCodeId && usedCodeData) {
        const payload = {
            id: usedCodeId,
            collectionId: 'col-registration_codes-469bc379',
            collection_id: 'col-registration_codes-469bc379',
            title: usedCodeData.title,
            status: 'published',
            data: {
                ...usedCodeData,
                used: true,
                status: 'redeemed',
                usedDate: new Date().toISOString()
            }
        };
        await apiFetch(`/api/content/${usedCodeId}`, env, {
            method: 'PUT',
            body: JSON.stringify(payload)
        });
    }
    
    // 5. Upsert el perfil del corredor en la base de datos permanente
    if (body.cedula) {
      try {
        const RUNNERS_COL = 'col-runners-' + 'strydpanama';
        const allRunners = await apiFetch('/api/collections/runners/content?limit=2000', env, { method: 'GET' });
        const existing = (allRunners?.data || []).find((r: any) => 
          (r.data?.cedula || '').toLowerCase().trim() === body.cedula.toLowerCase().trim()
        );

        const runnerData = {
          title: `${body.firstName} ${body.lastName}`, // Este es el campo dentro de data
          firstName: body.firstName,
          lastName: body.lastName,
          email: body.email,
          phone: body.phone,
          cedula: body.cedula,
          birthDate: body.birthDate,
          gender: body.gender,
          country: body.country,
          photoUrl: body.photoUrl || (existing?.data?.photoUrl || ''),
          totalRaces: (existing?.data?.totalRaces || 0) + 1,
        };

        const runnerTitle = `${body.firstName} ${body.lastName} (${body.cedula})`; // Título único para el slug

        if (existing) {
          const runnersRes = await apiFetch('/api/collections', env, { method: 'GET' });
          const runnersCol = (runnersRes?.data || []).find((c: any) => c.name === 'runners');
          const colId = runnersCol?.id || existing.collectionId;
          await apiFetch(`/api/content/${existing.id}`, env, {
            method: 'PUT',
            body: JSON.stringify({ id: existing.id, collectionId: colId, collection_id: colId, title: runnerTitle, status: 'published', data: runnerData })
          });
        } else {
          const runnersRes = await apiFetch('/api/collections', env, { method: 'GET' });
          const runnersCol = (runnersRes?.data || []).find((c: any) => c.name === 'runners');
          if (runnersCol?.id) {
            await apiFetch('/api/content', env, {
              method: 'POST',
              body: JSON.stringify({ collectionId: runnersCol.id, collection_id: runnersCol.id, title: runnerTitle, status: 'published', data: runnerData })
            });
          }
        }
      } catch (e) {
        console.error('Runner upsert failed:', e);
      }
    }

    // 6. Enviar correo de confirmación
    try {
      await sendRegistrationEmail(env, {
        email: body.email,
        firstName: body.firstName,
        lastName: body.lastName,
        raceName: raceName,
        bibNumber: nextBib,
        distance: body.distance || 'General',
        paymentMethod: body.paymentMethod || 'Por definir'
      });
      console.log(`Email sent successfully to ${body.email}`);
    } catch (mailError) {
      console.error('Failed to send confirmation email:', mailError);
    }

    return new Response(JSON.stringify({ ...result, assignedBib: nextBib }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Error in /api/register:', error);
    return new Response(JSON.stringify({ 
      success: false,
      message: error.message || 'Error interno en el servidor de registro',
      details: error.stack || 'No stack trace available',
      env_url: env?.SONICJS_API_URL ? 'PRESENT' : 'MISSING'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
