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
      title: { type: 'string', title: 'Código', required: true },
      code: { type: 'string', title: 'Código' },
      race: { type: 'string', title: 'Carrera' },
      used: { type: 'boolean', title: 'Usado' },
    },
    required: ['title'],
  },

  listFields: ['title', 'race', 'used'],
  searchFields: ['title', 'code'],

  managed: true,
  isActive: true,
} satisfies CollectionConfig
