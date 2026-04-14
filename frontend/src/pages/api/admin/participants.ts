import type { APIRoute } from 'astro';
import { apiFetch } from '../../../lib/api';
import { env } from 'cloudflare:workers';

export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const raceId = url.searchParams.get('raceId');

    // Construimos la URL de la API de SonicJS
    let endpoint = '/api/collections/participants/content?limit=5000';
    
    // IMPORTANTE: En SonicJS, podemos intentar filtrar en la query.
    // Aunque es más seguro traer todo o confiar en que SonicJS soporta ?race=
    if (raceId) {
      // Intentamos pasar el filtro al backend
      endpoint += `&race=${encodeURIComponent(raceId)}`;
    }

    const result = await apiFetch(endpoint, env, { 
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });

    let participantsData = result.data || [];

    // Filtramos por status published para evitar borradores o registros ocultos
    participantsData = participantsData.filter((p: any) => p.status === 'published');

    // Filtramos localmente si SonicJS omitió el filtro de query
    if (raceId) {
       participantsData = participantsData.filter((p: any) => p.data?.race === raceId || p.data?.raceId === raceId);
    }

    const participants = participantsData.map((item: any) => ({
      id: item.id,
      collectionId: item.collectionId || item.collection_id,
      title: item.data?.title || item.title || 'Sin nombre',
      firstName: item.data?.firstName || '',
      lastName: item.data?.lastName || '',
      email: item.data?.email || '',
      phone: item.data?.phone || '',
      cedula: item.data?.cedula || '',
      race: item.data?.race || '',
      category: item.data?.category || '',
      categoryName: item.data?.categoryName || '',
      distance: item.data?.distanceId || item.data?.distance || '',
      distanceName: item.data?.distance || '',
      teamName: item.data?.teamName || '',
      bibNumber: item.data?.bibNumber || '',
      paymentStatus: item.data?.paymentStatus || 'Pendiente',
      photoUrl: item.data?.photoUrl || '',
      birthDate: item.data?.birthDate || '',
      receiptUrl: item.data?.receiptUrl || '',
      studentIdUrl: item.data?.studentIdUrl || '',
      matriculaUrl: item.data?.matriculaUrl || '',
      confirmationCode: item.data?.confirmationCode || '',
      size: item.data?.size || '',
      gender: item.data?.gender || '',
      registrationType: item.data?.registrationType || 'individual',
      createdAt: item.created_at || item.createdOn || item.data?.createdAt || 0,
      paymentMethod: item.data?.paymentMethod || '',
      isPadrino: item.data?.isPadrino || false,
      donatedTickets: item.data?.donatedTickets || 0,
    }));

    return new Response(JSON.stringify({ success: true, participants }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || 'Error al obtener participantes' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
