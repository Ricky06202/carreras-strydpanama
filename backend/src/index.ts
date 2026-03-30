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

// Create and export the application
export default createSonicJSApp(config)
