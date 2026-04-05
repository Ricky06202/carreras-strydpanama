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
 * MANUAL OVERRIDE: SonicJS D1 DELETE Bugfix
 * Interceptamos las peticiones de borrado para ejecutarlas manualmente en D1
 */
const manualDelete = async (c: any) => {
  const id = c.req.param('id');
  const collection = c.req.param('collection');
  
  console.log(`[Manual Delete] ID: ${id}, Collection: ${collection || 'any'}`);
  
  try {
    // Intentamos borrar de la tabla 'content' (como reportó el usuario)
    // También se puede probar con 'entries' o 'content_history'
    const result = await c.env.DB.prepare('DELETE FROM content WHERE id = ?').bind(id).run();
    
    // Si existe una tabla de historial, también la limpiamos
    try {
      await c.env.DB.prepare('DELETE FROM content_history WHERE content_id = ?').bind(id).run();
    } catch(e) { /* ignore if history table doesn't exist */ }

    console.log(`[Manual Delete Success] ID: ${id}`);
    
    return c.json({ 
      success: true, 
      id, 
      message: 'Deleted manually to bypass SonicJS D1 bug',
      result 
    });
  } catch (error: any) {
    console.error(`[Manual Delete Error] ${error.message}`);
    return c.json({ success: false, error: error.message }, 500);
  }
};

// Registramos los overrides para los endpoints comunes de borrado
app.delete('/api/content/:id', manualDelete);
app.delete('/api/collections/:collection/content/:id', manualDelete);

export default app
