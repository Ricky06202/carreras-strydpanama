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
      title: { type: 'string', title: 'Nombre' },
      description: { type: 'textarea', title: 'Descripción' },
      date: { type: 'date', title: 'Fecha' },
      location: { type: 'string', title: 'Ubicación' },
      price: { type: 'number', title: 'Precio' },
      imageUrl: { type: 'string', title: 'Imagen' },
      status: { type: 'string', title: 'Estado' },
    },
  },

  listFields: ['title', 'date', 'status', 'price'],
  searchFields: ['title', 'description', 'location'],
  defaultSort: 'date',
  defaultSortOrder: 'desc',

  managed: true,
  isActive: true,
} satisfies CollectionConfig
