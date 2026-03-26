import type { APIRoute } from 'astro';
import { api } from '../../lib/api';
import { env } from 'cloudflare:workers';

export const GET: APIRoute = async () => {
  try {
    // Intentamos obtener el contenido de la colección running_teams
    // Según AGENTS.md el nombre de la colección es 'running_teams'
    const response = await api.getCollectionContent(env, 'running_teams');
    
    // Transformamos la respuesta para que el frontend reciba un array de nombres
    const teams = (response?.data || []).map((item: any) => ({
      id: item.id,
      name: item.data?.title || item.title || 'Equipo sin nombre'
    }));

    return new Response(JSON.stringify({ teams }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Error in /api/teams:', error);
    // Retornamos un array vacío si falla, para que el formulario no se rompa
    return new Response(JSON.stringify({ teams: [] }), {
      status: 200, 
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
