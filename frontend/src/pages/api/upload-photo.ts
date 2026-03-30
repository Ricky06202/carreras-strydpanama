import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

const R2_PUBLIC_URL = 'https://pub-ddaf4243012a44c5a61699bc0719121f.r2.dev';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { imageBase64, cedula } = body;

    if (!imageBase64 || !cedula) {
      return new Response(JSON.stringify({ error: 'imageBase64 y cedula son requeridos' }), { status: 400 });
    }

    // Convertir base64 a bytes
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const binaryStr = atob(base64Data);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    // Determinar tipo de imagen
    const mimeMatch = imageBase64.match(/^data:(image\/\w+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const ext = mimeType.split('/')[1] || 'jpg';

    const key = `runners/${cedula.replace(/\//g, '-')}/photo.${ext}`;

    // Subir a R2 usando el binding PHOTOS_BUCKET
    const bucket = (env as any).PHOTOS_BUCKET;
    if (!bucket) {
      return new Response(JSON.stringify({ error: 'R2 bucket no disponible' }), { status: 500 });
    }

    await bucket.put(key, bytes.buffer, {
      httpMetadata: { contentType: mimeType }
    });

    const publicUrl = `${R2_PUBLIC_URL}/${key}`;

    return new Response(JSON.stringify({ success: true, url: publicUrl }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || 'Error subiendo foto' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
