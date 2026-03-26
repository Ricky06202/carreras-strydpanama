// src/collections/races.collection.ts
import type { CollectionConfig } from '@sonicjs-cms/core'

export default {
  name: 'races',
  displayName: 'Carreras',
  description: 'Carreras pedestres del sistema',
  icon: '🏃',

  schema: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        title: 'Nombre',
      },
      content: {
        type: 'textarea',
        title: 'Contenido',
      },
    },
  },

  listFields: ['title'],
  searchFields: ['title', 'content'],
  defaultSort: 'createdAt',
  defaultSortOrder: 'desc',

  managed: true,
  isActive: true,
} satisfies CollectionConfig
