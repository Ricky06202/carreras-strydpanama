// src/collections/transactions.collection.ts
import type { CollectionConfig } from '@sonicjs-cms/core'

const transactionsCollection: CollectionConfig = {
  name: 'transactions',
  displayName: 'Transacciones',
  description: 'Transacciones de pagos',
  icon: '💳',

  schema: {
    type: 'object',
    properties: {
      participant: { type: 'reference', title: 'Participante', collection: 'participants', required: true },
      yappyOrderId: { type: 'string', title: 'ID de Orden Yappy' },
      amount: { type: 'number', title: 'Monto', required: true },
      status: { type: 'select', title: 'Estado', enum: ['pending', 'completed', 'failed', 'refunded'], default: 'pending' },
    },
    required: ['participant', 'amount'],
  },

  listFields: ['participant', 'amount', 'status'],
  defaultSort: 'createdAt',
  defaultSortOrder: 'desc',

  managed: true,
  isActive: true,
}

export default transactionsCollection
