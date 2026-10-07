import type { APIRoute } from 'astro';
import { apiFetch } from '../../../lib/api';
import { env } from 'cloudflare:workers';

const COLLECTION_ID = 'col-financial_expenses-d1d2fdf3';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { raceId, title, beneficiary, amount, payDate, method, reference, notes } = body;

    if (!raceId || !title || amount === undefined || !payDate) {
      return new Response(JSON.stringify({ error: 'Faltan campos obligatorios (carrera, referencia, monto, fecha)' }), { status: 400 });
    }

    const data = {
      title,
      race: raceId,
      beneficiary: beneficiary || '',
      amount: Number(amount),
      payDate,
      method: method || 'Yappy',
      reference: reference || '',
      notes: notes || '',
    };

    const result = await apiFetch('/api/content', env, {
      method: 'POST',
      body: JSON.stringify({
        collectionId: COLLECTION_ID,
        collection_id: COLLECTION_ID,
        title,
        status: 'published',
        data,
      }),
    });

    return new Response(JSON.stringify({ success: true, result }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || 'Error al registrar pago saliente' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
