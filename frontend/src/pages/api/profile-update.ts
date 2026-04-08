import type { APIRoute } from 'astro';
import { apiFetch } from '../../lib/api';
import { env } from 'cloudflare:workers';
import { verifyCodeAndGetRunner, verifySessionAndGetRunner } from '../../lib/profile-helpers';

const ALLOWED_FIELDS = [
  'bio', 'publicProfile', 'publicFields',
  'instagram', 'strava', 'facebook', 'tiktok',
  'bannerUrl', 'galleryPhotos', 'photoUrl',
  'personalRecords', 'favoriteRaces', 'plannedRaces',
  'gearWatch', 'gearShoes', 'gearElectrolyte', 'gearOther',
] as const;

export const POST: APIRoute = async ({ request }) => {
  try {
    const { code, sessionToken, updates } = await request.json();

    if (!updates || (!code && !sessionToken)) {
      return new Response(JSON.stringify({ ok: false, error: 'Se requiere sessionToken o código, más los datos a actualizar' }), { status: 400 });
    }

    const { runner, colId } = sessionToken
      ? await verifySessionAndGetRunner(sessionToken, env)
      : await verifyCodeAndGetRunner(code, env);

    const filtered: Record<string, unknown> = {};
    for (const key of ALLOWED_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(updates, key)) filtered[key] = updates[key];
    }

    await apiFetch(`/api/content/${runner.id}`, env, {
      method: 'PUT',
      body: JSON.stringify({
        id: runner.id,
        collectionId: colId,
        collection_id: colId,
        title: runner.title,
        status: 'published',
        data: { ...runner.data, ...filtered },
      }),
    });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ ok: false, error: error.message || 'Error interno' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
