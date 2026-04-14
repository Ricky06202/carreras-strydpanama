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
      title: { type: 'string', title: 'Transacción (Code)', required: true },
      participant: { type: 'string', title: 'Participante' },
      amount: { type: 'number', title: 'Monto' },
      status: { type: 'string', title: 'Estado' },
      orderId: { type: 'string', title: 'ID de Orden' },
      payload: { type: 'string', title: 'Carga de Registro (JSON)', ui: { widget: 'textarea' } },
    },
    required: ['title', 'orderId'],
  },

  listFields: ['title', 'amount', 'status'],
  searchFields: ['title'],

  managed: true,
  isActive: true,
} satisfies CollectionConfig
