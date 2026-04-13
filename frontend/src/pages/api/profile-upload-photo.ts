import type { APIRoute } from 'astro';
import { apiFetch } from '../../lib/api';
import { env } from 'cloudflare:workers';
import { verifyCodeAndGetRunner, verifySessionAndGetRunner } from '../../lib/profile-helpers';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { code, sessionToken, imageBase64, type } = await request.json();

    if (!imageBase64 || !type || (!code && !sessionToken)) {
      return new Response(JSON.stringify({ ok: false, error: 'sessionToken (o código), imageBase64 y type son requeridos' }), { status: 400 });
    }

    if (!['banner', 'gallery', 'profile'].includes(type)) {
      return new Response(JSON.stringify({ ok: false, error: 'type debe ser: banner, gallery o profile' }), { status: 400 });
    }

    const { runner, colId, cedula } = sessionToken
      ? await verifySessionAndGetRunner(sessionToken, env)
      : await verifyCodeAndGetRunner(code, env);

    // Upload image to SonicJS
    const sonicUrl = (env as any).SONICJS_API_URL || 'https://api.carreras.strydpanama.com';

    const mimeMatch = imageBase64.match(/^data:(image\/\w+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const ext = mimeType.split('/')[1] || 'jpg';
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const binaryStr = atob(base64Data);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);

    const filename = `runner-${cedula.replace(/\//g, '-')}-${type}-${Date.now()}.${ext}`;

    let authToken = '';
    try {
      const loginRes = await fetch(`${sonicUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: (env as any).SONICJS_API_EMAIL,
          password: (env as any).SONICJS_API_PASSWORD,
        }),
      });
      const loginData = await loginRes.json();
      authToken = loginData?.token || loginData?.data?.token || '';
    } catch {}

    const formData = new FormData();
    formData.append('file', new Blob([bytes], { type: mimeType }), filename);

    const uploadHeaders: Record<string, string> = {};
    if (authToken) uploadHeaders['Authorization'] = `Bearer ${authToken}`;

    const uploadRes = await fetch(`${sonicUrl}/api/media/upload`, {
      method: 'POST',
      headers: uploadHeaders,
      body: formData,
    });
    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      throw new Error(`Upload failed: ${uploadRes.status} — ${errText}`);
    }

    const uploadData = await uploadRes.json();
    const mediaId = uploadData?.file?.id || uploadData?.data?.file?.id || uploadData?.data?.id;
    if (!mediaId) throw new Error('No se recibió ID del archivo');
    
    // Save deterministic path matching R2 bucket routing
    const url = `/uploads/${mediaId}.${ext}`;

    // For gallery, append URL to existing array
    let updatedData = { ...runner.data };
    if (type === 'gallery') {
      let gallery: string[] = [];
      try { gallery = JSON.parse(runner.data?.galleryPhotos || '[]'); } catch {}
      gallery.push(url);
      updatedData.galleryPhotos = JSON.stringify(gallery);
    } else {
      updatedData[type === 'banner' ? 'bannerUrl' : 'photoUrl'] = url;
    }

    await apiFetch(`/api/content/${runner.id}`, env, {
      method: 'PUT',
      body: JSON.stringify({
        id: runner.id,
        collectionId: colId,
        collection_id: colId,
        title: runner.title,
        status: 'published',
        data: updatedData,
      }),
    });

    return new Response(JSON.stringify({ ok: true, url }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ ok: false, error: error.message || 'Error al subir foto' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
