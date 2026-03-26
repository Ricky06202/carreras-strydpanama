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
      title: { type: 'string', title: 'Transacción' },
      participant: { type: 'reference', title: 'Participante', collection: 'participants' },
      amount: { type: 'number', title: 'Monto' },
      status: { type: 'string', title: 'Estado' },
    },
  },

  listFields: ['title', 'amount', 'status'],
  searchFields: ['title'],

  managed: true,
  isActive: true,
} satisfies CollectionConfig
