import type { APIRoute } from 'astro';
import { getAuthToken } from '../../../lib/api';
import { env } from 'cloudflare:workers';

// La bitácora registra el progreso de cada campaña y el consumo del cupo diario.

const FROM = 'Carreras STRYD <carreras@strydpanama.com>';
const SITE = 'https://carreras.strydpanama.com';
const DAILY_QUOTA = 100;
const LOG_COLLECTION_ID = 'col-email_log-97d1ec29';
const CMS_PAGE_SIZE = 1000;

type LogData = {
  date?: string;
  subject?: string;
  audience?: string;
  race?: string;
  campaignId?: string;
  messageKey?: string;
  targetIds?: string[];
  sentIds?: string[];
  sent?: number;
  failed?: number;
  details?: string;
  status?: string;
};

type LogEntry = { title: string; status: string; data: LogData };

async function digest(parts: unknown[]): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(parts));
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('');
}

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
    const requestedId = String(body.campaignId || '');
    const newCampaign = body.newCampaign === true;

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
    if (!token) {
      return Response.json({ error: 'No se pudo autenticar con la bitácora de correos.' }, { status: 503 });
    }
    const baseUrl = String(env.SONICJS_API_URL || '').replace(/\/$/, '');
    const authHeaders = {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      Authorization: `Bearer ${token}`,
    };

    const snapshotTime = Date.now();
    const readCollection = async <T,>(collection: string): Promise<T[]> => {
      const rows: T[] = [];
      do {
        const query = new URLSearchParams({
          limit: String(CMS_PAGE_SIZE),
          offset: String(rows.length),
          sort: JSON.stringify([{ field: 'created_at', order: 'desc' }, { field: 'id', order: 'asc' }]),
          // SonicJS usa el filtro (no _t) como parte de su clave de caché interna.
          where: JSON.stringify({ and: [{ field: 'created_at', operator: 'less_than_equal', value: snapshotTime }] }),
          _t: String(snapshotTime),
        });
        const response = await fetch(`${baseUrl}/api/collections/${collection}/content?${query}`, { headers: authHeaders });
        if (!response.ok) throw new Error(`No se pudo consultar ${collection}. Intenta de nuevo.`);
        const result = await response.json();
        if (!Array.isArray(result.data)) throw new Error(`Respuesta inválida de ${collection}.`);
        rows.push(...result.data);
        if (result.data.length < CMS_PAGE_SIZE) return rows;
      } while (true);
    };

    const [participants, races, logRows] = await Promise.all([
      readCollection<any>('participants'),
      raceId ? readCollection<any>('races') : Promise.resolve([]),
      readCollection<LogEntry>('email_log'),
    ]);
    const logs = logRows.filter(row => row.status === 'published');

    const today = todayPanama();
    const todaySent = logs
      .filter(row => String(row.data.date || '').slice(0, 10) === today)
      .reduce((sum, row) => sum + (Number(row.data.sent) || 0), 0);
    const cupoRestante = Math.max(0, DAILY_QUOTA - todaySent);

    const selectedSet = new Set(participantIds);
    let skippedNoEmail = 0;
    let skippedBadEmail = 0;

    const recipients: { id: string; email: string; name: string; first: string }[] = [];
    participants.forEach((c: any) => {
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

    const raceTitle = raceId ? (races.find(row => row.id === raceId)?.data?.title || raceId) : '';
    const subject = String(body.subject || '').trim();
    const rawBody = String(body.body || '');
    if (!preview && (!subject || !rawBody.trim())) {
      return Response.json({ error: 'El asunto y el cuerpo del correo son obligatorios.' }, { status: 400 });
    }

    const messageKey = await digest([audience, raceId, subject, rawBody, [...selectedSet].sort()]);
    const scopeLogs = logs.filter(({ data }) => data.campaignId && (
      data.messageKey ? data.messageKey === messageKey :
        audience !== 'individual' && data.subject === subject && data.audience === audience && (data.race || '') === raceId
    ));
    // Los lotes antiguos solo registraban rangos si el público superaba el cupo.
    const resumableIds = new Set(scopeLogs.filter(({ title, data }) =>
      data.messageKey || data.status === 'pausado' || / · \d+–\d+$/.test(title || ''),
    ).map(row => row.data.campaignId));
    const matchingLogs = scopeLogs.filter(row => resumableIds.has(row.data.campaignId));
    const requestedLogs = requestedId ? matchingLogs.filter(row => row.data.campaignId === requestedId) : [];
    const latestId = matchingLogs[0]?.data.campaignId;
    const campaignId = requestedLogs.length ? requestedId : ((!newCampaign && latestId) ||
      `camp-${await digest([messageKey, latestId || ''])}`);
    const campaignLogs = matchingLogs.filter(row => row.data.campaignId === campaignId);
    if (requestedId && requestedId !== campaignId) {
      return Response.json({ error: 'La campaña cambió. Vuelve a calcular los destinatarios.' }, { status: 409 });
    }

    const savedTargets = campaignLogs.find(row => Array.isArray(row.data.targetIds))?.data.targetIds;
    const targetIds = new Set(savedTargets ?? recipients.map(r => r.id));
    const sentIds = new Set<string>();
    const legacyEmails = new Set<string>();
    for (const { data } of campaignLogs) {
      if (Array.isArray(data.sentIds)) {
        data.sentIds.forEach(id => sentIds.add(id));
      } else if (Number(data.sent) > 0) {
        const emails = [...String(data.details || '').matchAll(/<([^<>]+)>/g)].map(match => match[1]);
        if (Number(data.failed) > 0 || emails.length !== Number(data.sent) || emails.some(email => !EMAIL_RE.test(email))) {
          return Response.json({ error: 'La bitácora anterior no permite identificar todos los envíos confirmados de esta campaña.' }, { status: 409 });
        }
        emails.forEach(email => legacyEmails.add(email.toLowerCase()));
      }
    }
    const pending = recipients.filter(r => targetIds.has(r.id) && !sentIds.has(r.id) && !legacyEmails.has(r.email.toLowerCase()));
    const quota = { todaySent, cupoRestante, quota: DAILY_QUOTA };
    const campaign = { campaignId, resuming: campaignLogs.length > 0, raceTitle, skippedNoEmail, skippedBadEmail };

    if (preview) {
      return Response.json({ success: true, preview: true, audience, total: pending.length, ...campaign, ...quota });
    }

    const slice = pending.slice(0, cupoRestante);
    const noSendResult = {
      success: true, sent: 0, failed: 0, recipients: 0, remaining: pending.length,
      pausado: pending.length > 0, ...campaign, ...quota,
    };
    if (slice.length === 0) return Response.json(noSendResult);
    if (body.expectedTotal !== undefined && body.expectedTotal !== pending.length) {
      return Response.json({ error: 'Los destinatarios cambiaron. Vuelve a calcularlos antes de enviar.' }, { status: 409 });
    }

    const msgs = slice.map(r => ({
      from: FROM,
      to: r.email,
      subject: subject.replace(/\{nombre\}/gi, () => r.first),
      html: renderHtml(rawBody.replace(/\{nombre\}/gi, () => r.first)),
    }));
    // La misma campaña y el mismo conjunto pendiente reutilizan la clave al reintentar el lote.
    const batchKey = await digest([campaignId, slice.map(r => r.id), campaignLogs.length]);
    const resend = await fetch('https://api.resend.com/emails/batch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
        'Idempotency-Key': batchKey,
        'x-batch-validation': 'permissive',
      },
      body: JSON.stringify(msgs),
    });
    const result = await resend.json().catch(() => ({}));
    if (!resend.ok) {
      if (result.name === 'daily_quota_exceeded') {
        return Response.json({ ...noSendResult, cupoRestante: 0 });
      }
      return Response.json({ error: result.message || `Resend respondió HTTP ${resend.status}.` }, { status: 502 });
    }

    const errors: { index: number; message?: string }[] = Array.isArray(result.errors) ? result.errors : [];
    const failedIndexes = new Set(errors.map(error => error.index));
    const delivered = slice.filter((_, index) => !failedIndexes.has(index));
    if (!Array.isArray(result.data) || result.data.length !== delivered.length) {
      return Response.json({ error: 'Resend devolvió un resultado inesperado. Reintenta la misma campaña.' }, { status: 502 });
    }

    const sent = delivered.length;
    const failed = slice.length - sent;
    const remaining = pending.length - sent;
    const newCupo = cupoRestante - sent;
    const pausado = newCupo === 0 && remaining > 0;
    const status = pausado ? 'pausado' : (failed > 0 ? 'error' : 'completado');

    const logResponse = await fetch(`${baseUrl}/api/content`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        collectionId: LOG_COLLECTION_ID,
        collection_id: LOG_COLLECTION_ID,
        title: `${subject} — ${today}`,
        slug: `lote-${batchKey}`,
        status: 'published',
        data: {
          date: today, subject, audience, race: raceId, raceTitle, campaignId, messageKey,
          ...(!savedTargets && { targetIds: [...targetIds] }),
          sentIds: delivered.map(r => r.id),
          recipients: slice.length, sent, failed,
          skippedNoEmail: campaignLogs.length === 0 ? skippedNoEmail : 0,
          details: delivered.map(r => `${r.name} <${r.email}>`).join(', '),
          status,
        },
      }),
    });
    // Un lote simultáneo puede haber guardado ya este resultado con el mismo identificador.
    if (!logResponse.ok && logResponse.status !== 409) {
      return Response.json({ error: 'Resend procesó el lote, pero falló la bitácora. Reintenta esta misma campaña cuanto antes.' }, { status: 500 });
    }

    return Response.json({
      success: sent > 0, sent, failed, recipients: slice.length, remaining, pausado,
      ...campaign, ...quota, todaySent: todaySent + sent, cupoRestante: newCupo,
      errorSample: errors[0]?.message || '',
    });
  } catch (error: any) {
    return Response.json({ error: error.message || 'Error al enviar los correos' }, { status: 500 });
  }
};
