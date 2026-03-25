import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const contentType = file.type || 'image/jpeg';
    const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    
    const bucket = (env as any).IMAGES;
    await bucket.put(fileName, bytes, {
      httpMetadata: {
        contentType
      }
    });

    const url = `/api/images/${fileName}`;
    
    return new Response(JSON.stringify({ 
      success: true, 
      url,
      fileName
    }), { 
      headers: { 'Content-Type': 'application/json' } 
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};
