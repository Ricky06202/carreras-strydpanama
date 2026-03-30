import type { APIRoute } from 'astro';
import { apiFetch } from '../../../lib/api';
import { env } from 'cloudflare:workers';

const TEAMS_COLLECTION_ID = 'col-running_teams-5c6748a6';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { names } = await request.json();
    if (!names || !Array.isArray(names) || names.length === 0) {
      return new Response(JSON.stringify({ error: 'Lista de nombres requerida' }), { status: 400 });
    }

    let created = 0;
    let skipped = 0;

    for (const name of names) {
      const trimmed = name.trim();
      if (!trimmed) { skipped++; continue; }

      try {
        await apiFetch('/api/content', env, {
          method: 'POST',
          body: JSON.stringify({
            collectionId: TEAMS_COLLECTION_ID,
            collection_id: TEAMS_COLLECTION_ID,
            title: trimmed,
            status: 'published',
            data: { title: trimmed, isApproved: true }
          })
        });
        created++;
      } catch {
        skipped++;
      }
    }

    return new Response(JSON.stringify({ success: true, created, skipped }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};
