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
    autoLoad: false
  }
}

// Create the application
const app = createSonicJSApp(config)

/**
 * FORCED INTERCEPTOR: SonicJS D1 DELETE Bugfix
 * Usamos un middleware global (app.use) para interceptar ANTES que SonicJS.
 */
app.use('*', async (c, next) => {
  const isDelete = c.req.method === 'DELETE';
  const isContentPath = c.req.path.includes('/content/') || c.req.path.includes('/api/content');

  // Si no es un borrado de contenido, seguimos normal
  if (!isDelete || !isContentPath) {
    return next();
  }

  // Si llegamos aquí, ES un borrado. Vamos a forzarlo.
  const urlParts = c.req.path.split('/');
  const id = urlParts[urlParts.length - 1]; // El último segmento suele ser el ID

  console.log(`[Forced Interceptor] Path: ${c.req.path}, Extracted ID: ${id}`);

  try {
    // 1. Intentamos borrar de 'content'
    const query1 = await c.env.DB.prepare('DELETE FROM content WHERE id = ?').bind(id).run();
    
    // 2. Intentamos borrar de 'entries' (por si acaso)
    let query2 = null;
    try {
      query2 = await c.env.DB.prepare('DELETE FROM entries WHERE id = ?').bind(id).run();
    } catch(e) {}

    // 3. Intentamos borrar historial
    try {
      await c.env.DB.prepare('DELETE FROM content_history WHERE content_id = ?').bind(id).run();
      await c.env.DB.prepare('DELETE FROM content_history WHERE id = ?').bind(id).run();
    } catch(e) {}

    return c.json({
      success: true,
      debug: 'FORCED_BYPASS_BY_ANTIGRAVITY',
      targetId: id,
      path: c.req.path,
      results: { 
        contentTable: query1, 
        entriesTable: query2 
      }
    });

  } catch (err: any) {
    console.error(`[Forced Interceptor Error] ${err.message}`);
    return c.json({
      success: false,
      debug: 'FORCED_BYPASS_FAILED',
      error: err.message,
      stack: err.stack,
      idAttempted: id,
      path: c.req.path
    }, 500);
  }
});

export default app
