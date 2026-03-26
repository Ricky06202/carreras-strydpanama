// src/collections/races.collection.ts
import type { CollectionConfig } from '@sonicjs-cms/core'

const racesCollection: CollectionConfig = {
  name: 'races',
  displayName: 'Carreras',
  description: 'Carreras pedestres del sistema',
  icon: '🏃',

  schema: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      description: { type: 'textarea' },
      date: { type: 'date' },
      location: { type: 'string' },
      price: { type: 'number' },
    }
  },

  managed: false,
  isActive: true,
}

export default racesCollection
