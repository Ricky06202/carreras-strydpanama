import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

export const GET: APIRoute = async ({ params }) => {
  try {
    const { filename } = params;
    
    if (!filename) {
      return new Response('Not found', { status: 404 });
    }
    
    const bucket = (env as any).IMAGES;
    const object = await bucket.get(filename);
    
    if (!object) {
      return new Response('Not found', { status: 404 });
    }
    
    return new Response(object.body, {
      headers: {
        'Content-Type': object.httpMetadata?.contentType || 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000',
      },
    });
  } catch (e: any) {
    return new Response('Error', { status: 500 });
  }
};
