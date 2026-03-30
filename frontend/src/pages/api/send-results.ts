import type { APIRoute } from 'astro';
import { apiFetch } from '../../lib/api';
import { env } from 'cloudflare:workers';

// Construir el certificado HTML para email
function buildCertificateEmail(participant: any, race: any, position: number | null): string {
  const name = `${participant.firstName || ''} ${participant.lastName || ''}`.trim();
  const raceName = race?.data?.title || race?.title || 'Carrera STRYD Panama';
  const raceDate = race?.data?.date ? new Date(race.data.date).toLocaleDateString('es-PA', { year: 'numeric', month: 'long', day: 'numeric' }) : '';
  const distance = participant.distanceName || participant.distance || '';
  const bibNumber = participant.bibNumber || '';
  const finishTimeSecs = participant.finishTime;
  const photoUrl = participant.photoUrl || '';

  let finishTimeStr = 'No registrado';
  if (finishTimeSecs) {
    const secs = Number(finishTimeSecs);
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    finishTimeStr = h > 0
      ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
      : `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }

  const positionBadge = position
    ? `<div style="display:inline-block;background:#FF6B00;color:white;padding:6px 20px;border-radius:20px;font-weight:bold;font-size:14px;margin-bottom:16px;">
        🏅 Posición #${position} en tu categoría
       </div>`
    : '';

  const photoSection = photoUrl
    ? `<img src="${photoUrl}" alt="Foto del corredor" style="width:100px;height:100px;border-radius:50%;object-fit:cover;border:3px solid #FF6B00;margin-bottom:16px;" />`
    : `<div style="width:100px;height:100px;border-radius:50%;background:#1a1a1a;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:40px;border:3px solid #FF6B00;">🏃</div>`;

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;">

    <!-- Header -->
    <div style="background:#000000;padding:32px;text-align:center;">
      <div style="color:#FF6B00;font-size:28px;font-weight:900;letter-spacing:2px;">STRYD PANAMA</div>
      <div style="color:#ffffff;font-size:14px;margin-top:4px;opacity:0.8;">Carreras Pedestres</div>
    </div>

    <!-- Certificate Body -->
    <div style="padding:48px 40px;text-align:center;">
      <div style="color:#888;font-size:13px;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px;">Certificado de Participación</div>
      <div style="color:#000;font-size:36px;font-weight:900;line-height:1.1;margin-bottom:24px;">${raceName}</div>
      ${raceDate ? `<div style="color:#666;font-size:15px;margin-bottom:32px;">${raceDate}</div>` : ''}

      <!-- Photo -->
      <div style="text-align:center;margin-bottom:24px;">${photoSection}</div>

      <!-- Name -->
      <div style="color:#FF6B00;font-size:24px;font-weight:900;margin-bottom:8px;">${name}</div>
      ${distance ? `<div style="color:#666;font-size:14px;margin-bottom:16px;">Distancia: ${distance}</div>` : ''}
      ${positionBadge}

      <!-- Stats Grid -->
      <div style="display:flex;justify-content:center;gap:0;margin:32px 0;border:1px solid #eee;border-radius:12px;overflow:hidden;">
        <div style="flex:1;padding:20px;border-right:1px solid #eee;text-align:center;">
          <div style="color:#888;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Dorsal</div>
          <div style="color:#000;font-size:28px;font-weight:900;color:#FF6B00;">#${bibNumber}</div>
        </div>
        <div style="flex:1;padding:20px;text-align:center;">
          <div style="color:#888;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Tiempo</div>
          <div style="color:#000;font-size:24px;font-weight:900;">${finishTimeStr}</div>
        </div>
        ${position ? `<div style="flex:1;padding:20px;border-left:1px solid #eee;text-align:center;">
          <div style="color:#888;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Posición</div>
          <div style="color:#FF6B00;font-size:28px;font-weight:900;">#${position}</div>
        </div>` : ''}
      </div>

      <div style="color:#999;font-size:13px;margin-top:16px;">¡Gracias por ser parte de la comunidad STRYD Panama!</div>
    </div>

    <!-- Footer -->
    <div style="background:#0f0f0f;padding:24px;text-align:center;">
      <div style="color:#FF6B00;font-size:12px;font-weight:bold;letter-spacing:1px;">STRYD PANAMA</div>
      <div style="color:#666;font-size:11px;margin-top:4px;">carreras.strydpanama.com</div>
    </div>
  </div>
</body>
</html>`;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const { participantId } = await request.json();
    if (!participantId) {
      return new Response(JSON.stringify({ error: 'participantId requerido' }), { status: 400 });
    }

    const resendKey = (env as any).RESEND_API_KEY;
    if (!resendKey) {
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY no configurada' }), { status: 500 });
    }

    // 1. Obtener datos del participante
    const partRes = await apiFetch(`/api/content/${participantId}`, env, { method: 'GET' });
    const participant = partRes?.data?.data;
    if (!participant) {
      return new Response(JSON.stringify({ error: 'Participante no encontrado' }), { status: 404 });
    }

    const email = participant.email;
    if (!email) {
      return new Response(JSON.stringify({ error: 'El participante no tiene email registrado' }), { status: 400 });
    }

    // 2. Obtener datos de la carrera
    const raceId = participant.race;
    let race = null;
    if (raceId) {
      const raceRes = await apiFetch(`/api/content/${raceId}`, env, { method: 'GET' });
      race = raceRes?.data;
    }

    // 3. Calcular posición en categoría (opcional)
    let position: number | null = null;
    if (raceId && participant.finishTime) {
      try {
        const allParts = await apiFetch(`/api/collections/participants/content?limit=1000`, env, { method: 'GET' });
        const raceParts = (allParts?.data || [])
          .filter((p: any) => p.data?.race === raceId && p.data?.finishTime && p.data?.distance === participant.distance)
          .sort((a: any, b: any) => Number(a.data.finishTime) - Number(b.data.finishTime));
        const idx = raceParts.findIndex((p: any) => p.id === participantId);
        if (idx !== -1) position = idx + 1;
      } catch { /* posición opcional */ }
    }

    // 4. Construir y enviar email
    const name = `${participant.firstName || ''} ${participant.lastName || ''}`.trim();
    const raceName = race?.data?.title || 'tu carrera';
    const htmlContent = buildCertificateEmail(participant, race, position);

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'STRYD Panama <no-reply@strydpanama.com>',
        to: [email],
        subject: `🎽 Tu certificado de participación — ${raceName}`,
        html: htmlContent,
      }),
    });

    const emailData = await emailRes.json();
    if (!emailRes.ok) {
      throw new Error(`Resend error: ${JSON.stringify(emailData)}`);
    }

    return new Response(JSON.stringify({ success: true, emailId: emailData.id }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
