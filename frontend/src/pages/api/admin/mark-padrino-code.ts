import type { APIRoute } from 'astro';
import { apiFetch } from '../../../lib/api';
import { env } from 'cloudflare:workers';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { codeId, isPadrinoCode } = await request.json();
    if (!codeId) return new Response(JSON.stringify({ error: 'codeId requerido' }), { status: 400 });

    const res = await apiFetch(`/api/content/${codeId}`, env, { method: 'GET' });
    const code = res?.data;
    if (!code) return new Response(JSON.stringify({ error: 'Código no encontrado' }), { status: 404 });

    await apiFetch(`/api/content/${codeId}`, env, {
      method: 'PUT',
      body: JSON.stringify({
        id: code.id,
        collectionId: code.collectionId || 'col-registration_codes-469bc379',
        collection_id: code.collectionId || 'col-registration_codes-469bc379',
        title: code.title,
        status: 'published',
        data: { ...code.data, isPadrinoCode: !!isPadrinoCode }
      })
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};
