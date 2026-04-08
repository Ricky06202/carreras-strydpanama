import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { apiFetch } from '../../lib/api';
import { verifyCodeAndGetRunner } from '../../lib/profile-helpers';
import { hashPassword, generateSessionToken, sessionExpiry } from '../../lib/auth';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { code, password } = await request.json();

    if (!code || !password || typeof password !== 'string' || password.length < 8) {
      return new Response(JSON.stringify({ ok: false, error: 'Código y contraseña (mínimo 8 caracteres) son requeridos' }), { status: 400 });
    }

    const { runner, colId } = await verifyCodeAndGetRunner(code, env);

    // Prevent re-registration if already has a password
    if (runner.data?.passwordHash) {
      return new Response(JSON.stringify({ ok: false, error: 'Esta cuenta ya tiene contraseña. Usa el inicio de sesión.' }), { status: 409 });
    }

    const { hash, salt } = await hashPassword(password);
    const token = generateSessionToken();
    const expiry = sessionExpiry();

    await apiFetch(`/api/content/${runner.id}`, env, {
      method: 'PUT',
      body: JSON.stringify({
        id: runner.id,
        collectionId: colId,
        collection_id: colId,
        title: runner.title,
        status: 'published',
        data: {
          ...runner.data,
          passwordHash: hash,
          passwordSalt: salt,
          sessionToken: token,
          sessionExpiry: expiry,
        },
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
