import type { APIRoute } from 'astro';
import { apiFetch } from '../../lib/api';
import { env } from 'cloudflare:workers';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { participantId, imageBase64, cedula } = await request.json();
    if (!participantId || !imageBase64) {
      return new Response(JSON.stringify({ error: 'participantId e imageBase64 son requeridos' }), { status: 400 });
    }

    const sonicUrl = (env as any).SONICJS_API_URL || 'https://api.carreras.strydpanama.com';

    // Convert base64 to blob and upload via SonicJS /api/media/upload
    const mimeMatch = imageBase64.match(/^data:(image\/\w+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const ext = mimeType.split('/')[1] || 'jpg';
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const binaryStr = atob(base64Data);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);

    const filename = `runner-${(cedula || participantId).replace(/\//g, '-')}-${Date.now()}.${ext}`;
    const formData = new FormData();
    formData.append('file', new Blob([bytes], { type: mimeType }), filename);

    const uploadRes = await fetch(`${sonicUrl}/api/media/upload`, { method: 'POST', body: formData });
    if (!uploadRes.ok) throw new Error(`Upload failed: ${uploadRes.status}`);
    const uploadData = await uploadRes.json();
    const photoUrl = uploadData?.data?.url || uploadData?.url || uploadData?.publicUrl || `${sonicUrl}/media/${filename}`;

    // Update participant record
    const partRes = await apiFetch(`/api/content/${participantId}`, env, { method: 'GET' });
    const part = partRes?.data;
    if (!part) throw new Error('Participante no encontrado');

    await apiFetch(`/api/content/${participantId}`, env, {
      method: 'PUT',
      body: JSON.stringify({
        id: participantId,
        collectionId: part.collectionId,
        collection_id: part.collectionId,
        title: part.title,
        status: part.status || 'published',
        data: { ...part.data, photoUrl }
      })
    });

    // Also update runner profile if cedula provided
    if (cedula) {
      try {
        const allRunners = await apiFetch('/api/collections/runners/content?limit=2000', env, { method: 'GET' });
        const runner = (allRunners?.data || []).find((r: any) =>
          (r.data?.cedula || '').toLowerCase().trim() === cedula.toLowerCase().trim()
        );
        if (runner) {
          const runnersRes = await apiFetch('/api/collections', env, { method: 'GET' });
          const runnersCol = (runnersRes?.data || []).find((c: any) => c.name === 'runners');
          const colId = runnersCol?.id || runner.collectionId;
          await apiFetch(`/api/content/${runner.id}`, env, {
            method: 'PUT',
            body: JSON.stringify({
              id: runner.id, collectionId: colId, collection_id: colId,
              title: runner.title, status: 'published',
              data: { ...runner.data, photoUrl }
            })
          });
        }
      } catch {}
    }

    return new Response(JSON.stringify({ success: true, photoUrl }), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};
