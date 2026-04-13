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
      title: { type: 'string', title: 'Identificador del Código', required: true },
      code: { type: 'string', title: 'Código Promocional' },
      race: { type: 'string', title: 'ID de la Carrera (fk)' },
      vendor: { type: 'string', title: 'Punto de Venta / Vendedor físico' },
      batchId: { type: 'string', title: 'Lote de Entrega' },
      status: {
        type: 'select',
        title: 'Estado del Código',
        enum: ['generated', 'sold', 'redeemed'],
      },
      usedDate: { type: 'date', title: 'Fecha de Canje' },
      redeemedBy: { type: 'string', title: 'Canjeado Por (Nombre)' },
      redeemedByCedula: { type: 'string', title: 'Cédula del Canjeador' },
      allowedType: {
        type: 'select',
        title: 'Aplica Para (Tipo de Registro)',
        enum: ['all', 'general', 'estudiante', 'team'],
        default: 'all'
      },
    },
    required: ['title', 'code', 'race', 'allowedType'],
  },

  listFields: ['title', 'code', 'vendor', 'status'],
  searchFields: ['title', 'code', 'vendor', 'batchId'],

  managed: true,
  isActive: true,
} satisfies CollectionConfig
