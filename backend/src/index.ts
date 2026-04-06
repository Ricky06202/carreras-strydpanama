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

// Export the application
export default app
