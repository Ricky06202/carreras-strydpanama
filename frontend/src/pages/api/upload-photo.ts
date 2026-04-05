import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { imageBase64, cedula } = body;

    if (!imageBase64 || !cedula) {
      return new Response(JSON.stringify({ error: 'imageBase64 y cedula son requeridos' }), { status: 400 });
    }

    const sonicUrl = (env as any).SONICJS_API_URL || 'https://api.carreras.strydpanama.com';

    // Convertir base64 a bytes
    const mimeMatch = imageBase64.match(/^data:(image\/\w+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const ext = mimeType.split('/')[1] || 'jpg';
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const binaryStr = atob(base64Data);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    const filename = `runner-${cedula.replace(/\//g, '-')}.${ext}`;

    // Subir usando el endpoint de SonicJS /api/media/upload como multipart
    const formData = new FormData();
    formData.append('file', new Blob([bytes], { type: mimeType }), filename);

    // Authenticate with SonicJS (media upload requires auth)
    let authToken = '';
    try {
      const loginRes = await fetch(`${sonicUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: (env as any).SONICJS_API_EMAIL || 'admin@strydpanama.com',
          password: (env as any).SONICJS_API_PASSWORD || 'StrydPanama2026!'
        })
      });
      const loginData = await loginRes.json();
      authToken = loginData?.token || loginData?.data?.token || '';
    } catch {}

    const uploadHeaders: Record<string, string> = {};
    if (authToken) uploadHeaders['Authorization'] = `Bearer ${authToken}`;

    const uploadRes = await fetch(`${sonicUrl}/api/media/upload`, {
      method: 'POST',
      headers: uploadHeaders,
      body: formData,
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      throw new Error(`SonicJS media upload failed: ${uploadRes.status} — ${errText}`);
    }

    const uploadData = await uploadRes.json();

    // SonicJS devuelve la URL pública del archivo subido
    let publicUrl = '';
    if (uploadData?.url) publicUrl = uploadData.url;
    else if (uploadData?.data?.url) publicUrl = uploadData.data.url;
    else if (Array.isArray(uploadData) && uploadData[0]?.url) publicUrl = uploadData[0].url;
    else if (Array.isArray(uploadData?.data) && uploadData.data[0]?.url) publicUrl = uploadData.data[0].url;
    else if (uploadData?.data?.publicUrl) publicUrl = uploadData.data.publicUrl;
    
    if (!publicUrl) {
      publicUrl = `${sonicUrl}/files/uploads/${filename}`;
    }

    return new Response(JSON.stringify({ success: true, url: publicUrl }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || 'Error subiendo foto' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
