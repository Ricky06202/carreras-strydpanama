import type { APIRoute } from 'astro';
import { apiFetch } from '../../../lib/api';
import { env } from 'cloudflare:workers';

export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const raceId = url.searchParams.get('raceId');

    const result = await apiFetch(`/api/collections/registration_codes/content?limit=1000${raceId ? `&filters[race]=${raceId}` : ''}`, env, { method: 'GET' });
    
    const codes = result.data || [];
    const stats: any = {};
    const rawCodes: any = [];
    
    codes.forEach((c: any) => {
        const d = c.data || {};
        const vendor = d.vendor || 'Desconocido';
        const batchId = d.batchId || 'Sin Lote';
        const status = d.status || (d.used ? 'redeemed' : 'generated');

        const key = `${vendor}___${batchId}`;
        
        if (!stats[key]) {
            stats[key] = { vendor, batchId, generated: 0, sold: 0, redeemed: 0, total: 0 };
        }
        
        stats[key].total++;
        if (status === 'generated') stats[key].generated++;
        else if (status === 'sold') stats[key].sold++;
        else if (status === 'redeemed') stats[key].redeemed++;
        else stats[key].generated++;

        rawCodes.push({
          id: c.id,
          title: d.title,
          code: d.code,
          vendor: vendor,
          batchId: batchId,
          status: status,
          raceId: d.race
        });
    });

    const statsArray = Object.values(stats);

    return new Response(JSON.stringify({ success: true, stats: statsArray, rawCount: codes.length, codes: rawCodes }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || 'Error al obtener estadísticas del monitor' }), {
      status: 500
    });
  }
};
