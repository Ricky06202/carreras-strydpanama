import type { APIRoute } from 'astro';
import { apiFetch } from '../../../lib/api';
import { env } from 'cloudflare:workers';

export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const raceId = url.searchParams.get('raceId');

    const result = await apiFetch(`/api/collections/registration_codes/content?limit=5000`, env, { method: 'GET' });

    // SonicJS IGNORA los params filters[...] (devuelve todo) => filtrar aqui.
    // Bug: "Filtrar por Carrera" del monitor de codigos no filtraba nada.
    const codes = (result.data || []).filter((c: any) =>
      c.status === 'published' && (!raceId || (c.data?.race || '') === raceId)
    );
    const stats: any = {};
    const rawCodes: any = [];
    
    codes.forEach((c: any) => {
        const d = c.data || {};
        const vendor = d.vendor || 'Desconocido';
        const batchId = d.batchId || 'Sin Lote';
        const status = d.status || (d.used ? 'redeemed' : 'generated');

        const key = `${vendor}___${batchId}`;
        
        if (!stats[key]) {
            stats[key] = { vendor, batchId, generated: 0, sold: 0, redeemed: 0, total: 0, allowedType: d.allowedType || 'all', padrinoTotal: 0, padrinoRedeemed: 0, freeTotal: 0, freeRedeemed: 0 };
        }

        const isPadrinoCode = d.isPadrinoCode === true;
        const isFreeCode = d.isFreeCode === true && !isPadrinoCode;

        if (isFreeCode) {
            stats[key].freeTotal++;
            if (status === 'redeemed') stats[key].freeRedeemed++;
        } else if (isPadrinoCode) {
            // Códigos de padrino: contados aparte, fuera de la contabilidad de ventas del lote
            stats[key].padrinoTotal++;
            if (status === 'redeemed') stats[key].padrinoRedeemed++;
        } else {
            stats[key].total++;
            if (status === 'generated') stats[key].generated++;
            else if (status === 'sold') stats[key].sold++;
            else if (status === 'redeemed') stats[key].redeemed++;
            else stats[key].generated++;
        }

        rawCodes.push({
          id: c.id,
          title: d.title,
          code: d.code,
          vendor: vendor,
          batchId: batchId,
          status: status,
          raceId: d.race,
          allowedType: d.allowedType || 'all',
          isPadrinoCode: isPadrinoCode,
          isFreeCode: isFreeCode
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
