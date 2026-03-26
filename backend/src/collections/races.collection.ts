// src/collections/races.collection.ts
import type { CollectionConfig } from '@sonicjs-cms/core'

const racesCollection: CollectionConfig = {
  name: 'races',
  displayName: 'Carreras',
  description: 'Carreras pedestres del sistema',
  icon: '🏃',

  schema: {
    name: { type: 'string' },
    description: { type: 'text' },
    date: { type: 'date' },
    startTime: { type: 'string' },
    location: { type: 'string' },
    routeGpxUrl: { type: 'url' },
    imageUrl: { type: 'string' },
    technicalInfo: { type: 'text' },
    termsAndConditions: { type: 'text' },
    price: { type: 'number' },
    maxParticipants: { type: 'number' },
    status: { type: 'string' },
    showTimer: { type: 'boolean' },
    showShirtSize: { type: 'boolean' },
  },

  listFields: ['name', 'date', 'status', 'price'],
  searchFields: ['name', 'description', 'location'],
  defaultSort: 'date',
  defaultSortOrder: 'desc',

  managed: true,
  isActive: true,
}

export default racesCollection
