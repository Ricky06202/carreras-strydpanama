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
      title: { type: 'string', title: 'Nombre', required: true },
      race: { type: 'string', title: 'Carrera (ID)' },
      kilometers: { type: 'number', title: 'Kilómetros' },
      price: { type: 'number', title: 'Precio de esta Distancia ($)' },
      description: { type: 'textarea', title: 'Descripción' },
    },
    required: ['title'],
  },

  listFields: ['title', 'race', 'kilometers'],
  searchFields: ['title', 'description'],

  managed: true,
  isActive: true,
} satisfies CollectionConfig
