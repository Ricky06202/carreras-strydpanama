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
    
    // 3. ASIGNACIÓN AUTOMÁTICA DE CATEGORÍA POR EDAD Y GÉNERO
    // Calculamos edad al día de la carrera
    let assignedCategoryId = body.categoryId;
    let resolvedCategoryName = 'General';

    // PRIORIDAD: Tipo de Participante (Estudiante, Docente, Administrativo)
    const pType = (body.participantType || 'general').toLowerCase();
    const categoriesRes = await api.getCategories(env, body.raceId);
    const allCategories = categoriesRes?.data || [];

    if (pType !== 'general') {
        const typeMatch = allCategories.find((cat: any) => 
            (cat.data?.title || cat.title || '').toLowerCase().trim() === pType.trim()
        );
        if (typeMatch) {
            assignedCategoryId = typeMatch.id;
            resolvedCategoryName = typeMatch.data?.title || typeMatch.title;
            console.log(`Category Assigned by Type (${pType}): ${resolvedCategoryName}`);
        }
    }

    // Si no se asignó por tipo, procedemos por EDAD
    if (!assignedCategoryId && body.birthDate && raceFields.date) {
        const raceDate = new Date(raceFields.date);
        const birthDate = new Date(body.birthDate);
        let age = raceDate.getFullYear() - birthDate.getFullYear();
        const m = raceDate.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && raceDate.getDate() < birthDate.getDate())) {
            age--;
        }

        console.log(`Calculated Age: ${age} for runner born ${body.birthDate} on race date ${raceFields.date}`);

        // Mapear género del corredor (M/F) a los términos de la categoría
        const runnerGender = (body.gender || 'M').toLowerCase();
        
        const match = allCategories.find((cat: any) => {
            const c = cat.data || {};
            const min = Number(c.minAge || 0);
            const max = Number(c.maxAge || 999);
            const catGender = (c.gender || 'ambos').toLowerCase();

            const ageMatch = age >= min && age <= max;
            const genderMatch = catGender === 'ambos' || 
                               (catGender === 'masculino' && runnerGender === 'm') || 
                               (catGender === 'femenino' && runnerGender === 'f');
            
            return ageMatch && genderMatch;
        });

        if (match) {
            assignedCategoryId = match.id;
            resolvedCategoryName = match.data?.title || match.title;
            console.log(`Category Auto-Assigned by Age: ${resolvedCategoryName} (${match.id})`);
        } else {
            console.warn(`No category match found for age ${age} and gender ${runnerGender}`);
        }
    }

    // Asignar el dorsal y la categoría calculada
    body.bibNumber = nextBib;
    body.categoryId = assignedCategoryId;
    body.category = assignedCategoryId; // Compatibilidad con lib/api mapping

    // Generar código de confirmación único: STRYD-8chars
    const rawId = crypto.randomUUID().replace(/-/g, '');
    const confCode = 'STRYD-' + rawId.slice(0, 8).toUpperCase();
    body.confirmationCode = confCode;

    // 4. Registrar al participante con un título único para evitar conflictos de slug
    const participantTitle = `${body.firstName} ${body.lastName} - ${resolvedCategoryName} - Dorsal ${nextBib}`;
    
    // Asegurar que el código vaya dentro del objeto data final del participante
    const registrationData = {
        ...body,
        title: participantTitle,
        confirmationCode: confCode // Re-confirmamos que se incluya
    };
    
    const result = await api.registerParticipant(env, registrationData);

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
      // 6a. Obtener el nombre de la distancia para el correo
      let resolvedDistance = 'General';
      if (body.distanceId) {
        try {
          const distancesRes = await api.getDistances(env);
          const distObj = (distancesRes?.data || []).find((d: any) => d.id === body.distanceId);
          resolvedDistance = distObj?.data?.name || distObj?.name || 'General';
        } catch (e) {
          console.error('Failed to resolve distance name for email:', e);
        }
      }

      // 6b. Obtener el nombre de la categoría si existe
      let resolvedCategory = '';
      if (body.categoryId) {
        try {
          const categoriesRes = await api.getCategories(env, body.raceId);
          const catObj = (categoriesRes?.data || []).find((c: any) => c.id === body.categoryId);
          resolvedCategory = catObj?.data?.title || catObj?.title || catObj?.data?.name || catObj?.name || '';
        } catch (e) {
          console.error('Failed to resolve category name for email:', e);
        }
      }

      await sendRegistrationEmail(env, {
        email: body.email,
        firstName: body.firstName,
        lastName: body.lastName,
        raceName: raceName,
        bibNumber: nextBib,
        distance: resolvedDistance,
        category: resolvedCategory,
        cedula: body.cedula,
        size: body.size,
        paymentMethod: body.paymentStatus || body.paymentMethod || 'Yappy',
        confirmationCode: confCode
      });
      console.log(`Email sent successfully to ${body.email}`);
    } catch (mailError) {
      console.error('Failed to send confirmation email:', mailError);
    }

    // Retornamos el objeto con el código en la raíz para facilitar la lectura del frontend
    return new Response(JSON.stringify({ 
      success: true,
      assignedBib: nextBib, 
      confirmationCode: confCode,
      data: result.data || result
    }), {
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
