import type { APIRoute } from 'astro';
import { api } from '../../../lib/api';
import { env } from 'cloudflare:workers';

// Whitelist de dorsales + estado del cronómetro para el dispositivo bibcam.
// Auth opcional con X-Timing-Key (igual que register-finish-camera).

export const GET: APIRoute = async ({ request }) => {
  const json = (obj: any, status = 200) => new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache' },
  });

  try {
    const expected = env.TIMING_API_KEY;
    if (expected && request.headers.get('X-Timing-Key') !== expected) {
      return json({ error: 'X-Timing-Key inválida' }, 401);
    }

    const url = new URL(request.url);
    const raceId = url.searchParams.get('raceId');
    if (!raceId) return json({ error: 'Falta raceId' }, 400);

    const [raceRes, participantsRes] = await Promise.all([
      api.getRace(env, raceId),
      api.getParticipants(env, raceId),
    ]);

    const raceData = raceRes?.data?.data || raceRes?.data || {};

    const bibs = (participantsRes?.data || [])
      .filter((p: any) => (p.data?.race === raceId || p.data?.raceId === raceId) && p.status === 'published')
      .filter((p: any) => p.data?.bibNumber !== undefined && p.data?.bibNumber !== null && p.data?.bibNumber !== '')
      .map((p: any) => ({
        bib: Number(p.data.bibNumber),
        name: `${p.data?.firstName || ''} ${p.data?.lastName || ''}`.trim() || p.title || '',
        hasFinish: p.data?.finishTime !== undefined && p.data?.finishTime !== null && p.data?.finishTime !== '',
      }))
      .sort((a: any, b: any) => a.bib - b.bib);

    return json({
      success: true,
      raceId,
      timerStart: Number(raceData.timerStart) || null,
      timerStop: Number(raceData.timerStop) || null,
      status: raceData.status || '',
      bibs,
    });

  } catch (error: any) {
    return json({ error: error.message || 'Error al obtener dorsales' }, 500);
  }
};
