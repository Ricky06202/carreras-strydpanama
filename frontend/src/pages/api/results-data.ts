import type { APIRoute } from 'astro';
import { apiFetch } from '../../lib/api';
import { env } from 'cloudflare:workers';

function formatDistanceName(name: string): string {
  if (!name) return 'General';
  const lower = name.toLowerCase();
  if (lower.includes('1k') || lower.includes('1 k')) return '1k';
  if (lower.includes('5k') || lower.includes('5 k')) return '5k';
  return name;
}


export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const raceId = url.searchParams.get('raceId');

    if (!raceId) {
      return new Response(JSON.stringify({ error: 'Falta el parámetro raceId' }), { status: 400 });
    }

    // Consultamos concurrentemente participantes, distancias, categorías y carrera
    const [partsRes, distsRes, catsRes, raceRes] = await Promise.all([
      apiFetch(`/api/collections/participants/content?limit=2000`, env, { 
        method: 'GET',
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
      }),
      apiFetch(`/api/collections/distances/content?limit=200`, env, { 
        method: 'GET',
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
      }),
      apiFetch(`/api/collections/categories/content?limit=200`, env, { 
        method: 'GET',
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
      }),
      apiFetch(`/api/content/${raceId}`, env, {
        method: 'GET',
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
      }),
    ]);

    const raffleWinnersRaw = raceRes?.data?.raffleWinners || raceRes?.data?.data?.raffleWinners || '';
    let raffleWinners: any[] = [];
    if (raffleWinnersRaw) {
      try {
        raffleWinners = JSON.parse(raffleWinnersRaw);
      } catch (e) {}
    }

    const distanceMap: Record<string, string> = {};
    const categoryMap: Record<string, string> = {};

    const allDists = (distsRes?.data || []).filter((d: any) => d.data?.race === raceId);
    for (const d of allDists) {
      const rawTitle = d.data?.title || d.title || '';
      distanceMap[d.id] = formatDistanceName(rawTitle);
    }
    const distanceNames = [...new Set(Object.values(distanceMap))].sort();

    const allCats = (catsRes?.data || []).filter((c: any) => c.data?.race === raceId || !c.data?.race);
    for (const c of allCats) {
      categoryMap[c.id] = c.data?.title || c.title;
    }

    const allRaceParticipants = (partsRes?.data || []).filter((p: any) => {
      const isCorrectRace = (p.data?.race === raceId || p.data?.raceId === raceId) && p.status === 'published';
      if (!isCorrectRace) return false;
      const isPadrino = p.data?.participantType === 'padrino' || p.data?.isPadrino === true;
      if (isPadrino) return false;
      const isConfirmed = p.data?.paymentStatus === 'Confirmado' || 
                          p.data?.paymentStatus === 'Yappy' || 
                          p.data?.paymentStatus === 'Completado' || 
                          p.data?.paymentStatus === 'Cupon Padrino' || 
                          p.data?.paymentMethod === 'Cupon Padrino';
      const hasBib = p.data?.bibNumber !== undefined && p.data?.bibNumber !== null && p.data?.bibNumber !== '';
      return isConfirmed || hasBib;
    });

    const finishedParts = allRaceParticipants.filter((p: any) => 
      p.data?.finishTime !== undefined && 
      p.data?.finishTime !== null && 
      p.data?.finishTime !== ''
    );

    const totalRunners = allRaceParticipants.length;
    const totalFinished = finishedParts.length;
    const totalMissing = totalRunners - totalFinished;
    const progressPct = totalRunners > 0 ? Math.round((totalFinished / totalRunners) * 100) : 0;

    const usedCats = new Set<string>();
    const finishers = finishedParts
      .sort((a: any, b: any) => Number(a.data.finishTime) - Number(b.data.finishTime))
      .map((p: any, i: number) => {
        const catId = p.data?.category || p.data?.categoryId || '';
        const catName = p.data?.categoryName || categoryMap[catId] || 'General';
        const rawDistName = p.data?.distanceName || distanceMap[p.data?.distance] || 'General';
        const distName = formatDistanceName(rawDistName);
        const gender = (p.data?.gender || '').toLowerCase();
        usedCats.add(catName);
        
        return {
          pos: i + 1,
          id: p.id,
          name: `${p.data?.firstName || ''} ${p.data?.lastName || ''}`.trim(),
          bib: p.data?.bibNumber,
          finishTime: Number(p.data?.finishTime),
          checkpointTime: p.data?.checkpointTime ? Number(p.data.checkpointTime) : null,
          photoUrl: p.data?.photoUrl || '',
          country: p.data?.country || '',
          teamName: p.data?.teamName || '',
          categoryName: catName,
          distanceName: distName,
          gender: gender === 'm' ? 'masculino' : gender === 'f' ? 'femenino' : gender,
          registrationType: p.data?.registrationType || 'individual',
        };
      });

    const categoryNames = [...usedCats].sort();

    // Lógica de equipos
    const teamMap: Record<string, any[]> = {};
    for (const f of finishers) {
      if (f.teamName && f.registrationType === 'team') {
        if (!teamMap[f.teamName]) {
          teamMap[f.teamName] = [];
        }
        teamMap[f.teamName].push(f);
      }
    }

    const teamData = Object.entries(teamMap).map(([name, members]) => {
      const totalTime = members.reduce((s: number, m: any) => s + m.finishTime, 0);
      const complete = members.length === 4; // Total 4 miembros por equipo
      return { 
        name, 
        members, 
        totalTime, 
        complete, 
        totalMembers: members.length 
      };
    })
    .sort((a, b) => {
      if (a.complete && !b.complete) return -1;
      if (!a.complete && b.complete) return 1;
      return a.totalTime - b.totalTime;
    });

    return new Response(JSON.stringify({ 
      success: true, 
      finishers, 
      distanceNames, 
      categoryNames, 
      teamData,
      totalRunners,
      totalFinished,
      totalMissing,
      progressPct,
      raffleWinners
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || 'Error al obtener datos de resultados' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
