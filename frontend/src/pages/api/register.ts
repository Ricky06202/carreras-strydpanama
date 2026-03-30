import type { APIRoute } from 'astro';
import { api, apiFetch } from '../../lib/api';
import { env } from 'cloudflare:workers';

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
    if (!raceRes || !raceRes.data) throw new Error('Carrera no encontrada');
    const startingBib = raceRes.data.data?.startingBib ? Number(raceRes.data.data.startingBib) : 1;
    
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

    // 3. Registrar al participante
    const result = await api.registerParticipant(env, body);

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
    
    return new Response(JSON.stringify({ ...result, assignedBib: nextBib }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ 
      message: error.message || 'Error en el registro',
      env_url: env?.SONICJS_API_URL ? 'PRESENT' : 'MISSING'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
