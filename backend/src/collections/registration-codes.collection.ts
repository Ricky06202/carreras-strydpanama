// src/collections/registration-codes.collection.ts
import type { CollectionConfig } from '@sonicjs-cms/core'

const registrationCodesCollection: CollectionConfig = {
  name: 'registration_codes',
  displayName: 'Códigos de Registro',
  description: 'Códigos para registro gratuito o con descuento',
  icon: '🎟️',

  schema: {
    type: 'object',
    properties: {
      code: { type: 'string', title: 'Código', required: true },
      race: { type: 'reference', title: 'Carrera', collection: 'races', required: true },
      used: { type: 'checkbox', title: 'Usado', default: false },
    },
    required: ['code', 'race'],
  },

  listFields: ['code', 'race', 'used'],
  searchFields: ['code'],

  managed: true,
  isActive: true,
}

export default registrationCodesCollection
