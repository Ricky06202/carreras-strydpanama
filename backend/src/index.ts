/**
 * Carreras STRYD Panama - SonicJS Backend
 *
 * Entry point for your SonicJS headless CMS application
 */

import { createSonicJSApp, registerCollections } from '@sonicjs-cms/core'
import type { SonicJSConfig } from '@sonicjs-cms/core'

// Import collection configurations
import racesCollection from './collections/races.collection'
import categoriesCollection from './collections/categories.collection'
import distancesCollection from './collections/distances.collection'
import participantsCollection from './collections/participants.collection'
import registrationCodesCollection from './collections/registration-codes.collection'
import transactionsCollection from './collections/transactions.collection'
import runningTeamsCollection from './collections/running-teams.collection'
import runnersCollection from './collections/runners.collection'

// Register collections BEFORE creating the app
registerCollections([
  racesCollection,
  categoriesCollection,
  distancesCollection,
  participantsCollection,
  registrationCodesCollection,
  transactionsCollection,
  runningTeamsCollection,
  runnersCollection,
])

// Application configuration
const config: SonicJSConfig = {
  collections: {
    autoSync: true
  },
  plugins: {
    directory: './src/plugins',
    autoLoad: true
  }
}

// Create the application
const app = createSonicJSApp(config)

// Implementar una ruta proxy para servir imágenes desde R2 bajo el prefijo /uploads/
// Esto permite que tanto el Admin Panel como el frontend carguen fotos vía la API
app.get('/uploads/:filename', async (c) => {
  const filename = c.req.param('filename');
  
  // Usamos el binding MEDIA_BUCKET definido en wrangler.jsonc
  // @ts-ignore
  const object = await c.env.MEDIA_BUCKET.get(`uploads/${filename}`);

  if (object === null) {
    return c.notFound();
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  // Cachear agresivamente en el borde de Cloudflare
  headers.set('Cache-Control', 'public, max-age=31536000');

  return new Response(object.body, {
    headers,
  });
});

// NUEVO: Endpoint de carga personalizado para corregir la desincronización de hashes
app.post('/api/custom-upload', async (c) => {
  // Manejo manual de CORS para asegurar compatibilidad total con Astro
  c.header('Access-Control-Allow-Origin', '*');
  c.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (c.req.method === 'OPTIONS') {
    return c.body(null, 204);
  }

  try {
    const body = await c.req.parseBody();
    const file = body['file'];

    if (!file || !(file instanceof File)) {
      return c.json({ success: false, error: 'No se proporcionó ningún archivo válido' }, 400);
    }

    // Generar nombre de archivo único (Hash)
    const hash = crypto.randomUUID();
    const ext = file.name.split('.').pop() || 'jpg';
    const finalFilename = `${hash}.${ext}`;
    const bucketKey = `uploads/${finalFilename}`;

    // Subir físicamente a R2 usando el binding
    // @ts-ignore
    await c.env.MEDIA_BUCKET.put(bucketKey, await file.arrayBuffer(), {
      httpMetadata: { contentType: file.type }
    });

    // Construir la URL pública según lo solicitado
    const r2Base = (c.env as any).R2_PUBLIC_URL || 'https://pub-ddaf4243012a44c5a61699bc0719121f.r2.dev';
    const fullUrl = `${r2Base.replace(/\/$/, '')}/${bucketKey}`;

    return c.json({
      success: true,
      url: fullUrl,           // URL Funcional Completa
      file: `/${bucketKey}`,   // Ruta relativa para la DB
      name: finalFilename
    });

  } catch (error: any) {
    console.error('Error in custom-upload:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Export the application
export default app
