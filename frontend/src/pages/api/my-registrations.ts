import type { APIRoute } from 'astro';
import { apiFetch } from '../../lib/api';
import { env } from 'cloudflare:workers';

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const cedula = url.searchParams.get('cedula')?.trim();

  if (!cedula) {
    return new Response(JSON.stringify({ error: 'cedula requerida' }), { status: 400 });
  }

  try {
    // Fetch all participants and filter by cedula
    const partsRes = await apiFetch(
      `/api/collections/participants/content?limit=500&_t=${Date.now()}`, env,
      { method: 'GET', headers: { 'Cache-Control': 'no-cache, no-store', 'Pragma': 'no-cache' } }
    );

    const all = partsRes?.data || [];
    const mine = all.filter((p: any) =>
      (p.data?.cedula || '').toLowerCase().trim() === cedula.toLowerCase()
    );

    if (mine.length === 0) {
      return new Response(JSON.stringify({ found: false, registrations: [] }), {
        status: 200, headers: { 'Content-Type': 'application/json' }
      });
    }

    // Fetch race info and distances for each unique raceId
    const raceIds = [...new Set(mine.map((p: any) => p.data?.race).filter(Boolean))];
    const raceMap: Record<string, any> = {};
    const distMap: Record<string, string> = {};

    await Promise.allSettled(raceIds.map(async (raceId: any) => {
      try {
        const r = await apiFetch(`/api/content/${raceId}`, env, { method: 'GET' });
        if (r?.data) raceMap[raceId] = r.data;
      } catch {}
    }));

    // Fetch all distances to map IDs to names
    try {
      const distsRes = await apiFetch('/api/collections/distances/content?limit=500', env, { method: 'GET' });
      for (const d of (distsRes?.data || [])) {
        distMap[d.id] = d.data?.title || d.title || '';
      }
    } catch {}

    const registrations = mine.map((p: any) => {
      // Generate short confirmation code from participant ID (first 8 hex chars, uppercase)
      const rawId = (p.id || '').replace(/-/g, '');
      const confirmationCode = 'STRYD-' + rawId.slice(0, 8).toUpperCase();

      // Resolve distance name
      const distanceId = p.data?.distance || '';
      const distanceName = p.data?.distanceName || distMap[distanceId] || '';

      return {
        id: p.id,
        confirmationCode,
        bibNumber: p.data?.bibNumber,
        firstName: p.data?.firstName,
        lastName: p.data?.lastName,
        distance: distanceName,
        paymentStatus: p.data?.paymentStatus || 'pending',
        photoUrl: p.data?.photoUrl || '',
        cedula: p.data?.cedula,
        race: raceMap[p.data?.race] ? {
          id: p.data?.race,
          title: raceMap[p.data?.race]?.data?.title || '',
          date: raceMap[p.data?.race]?.data?.date || '',
          imageUrl: raceMap[p.data?.race]?.data?.imageUrl || '',
        } : { id: p.data?.race, title: 'Carrera', date: '', imageUrl: '' },
      };
    });

    return new Response(JSON.stringify({ found: true, registrations }), {
      status: 200, 
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};
