import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { processRegistration } from '../../lib/registerLogic';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const result = await processRegistration(env, body);
    
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Error in /api/register:', error);
    return new Response(JSON.stringify({ 
      success: false,
      message: error.message || 'Error interno en el servidor de registro',
      details: error.stack || 'No stack trace available',
      env_url: env?.SONICJS_API_URL ? 'PRESENT' : 'MISSING'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
