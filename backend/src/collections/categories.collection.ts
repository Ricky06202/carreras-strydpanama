// src/collections/categories.collection.ts
import type { CollectionConfig } from '@sonicjs-cms/core'

const categoriesCollection: CollectionConfig = {
  name: 'categories',
  displayName: 'Categorías',
  description: 'Categorías de cada carrera',
  icon: '🏷️',

  schema: {
    type: 'object',
    properties: {
      name: { type: 'string', title: 'Nombre de la Categoría', required: true },
      race: { type: 'reference', title: 'Carrera', collection: 'races', required: true },
    },
    required: ['name', 'race'],
  },

  listFields: ['name', 'race'],
  searchFields: ['name'],

  managed: true,
  isActive: true,
}

export default categoriesCollection
