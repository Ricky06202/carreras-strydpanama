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
      title: { type: 'string', title: 'Nombre' },
      race: { type: 'reference', title: 'Carrera', collection: 'races' },
      kilometers: { type: 'number', title: 'Kilómetros' },
      description: { type: 'textarea', title: 'Descripción' },
    },
  },

  listFields: ['title', 'race', 'kilometers'],
  searchFields: ['title', 'description'],

  managed: true,
  isActive: true,
} satisfies CollectionConfig
