import type { APIRoute } from 'astro';
import { apiFetch } from '../../../lib/api';
import { env } from 'cloudflare:workers';

const COLLECTION_ID = 'col-email_templates-b57228bb';

export const GET: APIRoute = async () => {
  try {
    const result = await apiFetch('/api/collections/email_templates/content?limit=500', env, { method: 'GET' });
    const templates = (result.data || [])
      .filter((c: any) => c.status === 'published')
      .map((item: any) => ({
        id: item.id,
        name: item.data?.name || item.title || '',
        subject: item.data?.subject || '',
        body: item.data?.body || '',
        isActive: item.data?.isActive !== false,
      }))
      .sort((a: any, b: any) => String(a.name).localeCompare(String(b.name)));

    return new Response(JSON.stringify({ templates }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || 'Error al listar plantillas de correo' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const PUT: APIRoute = async ({ request }) => {
  try {
    const body = await request.json().catch(() => ({})) as any;
    const id = String(body.id || '').trim();
    const name = String(body.name || '').trim();
    const subject = String(body.subject || '').trim();
    const text = String(body.body || '');
    if (!id) {
      return new Response(JSON.stringify({ error: 'Falta el id de la plantilla a editar.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    if (!name || !subject || !text.trim()) {
      return new Response(JSON.stringify({ error: 'La plantilla necesita nombre, asunto y cuerpo.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    await apiFetch(`/api/content/${id}`, env, {
      method: 'PUT',
      body: JSON.stringify({ id, collectionId: COLLECTION_ID, collection_id: COLLECTION_ID, title: name, status: 'published', data: { name, subject, body: text, isActive: true } }),
    });
    return new Response(JSON.stringify({ success: true, template: { id, name, subject, body: text } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || 'Error al actualizar la plantilla' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json().catch(() => ({})) as any;
    const name = String(body.name || '').trim();
    const subject = String(body.subject || '').trim();
    const text = String(body.body || '');
    if (!name || !subject || !text.trim()) {
      return new Response(JSON.stringify({ error: 'La plantilla necesita nombre, asunto y cuerpo.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const result = await apiFetch('/api/content', env, {
      method: 'POST',
      body: JSON.stringify({
        collectionId: COLLECTION_ID,
        collection_id: COLLECTION_ID,
        title: name,
        status: 'published',
        data: { name, subject, body: text, isActive: body.isActive !== false },
      }),
    });

    return new Response(JSON.stringify({ success: true, template: { id: result?.data?.id, name, subject, body: text } }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || 'Error al guardar la plantilla' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
