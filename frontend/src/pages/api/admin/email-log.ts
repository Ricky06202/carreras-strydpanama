import type { APIRoute } from 'astro';
import { apiFetch } from '../../../lib/api';
import { env } from 'cloudflare:workers';

const DAILY_QUOTA = 100;

function todayPanama(): string {
  try {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Panama' });
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}

export const GET: APIRoute = async () => {
  try {
    const result = await apiFetch('/api/collections/email_log/content?limit=5000', env, { method: 'GET' });
    const rows = (result.data || [])
      .filter((c: any) => c.status === 'published')
      .map((item: any) => ({
        id: item.id,
        date: String(item.data?.date || '').slice(0, 10),
        subject: item.data?.subject || '',
        audience: item.data?.audience || '',
        race: item.data?.race || '',
        raceTitle: item.data?.raceTitle || '',
        campaignId: item.data?.campaignId || '',
        recipients: Number(item.data?.recipients) || 0,
        sent: Number(item.data?.sent) || 0,
        failed: Number(item.data?.failed) || 0,
        skippedNoEmail: Number(item.data?.skippedNoEmail) || 0,
        details: item.data?.details || '',
        status: item.data?.status || 'completado',
        createdAt: item.created_at || 0,
      }))
      .sort((a: any, b: any) => String(b.date).localeCompare(String(a.date)) || (b.createdAt - a.createdAt));

    const today = todayPanama();
    const todaySent = rows
      .filter((r: any) => r.date === today)
      .reduce((s: number, r: any) => s + r.sent, 0);

    return new Response(JSON.stringify({ logs: rows, todaySent, quota: DAILY_QUOTA }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || 'Error al listar la bitácora de correos' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
