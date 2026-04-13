import type { APIRoute } from 'astro';
import { apiFetch } from '../../../lib/api';
import { env } from 'cloudflare:workers';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { id } = await request.json();
    if (!id) throw new Error('ID de participante no proporcionado');

    await apiFetch(`/api/content/${id}`, env, { method: 'DELETE' });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || 'Error al eliminar participante' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
