// src/collections/registration-codes.collection.ts
import type { CollectionConfig } from '@sonicjs-cms/core'

export default {
  name: 'registration_codes',
  displayName: 'Códigos de Registro',
  description: 'Códigos para registro gratuito o con descuento',
  icon: '🎟️',

  schema: {
    type: 'object',
    properties: {
      title: { type: 'string', title: 'Código' },
      code: { type: 'string', title: 'Código' },
      race: { type: 'reference', title: 'Carrera', collection: 'races' },
      used: { type: 'boolean', title: 'Usado' },
    },
  },

  listFields: ['title', 'race', 'used'],
  searchFields: ['title', 'code'],

  managed: true,
  isActive: true,
} satisfies CollectionConfig
