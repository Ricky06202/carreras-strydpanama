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
      title: { type: 'string', title: 'Nombre' },
      race: { type: 'reference', title: 'Carrera', collection: 'races' },
      description: { type: 'textarea', title: 'Descripción' },
    },
  },

  listFields: ['title', 'race'],
  searchFields: ['title', 'description'],

  managed: true,
  isActive: true,
} satisfies CollectionConfig
