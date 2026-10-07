import type { APIRoute } from 'astro';
import { apiFetch } from '../../../lib/api';
import { env } from 'cloudflare:workers';

export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const raceId = url.searchParams.get('raceId');

    let endpoint = '/api/collections/financial_expenses/content?limit=5000';
    if (raceId) endpoint += `&race=${encodeURIComponent(raceId)}`;

    const result = await apiFetch(endpoint, env, { method: 'GET' });
    let rows = (result.data || []).filter((r: any) => r.status === 'published');
    if (raceId) rows = rows.filter((r: any) => r.data?.race === raceId);

    const expenses = rows.map((item: any) => ({
      id: item.id,
      title: item.data?.title || item.title || '',
      race: item.data?.race || '',
      beneficiary: item.data?.beneficiary || '',
      amount: Number(item.data?.amount ?? 0),
      payDate: item.data?.payDate || '',
      method: item.data?.method || 'Yappy',
      reference: item.data?.reference || '',
      notes: item.data?.notes || '',
      createdAt: item.created_at,
    }));

    return new Response(JSON.stringify({ expenses }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || 'Error al listar pagos salientes' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
