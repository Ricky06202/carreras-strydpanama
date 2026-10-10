import type { APIRoute } from 'astro';
import { getAuthToken } from '../../../lib/api';
import { env } from 'cloudflare:workers';

// Envío de correos masivos con Resend, respetando el cupo diario (100/día) y
// usando lotes de 25 SIN bcc (el bcc duplica el consumo del cupo).
// Escribe cada lote en la colección email_log (bitácora + contador diario).

const FROM = 'Carreras STRYD <carreras@strydpanama.com>';
const SITE = 'https://carreras.strydpanama.com';
const DAILY_QUOTA = 100;
const LOG_COLLECTION_ID = 'col-email_log-97d1ec29';
const MAX_BATCH = 100;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function todayPanama(): string {
  try {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Panama' });
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}

function isPreinscrito(d: any): boolean {
  return d?.registrationStatus === 'preinscrito' || d?.paymentStatus === 'Preinscrito';
}

function hasBib(d: any): boolean {
  return d?.bibNumber !== undefined && d?.bibNumber !== null && String(d.bibNumber).trim() !== '';
}

function fullName(d: any): string {
  const n = `${d?.firstName || ''} ${d?.lastName || ''}`.trim();
  return n || d?.title || '';
}

function firstName(d: any): string {
  return String(d?.firstName || (fullName(d).split(' ')[0] || '')).trim() || 'corredor(a)';
}

function renderHtml(body: string): string {
  // El cuerpo admite etiquetas simples y saltos de línea: se respetan con white-space:pre-wrap.
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;background:#f5f5f5;padding:24px">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e0e0e0">
      <div style="background:#000000;padding:18px 24px">
        <span style="color:#FF6B00;font-size:20px;font-weight:900;letter-spacing:2px">STRYD PANAMA</span>
      </div>
      <div style="padding:28px 24px;font-size:15px;color:#333;line-height:1.6;white-space:pre-wrap">${body}</div>
      <div style="background:#0f0f0f;padding:14px 24px;text-align:center">
        <span style="color:#8595a7;font-size:12px">Carreras STRYD Panamá · ${SITE.replace('https://', '')} · No requiere respuesta</span>
      </div>
    </div>
  </div>`;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json().catch(() => ({})) as any;
    const audience = String(body.audience || '').trim();
    const raceId = body.raceId ? String(body.raceId) : '';
    const participantIds: string[] = Array.isArray(body.participantIds) ? body.participantIds.map(String) : [];
    const preview = body.preview === true;
    const offset = Math.max(0, Number(body.offset) || 0);
    const batchSize = MAX_BATCH;
    const campaignId = body.campaignId ? String(body.campaignId) : `camp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // --- Envio de PRUEBA: no consume cupo ni escribe bitacora ---
    if (body.test === true) {
      const tkey = (env as any).RESEND_API_KEY;
      if (!tkey) return new Response(JSON.stringify({ error: 'Falta el secreto RESEND_API_KEY en el worker' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
      const testTo = String(body.testEmail || '').trim();
      if (!EMAIL_RE.test(testTo)) return new Response(JSON.stringify({ error: 'Correo de prueba invalido' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      const tSubject = String(body.subject || '').trim() || 'Prueba - Carreras Stryd Panama';
      const tBody = String(body.body || '') || 'Este es un correo de prueba del panel de Correos.';
      const tRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tkey },
        body: JSON.stringify({ from: FROM, to: testTo, subject: tSubject, html: renderHtml(tBody) }),
      });
      const tJson = await tRes.json().catch(() => ({}));
      if (!tRes.ok) return new Response(JSON.stringify({ error: tJson?.message || ('HTTP ' + tRes.status) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
      return new Response(JSON.stringify({ success: true, test: true, to: testTo }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    if (!['todos', 'inscritos', 'preinscritos', 'individual'].includes(audience)) {
      return new Response(JSON.stringify({ error: 'Tipo de destinatarios inválido' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    if (audience === 'inscritos' && !raceId) {
      return new Response(JSON.stringify({ error: 'Para enviar solo a inscritos debes elegir una carrera.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    if (audience === 'individual' && participantIds.length === 0) {
      return new Response(JSON.stringify({ error: 'Selecciona al menos una persona para el envío individual.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const key = (env as any).RESEND_API_KEY;
    if (!key) return new Response(JSON.stringify({ error: 'Falta el secreto RESEND_API_KEY en el worker' }), { status: 500, headers: { 'Content-Type': 'application/json' } });

    const token = await getAuthToken(env);
    const baseUrl = String(env.SONICJS_API_URL || '').replace(/\/$/, '');
    const authHeaders = {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    };

    // --- Resolver destinatarios desde la colección participants ---
    const [partRes, racesRes, logRes] = await Promise.all([
      fetch(`${baseUrl}/api/collections/participants/content?limit=5000&_t=${Date.now()}`, { headers: authHeaders }).then(r => r.json()).catch(() => ({})),
      fetch(`${baseUrl}/api/collections/races/content?limit=200&_t=${Date.now()}`, { headers: authHeaders }).then(r => r.json()).catch(() => ({})),
      fetch(`${baseUrl}/api/collections/email_log/content?limit=5000&_t=${Date.now()}`, { headers: authHeaders }).then(r => r.json()).catch(() => ({})),
    ]);

    const racesById: Record<string, any> = {};
    (racesRes?.data || []).forEach((r: any) => { racesById[r.id] = r.data || {}; });

    const today = todayPanama();
    const todaySent = (logRes?.data || [])
      .filter((c: any) => String(c?.data?.date || '').slice(0, 10) === today)
      .reduce((s: number, c: any) => s + (Number(c?.data?.sent) || 0), 0);
    const cupoRestante = Math.max(0, DAILY_QUOTA - todaySent);

    const selectedSet = new Set(participantIds);
    let skippedNoEmail = 0;
    let skippedBadEmail = 0;

    const recipients: { id: string; email: string; name: string; first: string }[] = [];
    (partRes?.data || []).forEach((c: any) => {
      if (c?.status === 'deleted') return;
      const d = c.data || {};
      const pRace = d.race || d.raceId || '';
      const pre = isPreinscrito(d);
      let match = false;
      if (audience === 'todos') match = true;
      else if (audience === 'inscritos') match = !pre && hasBib(d) && (!raceId || pRace === raceId);
      else if (audience === 'preinscritos') match = pre && (!raceId || pRace === raceId);
      else if (audience === 'individual') match = selectedSet.has(String(c.id));
      if (!match) return;

      const email = String(d.email || '').trim();
      if (!email) { skippedNoEmail++; return; }
      if (!EMAIL_RE.test(email)) { skippedBadEmail++; return; }
      recipients.push({ id: String(c.id), email, name: fullName(d) || email, first: firstName(d) });
    });

    recipients.sort((a, b) => a.id.localeCompare(b.id));

    const raceTitle = raceId ? (racesById[raceId]?.title || raceId) : '';

    if (preview) {
      return new Response(JSON.stringify({
        success: true,
        preview: true,
        audience,
        raceTitle,
        total: recipients.length,
        skippedNoEmail,
        skippedBadEmail,
        todaySent,
        cupoRestante,
        quota: DAILY_QUOTA,
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // --- Validar contenido ---
    const subject = String(body.subject || '').trim();
    let rawBody = String(body.body || '');
    if (!subject) return new Response(JSON.stringify({ error: 'El asunto es obligatorio' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    if (!rawBody.trim()) return new Response(JSON.stringify({ error: 'El cuerpo del correo está vacío' }), { status: 400, headers: { 'Content-Type': 'application/json' } });

    // --- Ventana a enviar: respeta cupo diario y lote de 25 ---
    const allowed = Math.min(batchSize, cupoRestante, Math.max(0, recipients.length - offset));
    const remainingAfter = Math.max(0, recipients.length - offset - allowed);
    const quotaBlocked = cupoRestante <= 0 || allowed < Math.min(batchSize, Math.max(0, recipients.length - offset));

    if (allowed <= 0) {
      return new Response(JSON.stringify({
        success: true, sent: 0, failed: 0, recipients: 0, remaining: remainingAfter,
        skippedNoEmail, skippedBadEmail, todaySent, cupoRestante, quota: DAILY_QUOTA,
        pausado: remainingAfter > 0, campaignId, raceTitle,
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    const slice = recipients.slice(offset, offset + allowed);

    const applyName = (tpl: string, r: { first: string; name: string }) =>
      tpl.replace(/\{nombre\}/gi, r.first || r.name);

    const msgs = slice.map((r) => ({
      from: FROM,
      to: r.email,
      subject: applyName(subject, r),
      html: renderHtml(applyName(rawBody, r)),
    }));

    const details: { email: string; name: string; ok: boolean; error?: string }[] = [];
    let sent = 0;
    let failed = 0;

    const sendOne = async (msg: any): Promise<string | null> => {
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
          body: JSON.stringify(msg),
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) return j?.message || `HTTP ${res.status}`;
        return null;
      } catch (e: any) {
        return e?.message || 'Error de red';
      }
    };

    let batchErr: string | null = null;
    try {
      const res = await fetch('https://api.resend.com/emails/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify(msgs), // sin bcc
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) batchErr = j?.message || `HTTP ${res.status}`;
    } catch (e: any) {
      batchErr = e?.message || 'Error de red';
    }

    if (!batchErr) {
      sent = slice.length;
      slice.forEach((r) => details.push({ email: r.email, name: r.name, ok: true }));
    } else {
      // Reintento uno a uno si el lote completo fue rechazado.
      for (let i = 0; i < msgs.length; i++) {
        const err = await sendOne(msgs[i]);
        if (err) { failed++; details.push({ email: slice[i].email, name: slice[i].name, ok: false, error: err }); }
        else { sent++; details.push({ email: slice[i].email, name: slice[i].name, ok: true }); }
      }
    }

    const errorSample = details.find(d => !d.ok)?.error || '';
    const paused = quotaBlocked && remainingAfter > 0;
    const status = paused ? 'pausado' : (failed > 0 && sent === 0 ? 'error' : 'completado');

    // --- Bitácora: un registro por lote (campaignId agrupa la campaña) ---
    try {
      const detailsStr = details.map(d => (d.name ? `${d.name} <${d.email}>` : d.email)).join(', ');
      const logTitle = recipients.length > MAX_BATCH
        ? `${subject} — ${today} · ${offset + 1}–${offset + slice.length}`
        : `${subject} — ${today}`;
      await fetch(`${baseUrl}/api/content`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          collectionId: LOG_COLLECTION_ID,
          collection_id: LOG_COLLECTION_ID,
          title: logTitle,
          status: 'published',
          data: {
            date: today,
            subject,
            audience,
            race: raceId,
            raceTitle,
            campaignId,
            recipients: slice.length,
            sent,
            failed,
            skippedNoEmail: offset === 0 ? skippedNoEmail : 0,
            details: detailsStr,
            status,
          },
        }),
      });
    } catch { /* la bitácora no debe romper el envío */ }

    const newCupo = Math.max(0, cupoRestante - sent);

    return new Response(JSON.stringify({
      success: sent > 0,
      sent,
      failed,
      recipients: slice.length,
      remaining: remainingAfter,
      skippedNoEmail,
      skippedBadEmail,
      todaySent: todaySent + sent,
      cupoRestante: newCupo,
      quota: DAILY_QUOTA,
      pausado: paused,
      campaignId,
      raceTitle,
      errorSample,
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || 'Error al enviar los correos' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
