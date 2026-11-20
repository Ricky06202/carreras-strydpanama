import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import test from 'node:test';

const cms = 'https://cms.example.test';
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === 'cloudflare:workers') {
      return { url: 'data:text/javascript,export const env = ' + JSON.stringify({
        SONICJS_API_URL: cms,
        SONICJS_API_EMAIL: 'admin@example.test',
        SONICJS_API_PASSWORD: 'test-password',
        RESEND_API_KEY: 'test-key',
      }), shortCircuit: true };
    }
    if (specifier === '../../../lib/api') return nextResolve(specifier + '.ts', context);
    return nextResolve(specifier, context);
  },
});
const { POST } = await import('../src/pages/api/admin/send-bulk.ts');
hooks.deregister();

const draft = { audience: 'inscritos', raceId: 'race', subject: 'Entrega de kit', body: 'Hola {nombre}' };
const previousDay = '2000-01-01';
const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Panama' });
const participants = Array.from({ length: 169 }, (_, i) => {
  const id = String(i + 1).padStart(3, '0');
  return { id, data: { bibNumber: id, race: 'race', firstName: 'Corredor', email: 'runner' + id + '@example.test' } };
});

function mockServices(t, initialLogs = [], initialParticipants = participants) {
  const logs = [...initialLogs];
  const sent = [];
  const keys = [];
  let logReadError = false;
  let logWriteError = false;
  let roster = initialParticipants;
  let rejectIndex = null;
  const deliveries = new Map();
  t.mock.method(globalThis, 'fetch', async (input, init) => {
    const url = new URL(input);
    if (url.pathname === '/auth/login') return Response.json({ token: 'test-token' });
    const offset = Number(url.searchParams.get('offset'));
    const limit = Number(url.searchParams.get('limit'));
    if (url.pathname.includes('/participants/')) return Response.json({ data: roster.slice(offset, offset + limit) });
    if (url.pathname.includes('/races/')) return Response.json({ data: [] });
    if (url.pathname.includes('/email_log/')) {
      return logReadError ? Response.json({}, { status: 503 }) : Response.json({ data: logs.slice(offset, offset + limit) });
    }
    if (url.origin === cms && url.pathname === '/api/content') {
      if (logWriteError) return Response.json({}, { status: 503 });
      logs.unshift({ ...JSON.parse(init.body), created_at: Date.now() });
      return Response.json({}, { status: 201 });
    }
    assert.equal(url.href, 'https://api.resend.com/emails/batch');
    const key = new Headers(init.headers).get('Idempotency-Key');
    keys.push(key);
    if (key && deliveries.has(key)) return Response.json(deliveries.get(key));
    const messages = JSON.parse(init.body).filter((_, index) => index !== rejectIndex);
    sent.push(...messages.map(message => message.to));
    const result = {
      data: messages.map((_, i) => ({ id: String(i) })),
      errors: rejectIndex === null ? [] : [{ index: rejectIndex, message: 'Dirección rechazada' }],
    };
    if (key) deliveries.set(key, result);
    return Response.json(result);
  });
  return {
    logs, sent, keys,
    setRoster(value) { roster = value; },
    rejectRecipient(index) { rejectIndex = index; },
    failLogRead(value) { logReadError = value; },
    failLogWrite(value) { logWriteError = value; },
  };
}

async function request(properties = {}) {
  const response = await POST({ request: new Request('https://app.example.test/api/admin/send-bulk', {
    method: 'POST', body: JSON.stringify({ ...draft, ...properties }),
  }) });
  return { status: response.status, ...await response.json() };
}

test('recupera los 69 pendientes de un lote anterior de 100', async t => {
  const services = mockServices(t, [{
    title: 'Entrega de kit — ' + previousDay + ' · 1–100', status: 'published',
    data: {
      ...draft, date: previousDay, race: draft.raceId, campaignId: 'legacy', sent: 100,
      status: 'completado', details: participants.slice(0, 100).map(p => 'Corredor <' + p.data.email + '>').join(', '),
    },
  }]);
  const preview = await request({ preview: true });
  assert.equal(preview.campaignId, 'legacy');
  assert.equal(preview.total, 69);
  const result = await request({ campaignId: preview.campaignId });
  assert.equal(result.sent, 69);
  assert.equal(result.remaining, 0);
  assert.deepEqual(services.sent, participants.slice(100).map(p => p.data.email));
  assert.equal((await request({ campaignId: preview.campaignId })).sent, 0);
});

test('conserva los pendientes de una campaña nueva al recargar y renovar el cupo', async t => {
  const services = mockServices(t);
  const preview = await request({ preview: true });
  const first = await request({ campaignId: preview.campaignId });
  assert.equal(first.sent, 100);
  assert.equal(first.remaining, 69);
  assert.equal(first.pausado, true);
  assert.equal(services.logs[0].data.date, today);
  const paused = await request({ preview: true });
  assert.equal(paused.total, 69);
  assert.equal(paused.cupoRestante, 0);
  assert.equal((await request({ campaignId: paused.campaignId })).sent, 0);
  services.logs[0].data.date = previousDay;
  services.setRoster([...participants, { id: '170', data: { ...participants[0].data, email: 'new@example.test' } }]);
  const next = await request({ preview: true });
  assert.equal(next.campaignId, preview.campaignId);
  assert.equal(next.total, 69);
  assert.equal(next.cupoRestante, 100);
  assert.equal((await request({ campaignId: next.campaignId })).sent, 69);
  assert.equal(new Set(services.sent).size, 169);
  assert.equal(services.sent.length, 169);
  assert.equal(services.sent.includes('new@example.test'), false);
});

test('cancela el envío si no se puede consultar la bitácora', async t => {
  const services = mockServices(t);
  services.failLogRead(true);
  assert.equal((await request()).status, 500);
  assert.deepEqual(services.sent, []);
});

test('reutiliza la clave de Resend si el envío se aceptó y falló el registro', async t => {
  const services = mockServices(t, [], participants.slice(0, 1));
  const preview = await request({ preview: true });
  services.failLogWrite(true);
  assert.equal((await request({ campaignId: preview.campaignId })).status, 500);
  services.failLogWrite(false);
  assert.equal((await request({ campaignId: preview.campaignId })).sent, 1);
  assert.ok(services.keys[0]);
  assert.equal(services.keys[0], services.keys[1]);
  assert.deepEqual(services.sent, [participants[0].data.email]);
});

test('reintenta solo el destinatario rechazado por Resend', async t => {
  const services = mockServices(t, [], participants.slice(0, 3));
  services.rejectRecipient(1);
  const firstPreview = await request({ preview: true });
  const first = await request({ campaignId: firstPreview.campaignId });
  assert.equal(first.sent, 2);
  assert.equal(first.failed, 1);
  assert.equal(first.remaining, 1);
  services.rejectRecipient(null);
  const next = await request({ preview: true });
  assert.equal(next.total, 1);
  assert.equal((await request({ campaignId: next.campaignId })).sent, 1);
  assert.deepEqual(services.sent, [participants[0], participants[2], participants[1]].map(p => p.data.email));
  assert.equal((await request({ preview: true })).total, 0);
  const repeat = await request({ preview: true, newCampaign: true });
  assert.notEqual(repeat.campaignId, firstPreview.campaignId);
  assert.equal(repeat.total, 3);
});

test('consulta todas las páginas de la bitácora antes de reanudar', async t => {
  const otherLogs = Array.from({ length: 1000 }, () => ({
    status: 'published', data: { date: previousDay, subject: 'Otra campaña' },
  }));
  const log = {
    title: 'Entrega de kit · 1–100', status: 'published',
    data: {
      ...draft, date: previousDay, race: draft.raceId, campaignId: 'legacy', sent: 100,
      details: participants.slice(0, 100).map(p => 'Corredor <' + p.data.email + '>').join(', '),
    },
  };
  mockServices(t, [...otherLogs, log]);
  assert.equal((await request({ preview: true })).total, 69);
});
