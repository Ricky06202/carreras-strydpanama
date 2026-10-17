import type { APIRoute } from 'astro';
import { api } from '../../lib/api';
import { env } from 'cloudflare:workers';

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const raceId = url.searchParams.get('raceId');

  if (!raceId) {
    return new Response(JSON.stringify({ error: 'raceId es requerido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const results = await Promise.allSettled([
      api.getRace(env, raceId),
      api.getCategories(env, raceId),
      api.getDistances(env, raceId),
      api.getParticipants(env, raceId),
      api.getParticipantTypes(env, raceId)
    ]);

    const [raceRes, categoriesRes, distancesRes, participantsRes, participantTypesRes] = results.map(r => r.status === 'fulfilled' ? r.value : null);

    if (!raceRes) {
      const errorDetail = (results[0] as PromiseRejectedResult)?.reason?.message || 'Carrera no encontrada';
      throw new Error(`SonicJS Error: ${errorDetail}`);
    }

    const race = raceRes?.data || null;
    
    // Contar los participantes registrados (excepto padrinos)
    const rawParticipants = participantsRes?.data || [];
    const raceParticipants = rawParticipants.filter((p: any) => {
      const pRaceId = p.data?.race || p.data?.raceId;
      return pRaceId === raceId;
    });
    const registeredRunnersCount = raceParticipants.filter((p: any) => 
      p.data?.participantType !== 'padrino' && 
      p.data?.bibNumber
    ).length;

    const categories = (categoriesRes?.data || [])
      // SonicJS no filtra por campos personalizados vía query params — filtrar manualmente
      .filter((item: any) => item.status === 'published' && (item.data?.race === raceId || item.data?.race === undefined))
      .map((item: any) => ({
        id: item.id,
        name: item.data?.title || item.title || 'Sin nombre',
        minAge: item.data?.minAge,
        maxAge: item.data?.maxAge,
        gender: item.data?.gender,
      }));
    const distances = (distancesRes?.data || [])
      // Solo incluir distancias cuyo campo 'race' apunte a esta carrera exacta
      .filter((item: any) => item.status === 'published' && item.data?.race === raceId)
      .map((item: any) => ({
        id: item.id,
        name: item.data?.title || item.title || 'Sin nombre',
        price: item.data?.price ?? null,
        kilometers: item.data?.kilometers ?? null,
      }));

    // Tipos de participante configurados para esta carrera (SonicJS no filtra por campos custom)
    const participantTypes = (participantTypesRes?.data || [])
      .filter((item: any) => item.status === 'published' && item.data?.race === raceId)
      .map((item: any) => ({
        key: item.data?.key || (item.data?.title || item.title || '').toLowerCase().replace(/\s+/g, '_'),
        title: item.data?.title || item.title || 'Sin nombre',
        order: Number(item.data?.order) || 0,
        enabled: item.data?.enabled !== false,
        categoryKeyword: item.data?.categoryKeyword || '',
        distanceKeyword: item.data?.distanceKeyword || '',
      }))
      .sort((a: any, b: any) => a.order - b.order);

    return new Response(JSON.stringify({ race, categories, distances, participantTypes, registeredRunnersCount }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ 
      message: error.message || 'Error desconocido',
      env_url: env?.SONICJS_API_URL ? 'PRESENT' : 'MISSING'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
