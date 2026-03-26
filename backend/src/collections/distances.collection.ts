// src/collections/distances.collection.ts
import type { CollectionConfig } from '@sonicjs-cms/core'

export default {
  name: 'distances',
  displayName: 'Distancias',
  description: 'Distancias de cada carrera',
  icon: '📏',

  schema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        title: 'Nombre de la Distancia',
        required: true,
      },
      race: {
        type: 'reference',
        title: 'Carrera',
        collection: 'races',
        required: true,
      },
    },
    required: ['name', 'race'],
  },

  listFields: ['name', 'race'],
  searchFields: ['name'],

  managed: true,
  isActive: true,
}
