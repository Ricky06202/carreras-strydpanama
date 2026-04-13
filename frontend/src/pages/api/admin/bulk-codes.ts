import type { APIRoute } from 'astro';
import { apiFetch } from '../../../lib/api';
import { env } from 'cloudflare:workers';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { vendor, raceId, quantity, allowedType } = body;
    
    if (!vendor || !raceId || !quantity || quantity < 1 || quantity > 100) {
      return new Response(JSON.stringify({ error: 'Parámetros inválidos' }), { status: 400 });
    }

    const todayDate = new Date().toISOString().split('T')[0];
    const shortVendor = vendor.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X');
    const batchId = `${shortVendor}-${todayDate}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const codes = [];
    // Omitimos letras que se pueden confundir con números: O, I, 0, 1
    const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; 

    for (let i = 0; i < quantity; i++) {
        let codeStr = '';
        for (let j = 0; j < 6; j++) {
            codeStr += characters.charAt(Math.floor(Math.random() * characters.length));
        }

        const payload = {
          collectionId: 'col-registration_codes-469bc379',
          collection_id: 'col-registration_codes-469bc379',
          title: `TKT-${codeStr}`,
          status: 'published',
          data: {
              title: `TKT-${codeStr}`,
              code: codeStr,
              race: raceId,
              vendor: vendor,
              batchId: batchId,
              status: 'generated',
              allowedType: allowedType || 'all'
          }
        };

        const result = await apiFetch(`/api/content`, env, {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        codes.push(result);
    }

    return new Response(JSON.stringify({ success: true, batchId, codesGenerated: codes.length }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Error al generar lotes de codigos:', error);
    return new Response(JSON.stringify({ error: error.message || 'Error al generar los códigos' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
