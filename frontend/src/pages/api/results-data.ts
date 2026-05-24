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

    const raceDateStr = raceRes?.data?.date || raceRes?.date || '';
    const getAge = (birthDateStr: string) => {
      if (!birthDateStr) return null;
      const birthYear = new Date(birthDateStr).getFullYear();
      const raceYear = raceDateStr ? new Date(raceDateStr).getFullYear() : 2026;
      return isNaN(birthYear) ? null : raceYear - birthYear;
    };

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
    const totalFinished = finishedParts.filter((p: any) => Number(p.data?.finishTime) > 0).length;
    const totalMissing = totalRunners - totalFinished;
    const progressPct = totalRunners > 0 ? Math.round((totalFinished / totalRunners) * 100) : 0;

    const usedCats = new Set<string>();
    const allFinishersMapped = finishedParts
      .sort((a: any, b: any) => {
        const tA = Number(a.data?.finishTime);
        const tB = Number(b.data?.finishTime);
        if (tA === -1 && tB !== -1) return 1;
        if (tA !== -1 && tB === -1) return -1;
        return tA - tB;
      })
      .map((p: any, i: number) => {
        const catId = p.data?.category || p.data?.categoryId || '';
        const catName = p.data?.categoryName || categoryMap[catId] || 'General';
        const rawDistName = p.data?.distanceName || distanceMap[p.data?.distance] || 'General';
        const distName = formatDistanceName(rawDistName);
        const gender = (p.data?.gender || '').toLowerCase();
        
        return {
          pos: Number(p.data?.finishTime) > 0 ? i + 1 : '—',
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
          age: getAge(p.data?.birthDate),
          gender: gender === 'm' ? 'masculino' : gender === 'f' ? 'femenino' : gender,
          registrationType: p.data?.registrationType || 'individual',
        };
      });

    // Identificar ganadores absolutos (excluyendo DNF y equipos)
    const finishedIndividuals = allFinishersMapped.filter((f: any) => f.finishTime > 0 && f.registrationType !== 'team');
    const absoluteMale = finishedIndividuals.find((f: any) => f.gender === 'masculino');
    const absoluteFemale = finishedIndividuals.find((f: any) => f.gender === 'femenino');
    const absoluteMaleId = absoluteMale ? absoluteMale.id : null;
    const absoluteFemaleId = absoluteFemale ? absoluteFemale.id : null;

    // Calcular posición por categoría excluyendo ganadores absolutos y DNF
    const groups: Record<string, any[]> = {};
    allFinishersMapped.forEach((x: any) => {
      const isAbsolute = x.id === absoluteMaleId || x.id === absoluteFemaleId;
      if (isAbsolute) {
        x.catPos = 'Absoluto';
      } else if (x.finishTime > 0) {
        const key = `${x.distanceName}|||${x.categoryName}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(x);
        x.catPos = groups[key].length;
      } else {
        x.catPos = '—';
      }
    });

    allFinishersMapped.forEach((x: any) => {
      const isAbsolute = x.catPos === 'Absoluto';
      if (isAbsolute) {
        x.totalCat = 0;
      } else {
        const key = `${x.distanceName}|||${x.categoryName}`;
        x.totalCat = groups[key] ? groups[key].length : 0;
      }
    });

    // Lógica de equipos
    const teamMap: Record<string, any[]> = {};
    for (const f of allFinishersMapped) {
      if (f.teamName && f.registrationType === 'team') {
        if (!teamMap[f.teamName]) {
          teamMap[f.teamName] = [];
        }
        teamMap[f.teamName].push(f);
      }
    }

    // Filtrar finalistas individuales (excluir equipos) y recalcular posiciones generales
    let finishIdx = 0;
    const finishers = allFinishersMapped
      .filter(f => f.registrationType !== 'team')
      .map((f) => {
        usedCats.add(f.categoryName);
        if (f.finishTime > 0) {
          finishIdx++;
          return { ...f, pos: finishIdx };
        } else {
          return { ...f, pos: '—' };
        }
      });

    const categoryNames = [...usedCats].sort();

    const teamData = Object.entries(teamMap).map(([name, members]) => {
      const hasDnf = members.some((m: any) => m.finishTime === -1);
      const totalTime = hasDnf ? -1 : members.reduce((s: number, m: any) => s + m.finishTime, 0);
      const complete = members.length === 4; // Total 4 miembros por equipo
      return { 
        name, 
        members, 
        totalTime, 
        complete, 
        hasDnf,
        totalMembers: members.length 
      };
    })
    .sort((a, b) => {
      const aScore = a.complete && !a.hasDnf ? 1 : a.complete ? 2 : 3;
      const bScore = b.complete && !b.hasDnf ? 1 : b.complete ? 2 : 3;
      if (aScore !== bScore) return aScore - bScore;

      if (a.totalTime === -1 && b.totalTime !== -1) return 1;
      if (a.totalTime !== -1 && b.totalTime === -1) return -1;
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
