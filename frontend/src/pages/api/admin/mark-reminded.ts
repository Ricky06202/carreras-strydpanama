import type { APIRoute } from 'astro';
import { getAuthToken } from '../../../lib/api';
import { env } from 'cloudflare:workers';

// Marca participantes como recordados hoy. El navegador llama a este endpoint
// en chunk de <=20 ids para respetar el limite de subrequests de Cloudflare (50).
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json().catch(() => ({})) as any;
    const ids: string[] = Array.isArray(body.ids) ? body.ids.slice(0, 20) : [];
    if (ids.length === 0) return new Response(JSON.stringify({ error: 'ids requerido' }), { status: 400 });
    const timestamp = Number(body.timestamp) || Date.now();

    const token = await getAuthToken(env);
    const baseUrl = String(env.SONICJS_API_URL || '').replace(/\/$/, '');
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };

    let marked = 0;
    const failed: string[] = [];
    for (const id of ids) {
      try {
        const res = await fetch(`${baseUrl}/api/content/${id}`, { headers });
        const j = await res.json().catch(() => ({}));
        const item = j?.data;
        if (!item || !item.id) { failed.push(id); continue; }
        const colId = item.collectionId || 'col-participants-93d1ac21';
        const put = await fetch(`${baseUrl}/api/content/${id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            id: item.id,
            collectionId: colId,
            collection_id: colId,
            title: item.title,
            status: 'published',
            data: { ...(item.data || {}), lastReminderAt: timestamp }
          })
        });
        if (put.ok) marked++; else failed.push(id);
      } catch {
        failed.push(id);
      }
    }

    return new Response(JSON.stringify({ success: marked > 0, marked, failed }), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};
