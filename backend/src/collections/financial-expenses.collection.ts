// src/collections/financial-expenses.collection.ts
import type { CollectionConfig } from '@sonicjs-cms/core'

export default {
  name: 'financial_expenses',
  displayName: 'Pagos Salientes (Cronometraje)',
  description: 'Dinero que Stryd Panama envía/paga por carrera: personal, logística, proveedores. Insumo del informe financiero.',
  icon: '💸',

  schema: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        title: 'Referencia del pago',
        required: true,
      },
      race: {
        type: 'string',
        title: 'Carrera (ID)',
        required: true,
      },
      beneficiary: {
        type: 'string',
        title: 'Beneficiario (quién lo recibe)',
      },
      amount: {
        type: 'number',
        title: 'Monto (USD)',
        required: true,
      },
      payDate: {
        type: 'date',
        title: 'Fecha del pago',
        required: true,
      },
      method: {
        type: 'select',
        title: 'Método de envío',
        enum: ['Yappy', 'Transferencia', 'Efectivo', 'Cheque', 'Otro'],
        default: 'Yappy',
      },
      reference: {
        type: 'string',
        title: 'Nº de comprobante / orden',
      },
      notes: {
        type: 'textarea',
        title: 'Notas',
      },
    },
    required: ['title', 'race', 'amount', 'payDate'],
  },

  listFields: ['title', 'race', 'beneficiary', 'amount', 'payDate', 'method'],
  searchFields: ['title', 'beneficiary', 'reference'],

  managed: true,
  isActive: true,
} satisfies CollectionConfig
