// src/collections/transactions.collection.ts
import type { CollectionConfig } from '@sonicjs-cms/core'

export default {
  name: 'transactions',
  displayName: 'Transacciones',
  description: 'Transacciones de pagos',
  icon: '💳',

  schema: {
    type: 'object',
    properties: {
      title: { type: 'string', title: 'Transacción', required: true },
      participant: { type: 'string', title: 'Participante' },
      amount: { type: 'number', title: 'Monto' },
      status: { type: 'string', title: 'Estado' },
    },
    required: ['title'],
  },

  listFields: ['title', 'amount', 'status'],
  searchFields: ['title'],

  managed: true,
  isActive: true,
} satisfies CollectionConfig
