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
    const [raceRes, categoriesRes, distancesRes] = await Promise.all([
      api.getRace(env, raceId),
      api.getCategories(env, raceId),
      api.getDistances(env, raceId)
    ]);

    // Extraemos la data real de las respuestas de SonicJS
    // Según AGENTS.md, la respuesta es { data: [...] } o { data: { ... } }
    const race = raceRes?.data || null;
    const categories = (categoriesRes?.data || []).map((item: any) => ({
      id: item.id,
      name: item.data?.title || item.title || 'Sin nombre'
    }));
    const distances = (distancesRes?.data || []).map((item: any) => ({
      id: item.id,
      name: item.data?.title || item.title || 'Sin nombre'
    }));

    return new Response(JSON.stringify({
      race,
      categories,
      distances
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Error in /api/race-info:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Error al obtener información de la carrera' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
