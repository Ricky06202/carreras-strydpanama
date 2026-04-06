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
      title: { type: 'string', title: 'Nombre de la Categoría', required: true },
      race: { type: 'string', title: 'Carrera (ID)' },
      description: { type: 'textarea', title: 'Descripción' },
      minAge: { type: 'number', title: 'Edad Mínima', required: true },
      maxAge: { type: 'number', title: 'Edad Máxima', required: true },
      gender: { 
        type: 'select', 
        title: 'Género', 
        enum: ['masculino', 'femenino', 'ambos'],
        required: true 
      },
    },
    required: ['title', 'minAge', 'maxAge', 'gender'],
  },

  listFields: ['title', 'race', 'minAge', 'maxAge', 'gender'],
  searchFields: ['title', 'description'],

  managed: true,
  isActive: true,
} satisfies CollectionConfig
