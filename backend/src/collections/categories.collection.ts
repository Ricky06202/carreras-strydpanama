// src/collections/categories.collection.ts
import type { CollectionConfig } from '@sonicjs-cms/core'

export default {
  name: 'categories',
  displayName: 'Categorías',
  description: 'Categorías de cada carrera',
  icon: '🏷️',

  schema: {
    type: 'object',
    properties: {
      title: { type: 'string', title: 'Nombre', required: true },
      race: { type: 'string', title: 'Carrera' },
      description: { type: 'textarea', title: 'Descripción' },
    },
    required: ['title'],
  },

  listFields: ['title', 'race'],
  searchFields: ['title', 'description'],

  managed: true,
  isActive: true,
} satisfies CollectionConfig
