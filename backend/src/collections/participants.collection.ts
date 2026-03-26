// src/collections/participants.collection.ts
import type { CollectionConfig } from '@sonicjs-cms/core'

export default {
  name: 'participants',
  displayName: 'Participantes',
  description: 'Participantes inscritos en carreras',
  icon: '👤',

  schema: {
    type: 'object',
    properties: {
      firstName: {
        type: 'string',
        title: 'Nombre',
        required: true,
      },
      lastName: {
        type: 'string',
        title: 'Apellido',
        required: true,
      },
      email: {
        type: 'email',
        title: 'Email',
        required: true,
      },
      phone: {
        type: 'string',
        title: 'Teléfono',
      },
      birthDate: {
        type: 'date',
        title: 'Fecha de Nacimiento',
      },
      gender: {
        type: 'select',
        title: 'Género',
        enum: ['M', 'F', 'Otro'],
        enumLabels: ['Masculino', 'Femenino', 'Otro'],
      },
      race: {
        type: 'reference',
        title: 'Carrera',
        collection: 'races',
        required: true,
      },
      category: {
        type: 'reference',
        title: 'Categoría',
        collection: 'categories',
      },
      distance: {
        type: 'reference',
        title: 'Distancia',
        collection: 'distances',
      },
      teamName: {
        type: 'string',
        title: 'Nombre del Equipo',
      },
      bibNumber: {
        type: 'number',
        title: 'Número de Dorsal',
      },
      size: {
        type: 'select',
        title: 'Talla de Camiseta',
        enum: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
      },
      cedula: {
        type: 'string',
        title: 'Cédula',
      },
      country: {
        type: 'string',
        title: 'País',
      },
      paymentMethod: {
        type: 'select',
        title: 'Método de Pago',
        enum: ['yappy', 'transfer', 'card', 'cash'],
        enumLabels: ['Yappy', 'Transferencia', 'Tarjeta', 'Efectivo'],
      },
      paymentStatus: {
        type: 'select',
        title: 'Estado del Pago',
        enum: ['pending', 'paid', 'refunded'],
        enumLabels: ['Pendiente', 'Pagado', 'Reembolsado'],
        default: 'pending',
      },
      termsAccepted: {
        type: 'checkbox',
        title: 'Términos Aceptados',
        default: false,
      },
      finishTime: {
        type: 'number',
        title: 'Tiempo de Finalización (segundos)',
      },
    },
    required: ['firstName', 'lastName', 'email', 'race'],
  },

  listFields: ['firstName', 'lastName', 'email', 'race', 'paymentStatus'],
  searchFields: ['firstName', 'lastName', 'email', 'teamName'],
  defaultSort: 'createdAt',
  defaultSortOrder: 'desc',

  managed: true,
  isActive: true,
}
