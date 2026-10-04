import type { APIRoute } from 'astro';
import { api, apiFetch } from '../../../lib/api';
import { env } from 'cloudflare:workers';

// Registro de llegadas desde el sistema de cámara (bibcam).
// No interfiere con /api/admin/register-finish (método manual/scanner).
// Auth: header X-Timing-Key debe coincidir con env TIMING_API_KEY.
// Si TIMING_API_KEY no está configurado, se permite (modo dev) con warning.

const timingKeyOk = (request: Request): boolean => {
  const expected = env.TIMING_API_KEY;
  if (!expected) return true; // modo dev: no se ha configurado la clave aún
  return request.headers.get('X-Timing-Key') === expected;
};

export const POST: APIRoute = async ({ request }) => {
  const json = (obj: any, status = 200) => new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache' },
  });

  try {
    if (!timingKeyOk(request)) {
      return json({ error: 'X-Timing-Key inválida' }, 401);
    }

    const body = await request.json();
    const { raceId, bibNumber, timerUsed, confidence } = body;
    const finishTime = Number(body.finishTime);

    if (!raceId || !bibNumber || !isFinite(finishTime)) {
      return json({ error: 'Faltan parámetros requeridos (raceId, bibNumber, finishTime)' }, 400);
    }

    // --- Validación de sanidad anti-fraude (el tiempo lo manda la cámara, lo validamos aquí) ---
    const raceRes = await api.getRace(env, raceId);
    const raceData = raceRes?.data?.data || raceRes?.data || {};
    const timerStart = Number(raceData.timerStart);
    if (!timerStart) {
      return json({ error: 'La carrera no tiene un cronómetro iniciado' }, 400);
    }
    const nowSec = Math.floor(Date.now() / 1000);
    // Cap: si la carrera ya fue detenida, hasta 2 min después del stop; si no, hasta ahora + tolerancia de 2 min de reloj
    const elapsedCap = (raceData.timerStop ? Math.max(Number(raceData.timerStop) - timerStart, 0) : nowSec - timerStart) + 120;
    if (finishTime < 0 || finishTime > Math.min(elapsedCap, 12 * 3600)) {
      return json({ error: `finishTime fuera de rango razonable (${finishTime}s; máximo permitido ${Math.floor(Math.min(elapsedCap, 12 * 3600))}s)` }, 400);
    }

    // --- Buscar participante por dorsal dentro de la carrera ---
    const participantsRes = await api.getParticipants(env, raceId);
    if (!participantsRes || !participantsRes.data) {
      throw new Error('Error al consultar los participantes');
    }
    const allParticipants = participantsRes.data;
    const targetBib = Number(bibNumber);

    const participant = allParticipants.find((p: any) => {
      const belongsToRace = p.data?.race === raceId || p.data?.raceId === raceId;
      const hasCorrectBib = p.data?.bibNumber !== undefined && Number(p.data.bibNumber) === targetBib;
      return belongsToRace && hasCorrectBib;
    });

    if (!participant) {
      return json({ error: `Dorsal #${bibNumber} no registrado en esta carrera (rechazado por whitelist)` }, 404);
    }

    // Dedupe: re-detecciones de la misma persona se ignoran silenciosamente (200 duplicate)
    const existing = participant.data?.finishTime;
    if (existing !== undefined && existing !== null && existing !== '') {
      return json({ success: true, duplicate: true, bibNumber: targetBib, finishTime: Number(existing) });
    }

    const currentData = participant.data || {};
    const updatedData = {
      ...currentData,
      finishTime,
      timerUsed: timerUsed || 1,
      timingSource: 'camera',
      timingConfidence: confidence !== undefined ? Number(confidence) : null,
    };

    const payload = {
      id: participant.id,
      collectionId: participant.collectionId || participant.collection_id,
      collection_id: participant.collectionId || participant.collection_id,
      title: participant.title,
      status: 'published',
      data: updatedData
    };

    await apiFetch(`/api/content/${participant.id}`, env, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });

    return json({
      success: true,
      participant: {
        id: participant.id,
        name: participant.title,
        bibNumber: targetBib,
        finishTime,
        timingSource: 'camera'
      }
    });

  } catch (error: any) {
    console.error('Error recording camera finish:', error);
    return json({ error: error.message || 'Error al registrar llegada por cámara' }, 500);
  }
};
