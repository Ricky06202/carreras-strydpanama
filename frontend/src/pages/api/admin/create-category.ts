import type { APIRoute } from 'astro';
import { apiFetch } from '../../../lib/api';
import { env } from 'cloudflare:workers';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { title, minAge, maxAge, gender, raceId } = body;

    if (!title || minAge === undefined || maxAge === undefined || !gender) {
      return new Response(JSON.stringify({ error: 'Faltan campos obligatorios' }), { status: 400 });
    }

    const payload = {
      collectionId: 'col-categories-26d3d058',
      collection_id: 'col-categories-26d3d058',
      title: title,
      status: 'published',
      data: {
        title: title,
        minAge: Number(minAge),
        maxAge: Number(maxAge),
        gender: gender,
        race: raceId || '',
      }
    };

    const result = await apiFetch('/api/content', env, {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    return new Response(JSON.stringify({ success: true, result }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || 'Error al crear categoría' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
