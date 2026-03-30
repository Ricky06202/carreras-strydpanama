import type { APIRoute } from 'astro';
import { apiFetch } from '../../lib/api';
import { env } from 'cloudflare:workers';

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const cedula = url.searchParams.get('cedula')?.trim();

  if (!cedula) {
    return new Response(JSON.stringify({ found: false, error: 'cédula requerida' }), { status: 400 });
  }

  try {
    // Fetch all runners and filter manually (SonicJS doesn't support field filtering via query params)
    const result = await apiFetch('/api/collections/runners/content?limit=2000', env, { method: 'GET' });
    const all = result?.data || [];
    
    const match = all.find((item: any) => 
      (item.data?.cedula || '').toLowerCase().trim() === cedula.toLowerCase()
    );

    if (!match) {
      return new Response(JSON.stringify({ found: false }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      found: true,
      runner: {
        id: match.id,
        firstName: match.data?.firstName || '',
        lastName: match.data?.lastName || '',
        email: match.data?.email || '',
        phone: match.data?.phone || '',
        cedula: match.data?.cedula || '',
        birthDate: match.data?.birthDate || '',
        gender: match.data?.gender || '',
        country: match.data?.country || 'Panamá',
        photoUrl: match.data?.photoUrl || '',
        totalRaces: match.data?.totalRaces || 0,
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ found: false, error: error.message }), { status: 500 });
  }
};
