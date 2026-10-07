import type { APIRoute } from 'astro';
import { apiFetch } from '../../../lib/api';
import { env } from 'cloudflare:workers';

const FROM = 'Carreras STRYD <carreras@strydpanama.com>';
const SITE = 'https://carreras.strydpanama.com';

interface Reminder {
  id: string;
  to: string;
  firstName: string;
  cedula: string;
  raceTitle: string;
  raceDate: string;
  amount: number;
}

function buildEmail(r: Reminder): { subject: string; html: string } {
  const link = `${SITE}/completar-inscripcion?cedula=${encodeURIComponent(r.cedula || '')}`;
  const subject = `🏃 ${r.raceTitle}: estás a un paso de oficializar tu inscripción`;
  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;background:#f5f5f5;padding:24px">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e0e0e0">
      <div style="background:#000000;padding:18px 24px">
        <span style="color:#FF6B00;font-size:20px;font-weight:900;letter-spacing:2px">STRYD PANAMA</span>
      </div>
      <div style="padding:28px 24px">
        <p style="font-size:16px;color:#1a1a1a;margin:0 0 16px">Hola <b>${r.firstName}</b>,</p>
        <p style="font-size:15px;color:#333;line-height:1.6;margin:0 0 16px">
          Estamos a <b>solo un paso</b> de oficializar tu inscripción en
          <b>${r.raceTitle}</b>${r.raceDate ? ` (${r.raceDate})` : ''}. 🎽
        </p>
        <p style="font-size:15px;color:#333;line-height:1.6;margin:0 0 16px">
          Recuerda: solo debes entrar a <b>Mis Inscripciones</b>, poner tu número de cédula y
          completar el proceso de pago con <b>Yappy</b> o <b>Transferencia</b>.
          Tu monto a pagar es <b style="color:#FF6B00">B/. ${r.amount.toFixed(2)}</b>.
        </p>
        <p style="text-align:center;margin:24px 0">
          <a href="${link}" style="background:#FF6B00;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:bold;font-size:15px;display:inline-block">
            Completar mi inscripción →
          </a>
        </p>
        <p style="font-size:14px;color:#555;line-height:1.6;margin:0">
          Al completar el pago recibirás tu <b>dorsal</b> al instante. Te esperamos en la carrera. 🧡
        </p>
      </div>
      <div style="background:#0f0f0f;padding:14px 24px;text-align:center">
        <span style="color:#8595a7;font-size:12px">Carreras STRYD Panamá · Este es un recordatorio de tu preinscripción · No requiere respuesta</span>
      </div>
    </div>
  </div>`;
  return { subject, html };
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json().catch(() => ({})) as any;
    const raceId = body.raceId ? String(body.raceId) : '';
    if (!raceId) {
      return new Response(JSON.stringify({ error: 'Selecciona primero una carrera: los recordatorios solo se envían a la carrera elegida, nunca a todas.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    const force = body.force === true;
    const testEmail = body.testEmail ? String(body.testEmail) : '';
    const key = (env as any).RESEND_API_KEY;
    if (!key) return new Response(JSON.stringify({ error: 'Falta el secreto RESEND_API_KEY en el worker' }), { status: 500 });

    const [partRes, racesRes] = await Promise.all([
      apiFetch(`/api/collections/participants/content?limit=5000&_t=${Date.now()}`, env, {
        method: 'GET',
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache' }
      }),
      apiFetch(`/api/collections/races/content?limit=200&_t=${Date.now()}`, env, { method: 'GET' })
    ]);

    const racesById: Record<string, any> = {};
    (racesRes?.data || []).forEach((r: any) => { racesById[r.id] = r.data || {}; });

    const now = Date.now();
    const list: Reminder[] = [];
    let skippedNoEmail = 0;
    let skippedRecent = 0;

    (partRes?.data || []).forEach((c: any) => {
      const d = c.data || {};
      const isPre = d.registrationStatus === 'preinscrito' || d.paymentStatus === 'Preinscrito';
      if (!isPre) return;
      if (d.participantType === 'padrino') return;
      if (raceId && (d.race || d.raceId) !== raceId) return;
      if (!d.email) { skippedNoEmail++; return; }
      if (!force && Number(d.lastReminderAt) && now - Number(d.lastReminderAt) < 24 * 60 * 60 * 1000) { skippedRecent++; return; }

      const race = racesById[d.race || d.raceId] || {};
      const createdMs = Number(c.created_at) || Number(d.createdAt) || 0;
      const legacyPrice = Number(race.legacyPrice) || 0;
      const legacyCutoff = Number(race.legacyCutoff) || 0;
      const isStudent = (d.categoryName || '').toLowerCase().includes('estudiante') || d.participantType === 'estudiante';
      const isLegacy = legacyPrice > 0 && legacyCutoff > 0 && createdMs > 0 && createdMs < legacyCutoff;
      const amount = isStudent ? 10 : (isLegacy ? legacyPrice : (Number(race.price) || 0));

      let raceDate = '';
      if (race.date) {
        const nd = Number(race.date);
        raceDate = !isNaN(nd) && nd > 0 ? new Date(nd).toLocaleDateString('es-PA') : String(race.date);
      }

      list.push({ id: c.id, to: d.email, firstName: d.firstName || (d.title || '').split(' ')[0] || 'corredor(a)', cedula: d.cedula || '', raceTitle: race.title || 'la carrera', raceDate, amount });
    });

    if (testEmail) {
      const sample = list[0] || { id: '', to: testEmail, firstName: 'Corredor(a)', cedula: '0-0-0', raceTitle: (Object.values(racesById)[0] as any)?.title || 'la carrera', raceDate: '', amount: 20 };
      const msgs = [{ ...buildEmail({ ...sample, to: testEmail }), from: FROM, to: testEmail }];
      const res = await fetch('https://api.resend.com/emails/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify(msgs)
      });
      const j = await res.json();
      if (!res.ok) return new Response(JSON.stringify({ error: j?.message || 'Resend rechazó el envío de prueba' }), { status: 502 });
      return new Response(JSON.stringify({ success: true, test: true, sent: 1, candidates: list.length }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    if (list.length === 0) {
      return new Response(JSON.stringify({ success: true, sent: 0, skippedNoEmail, skippedRecent, detail: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    const detail: { email: string; ok: boolean; error?: string }[] = [];
    let sent = 0;

    for (let i = 0; i < list.length; i += 100) {
      const chunk = list.slice(i, i + 100);
      const msgs = chunk.map(r => ({ ...buildEmail(r), from: FROM, to: r.to }));
      try {
        const res = await fetch('https://api.resend.com/emails/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
          body: JSON.stringify(msgs)
        });
        const j = await res.json();
        if (!res.ok) throw new Error(j?.message || `HTTP ${res.status}`);
        sent += chunk.length;
        chunk.forEach(r => detail.push({ email: r.to, ok: true }));
        // Marcar el recordatorio para no repetir envíos en 24h
        for (const r of chunk) {
          const item = (partRes.data || []).find((c: any) => c.id === r.id);
          if (!item) continue;
          const colId = item.collectionId || 'col-participants-93d1ac21';
          await apiFetch(`/api/content/${r.id}`, env, {
            method: 'PUT',
            body: JSON.stringify({ id: r.id, collectionId: colId, collection_id: colId, title: item.title, status: 'published', data: { ...item.data, lastReminderAt: now } })
          });
        }
      } catch (e: any) {
        chunk.forEach(r => detail.push({ email: r.to, ok: false, error: e?.message }));
      }
    }

    return new Response(JSON.stringify({ success: sent > 0, sent, skippedNoEmail, skippedRecent, detail }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || 'Error al enviar los recordatorios' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
