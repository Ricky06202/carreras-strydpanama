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
      api.getDistances(env, raceId)
    ]);

    const [raceRes, categoriesRes, distancesRes] = results.map(r => r.status === 'fulfilled' ? r.value : null);

    if (!raceRes) {
      const errorDetail = (results[0] as PromiseRejectedResult)?.reason?.message || 'Carrera no encontrada';
      throw new Error(`SonicJS Error: ${errorDetail}`);
    }

    const race = raceRes?.data || null;
    const categories = (categoriesRes?.data || []).map((item: any) => ({
      id: item.id,
      name: item.data?.title || item.title || 'Sin nombre'
    }));
    const distances = (distancesRes?.data || []).map((item: any) => ({
      id: item.id,
      name: item.data?.title || item.title || 'Sin nombre'
    }));

    return new Response(JSON.stringify({ race, categories, distances }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
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
