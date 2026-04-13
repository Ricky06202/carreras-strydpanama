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
    
    // 2. Obtener el siguiente BIB disponible (una sola lectura con límite alto, luego asignación secuencial local)
    const participantsRes = await apiFetch(`/api/collections/participants/content?limit=5000`, env, { method: 'GET' });
    const raceParticipants = (participantsRes?.data || []).filter((p: any) => p.data?.race === body.raceId || p.data?.raceId === body.raceId);

    let nextBib = startingBib;
    if (raceParticipants.length > 0) {
      const highestBib = raceParticipants.reduce((max: number, p: any) => {
        const bib = p.data?.bibNumber ? Number(p.data.bibNumber) : 0;
        return bib > max ? bib : max;
      }, 0);
      if (highestBib >= startingBib) nextBib = highestBib + 1;
    }
    
    // 2.5 Obtener Categorías de la Carrera
    let allCategories: any[] = [];
    try {
        const catRes = await apiFetch(`/api/collections/categories/content?limit=500`, env, { method: 'GET' });
        allCategories = catRes?.data || [];
    } catch (e) {
        console.error('Failed to fetch categories during registration:', e);
    }

    // 3. ASIGNACIÓN AUTOMÁTICA DE CATEGORÍA POR EDAD Y GÉNERO
    // Calculamos edad al día de la carrera
    let assignedCategoryId = body.categoryId;
    let resolvedCategoryName = 'General';

    // Helper for category resolution
    const TYPE_SEARCH_TERMS: Record<string, string> = {
      'estudiante': 'estudiante',
      'docente': 'docente',
      'administrativo': 'administrativo',
    };

    const resolveCategoryForPerson = (personBirthDate: string, personGender: string, personType: string) => {
        let catId = '';
        let catName = 'General';

        const pType = (personType || 'general').toLowerCase();
        if (pType !== 'general' && TYPE_SEARCH_TERMS[pType]) {
            const searchTerm = TYPE_SEARCH_TERMS[pType];
            const runnerGender = (personGender || '').toLowerCase();
            const typeMatch = allCategories.find((cat: any) => {
                const isSameRace = cat.data?.race === body.raceId;
                const title = (cat.data?.title || cat.title || '').toLowerCase();
                const catGender = (cat.data?.gender || 'ambos').toLowerCase();
                const nameMatch = title.includes(searchTerm);
                const genderMatch = catGender === 'ambos' ||
                                   (catGender === 'masculino' && runnerGender === 'm') ||
                                   (catGender === 'femenino' && runnerGender === 'f');
                return isSameRace && nameMatch && genderMatch;
            });
            if (typeMatch) {
                catId = typeMatch.id;
                catName = typeMatch.data?.title || typeMatch.title;
            }
        }

        if (!catId && personBirthDate && raceFields.date) {
            const raceDate = new Date(raceFields.date);
            const birthDate = new Date(personBirthDate);
            const age = raceDate.getFullYear() - birthDate.getFullYear();

            const runnerGender = (personGender || 'm').toLowerCase();
            const specialTerms = Object.values(TYPE_SEARCH_TERMS);

            const match = allCategories.find((cat: any) => {
                const c = cat.data || {};
                if (c.race !== body.raceId) return false;
                const catTitle = (c.title || cat.title || '').toLowerCase();
                if (specialTerms.some(term => catTitle.includes(term))) return false;

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
                catId = match.id;
                catName = match.data?.title || match.title;
            }
        }

        return { catId, catName };
    };

    const mainCat = resolveCategoryForPerson(body.birthDate, body.gender, body.participantType);
    assignedCategoryId = mainCat.catId;
    resolvedCategoryName = mainCat.catName;

    // Asignar el dorsal y la categoría calculada
    body.bibNumber = nextBib;
    body.categoryId = assignedCategoryId;
    body.category = assignedCategoryId;
    body.categoryName = resolvedCategoryName; // Guardamos el nombre para que sea persistente

    // Generar código de confirmación único: STRYD-8chars
    const rawId = crypto.randomUUID().replace(/-/g, '');
    const confCode = 'STRYD-' + rawId.slice(0, 8).toUpperCase();
    body.confirmationCode = confCode;

    // 4. Registrar participantes
    // Para equipos: todos los miembros vienen en teamMembers (índice 0 = capitán).
    // NO se registra el body principal como participante para evitar entradas fantasma.
    // Para individuales: se registra el body principal normalmente.

    const teamMemberBibs: number[] = [];
    let result: any = null;

    const isYappy = (body.paymentMethod || '').toLowerCase().includes('yappy') || (body.paymentStatus || '').toLowerCase().includes('yappy');

    if (body.registrationType === 'team' && Array.isArray(body.teamMembers) && body.teamMembers.length > 0) {
        // Registrar cada miembro del equipo (todos, incluyendo el capitán en índice 0)
        // BIBs asignados secuencialmente: nextBib, nextBib+1, nextBib+2, ...
        let memberBib = nextBib - 1;
        let isFirstMember = true;
        for (const member of body.teamMembers) {
            if (!member.firstName || !member.lastName) continue; // Ignorar slots vacíos

            memberBib++;
            teamMemberBibs.push(memberBib);
            const isCapitan = isFirstMember;
            isFirstMember = false;
            const memberConfCode = confCode; // Todos comparten el código del capitán
            const uniqueSuffix = crypto.randomUUID().split('-')[0]; // 8 caracteres únicos
            const memberCat = resolveCategoryForPerson(member.birthDate, member.gender, body.participantType);
            const memberTitle = `${member.firstName} ${member.lastName} - ${memberCat.catName} - Dorsal ${memberBib} [${uniqueSuffix}]`;
            const memberData = {
                firstName: member.firstName,
                lastName: member.lastName,
                email: member.email || body.email,
                phone: member.phone || body.phone,
                cedula: member.cedula || '',
                country: member.country || body.country,
                birthDate: member.birthDate || '',
                gender: member.gender || '',
                size: member.size || '',
                race: body.raceId,
                raceId: body.raceId,
                category: memberCat.catId,
                categoryId: memberCat.catId,
                categoryName: memberCat.catName,
                distance: body.distanceId,
                distanceId: body.distanceId,
                teamName: body.teamName || '',
                photoUrl: member.photoUrl || '',
                receiptUrl: body.receiptUrl || '',
                studentIdUrl: body.studentIdUrl || '',
                matriculaUrl: body.matriculaUrl || '',
                bibNumber: memberBib,
                paymentStatus: body.paymentMethod,
                confirmationCode: memberConfCode,
                participantType: body.participantType || 'general',
                registrationType: 'team',
                title: memberTitle,
            };
            try {
                const regResult = await api.registerParticipant(env, memberData);
                if (isCapitan) result = regResult;
                console.log(`Team member registered: ${member.firstName} ${member.lastName} - BIB ${memberBib}`);
            } catch (e) {
                console.error(`Failed to register team member ${member.firstName}:`, e);
            }

            // Enviar email a cada miembro con su BIB y código
            // Enviar email a cada miembro con su BIB y código (excepto Yappy, que espera el Webhook)
            const emailAddr = member.email || (isCapitan ? body.email : null);
            if (emailAddr && !isYappy) {
                try {
                    await sendRegistrationEmail(env, {
                        email: emailAddr,
                        firstName: member.firstName,
                        lastName: member.lastName,
                        raceName: raceName,
                        bibNumber: memberBib,
                        distance: memberCat.catName,
                        category: memberCat.catName,
                        cedula: member.cedula || '',
                        size: member.size || '',
                        paymentMethod: body.paymentStatus || body.paymentMethod || 'Yappy',
                        confirmationCode: memberConfCode,
                        teamName: body.teamName,
                        registrationType: 'team',
                    });
                    console.log(`Email sent to ${emailAddr}`);
                } catch (e) {
                    console.error(`Failed to send email to ${emailAddr}:`, e);
                }
            }
        }
    } else {
        // Inscripción individual normal
        const uniqueSuffix = crypto.randomUUID().split('-')[0]; // 8 caracteres únicos
        const participantTitle = `${body.firstName} ${body.lastName} - ${resolvedCategoryName} - Dorsal ${nextBib} [${uniqueSuffix}]`;
        const registrationData = { ...body, title: participantTitle, confirmationCode: confCode };
        result = await api.registerParticipant(env, registrationData);
        teamMemberBibs.push(nextBib);
    }

    // 4a. Verificar y reparar BIBs duplicados post-registro
    try {
      const postCheck = await apiFetch(`/api/collections/participants/content?limit=5000`, env, { method: 'GET' });
      const allParts = (postCheck?.data || []).filter((p: any) => p.data?.race === body.raceId || p.data?.raceId === body.raceId);
      const bibCounts: Record<number, any[]> = {};
      for (const p of allParts) {
        const bib = Number(p.data?.bibNumber || 0);
        if (!bibCounts[bib]) bibCounts[bib] = [];
        bibCounts[bib].push(p);
      }
      // Encontrar el BIB más alto para reasignar
      let maxBib = Math.max(...Object.keys(bibCounts).map(Number));
      for (const [bibStr, entries] of Object.entries(bibCounts)) {
        if (entries.length <= 1) continue;
        // Hay duplicados: mantener el primero (por createdOn), reasignar los demás
        entries.sort((a: any, b: any) => (a.createdOn || '').localeCompare(b.createdOn || ''));
        for (let i = 1; i < entries.length; i++) {
          maxBib++;
          const dup = entries[i];
          const colId = dup.collectionId || 'col-participants-93d1ac21';
          const newTitle = (dup.title || '').replace(/Dorsal \d+/, `Dorsal ${maxBib}`);
          await apiFetch(`/api/content/${dup.id}`, env, {
            method: 'PUT',
            body: JSON.stringify({ id: dup.id, collectionId: colId, collection_id: colId, title: newTitle, status: 'published', data: { ...dup.data, bibNumber: maxBib } })
          });
          console.log(`Fixed duplicate BIB: ${bibStr} → ${maxBib} for ${dup.data?.firstName} ${dup.data?.lastName}`);
        }
      }
    } catch (e) {
      console.error('Post-registration BIB dedup check failed:', e);
    }

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
                usedDate: new Date().toISOString(),
                redeemedBy: `${body.firstName} ${body.lastName}`,
                redeemedByCedula: body.cedula || ''
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
            body: JSON.stringify({ id: existing.id, collectionId: colId, collection_id: colId, title: runnerTitle, status: 'published', data: { ...existing.data, ...runnerData } })
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

    // 6. Enviar correo de confirmación (solo para inscripciones individuales;
    //    los equipos ya enviaron email a cada miembro en el paso anterior)
    if (body.registrationType === 'team' || isYappy) {
      // Ya enviado por miembro arriba, o es Yappy (que se difiere al webhook). No hacer nada.
    } else
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
