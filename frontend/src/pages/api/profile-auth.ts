import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { verifyCodeAndGetRunner, verifySessionAndGetRunner } from '../../lib/profile-helpers';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { code, sessionToken } = body;

    if (!code && !sessionToken) {
      return new Response(JSON.stringify({ ok: false, error: 'Se requiere código o sessionToken' }), { status: 400 });
    }

    const { runner } = sessionToken
      ? await verifySessionAndGetRunner(sessionToken, env)
      : await verifyCodeAndGetRunner(code, env);

    return new Response(JSON.stringify({
      ok: true,
      runner: { id: runner.id, collectionId: runner.collectionId, ...runner.data },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (error: any) {
    const status = error.message?.includes('expirada') || error.message?.includes('inválida') ? 401 : 404;
    return new Response(JSON.stringify({ ok: false, error: error.message || 'Error interno' }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
