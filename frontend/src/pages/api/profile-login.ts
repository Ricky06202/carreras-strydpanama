import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { apiFetch } from '../../lib/api';
import { verifyPassword, generateSessionToken, sessionExpiry } from '../../lib/auth';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return new Response(JSON.stringify({ ok: false, error: 'Email y contraseña requeridos' }), { status: 400 });
    }

    const runnersRes = await apiFetch('/api/collections/runners/content?limit=2000', env);
    const runner = (runnersRes?.data || []).find(
      (r: any) => (r.data?.email || '').toLowerCase().trim() === email.toLowerCase().trim()
    );

    if (!runner) {
      // Generic message — don't reveal whether email exists
      return new Response(JSON.stringify({ ok: false, error: 'Email o contraseña incorrectos' }), { status: 401 });
    }

    if (!runner.data?.passwordHash) {
      return new Response(JSON.stringify({ ok: false, error: 'Esta cuenta aún no tiene contraseña. Usa tu código STRYD-XXXX para crear una.' }), { status: 403 });
    }

    const valid = await verifyPassword(password, runner.data.passwordHash, runner.data.passwordSalt);
    if (!valid) {
      return new Response(JSON.stringify({ ok: false, error: 'Email o contraseña incorrectos' }), { status: 401 });
    }

    const token = generateSessionToken();
    const expiry = sessionExpiry();

    // Get collection ID for update
    const collectionsRes = await apiFetch('/api/collections', env);
    const runnersCol = (collectionsRes?.data || []).find((c: any) => c.name === 'runners');
    const colId = runnersCol?.id || runner.collectionId;

    await apiFetch(`/api/content/${runner.id}`, env, {
      method: 'PUT',
      body: JSON.stringify({
        id: runner.id,
        collectionId: colId,
        collection_id: colId,
        title: runner.title,
        status: 'published',
        data: { ...runner.data, sessionToken: token, sessionExpiry: expiry },
      }),
    });

    return new Response(JSON.stringify({
      ok: true,
      sessionToken: token,
      runner: { id: runner.id, ...runner.data },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (error: any) {
    return new Response(JSON.stringify({ ok: false, error: error.message || 'Error interno' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
