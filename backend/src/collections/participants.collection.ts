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
      title: { type: 'string', title: 'Nombre' },
      firstName: { type: 'string', title: 'Nombre' },
      lastName: { type: 'string', title: 'Apellido' },
      email: { type: 'email', title: 'Email' },
      phone: { type: 'string', title: 'Teléfono' },
      race: { type: 'reference', title: 'Carrera', collection: 'races' },
      category: { type: 'reference', title: 'Categoría', collection: 'categories' },
      distance: { type: 'reference', title: 'Distancia', collection: 'distances' },
      teamName: { type: 'string', title: 'Equipo' },
      bibNumber: { type: 'number', title: 'Dorsal' },
      size: { type: 'string', title: 'Talla' },
      paymentStatus: { type: 'string', title: 'Pago' },
    },
  },

  listFields: ['title', 'email', 'race', 'paymentStatus'],
  searchFields: ['title', 'email', 'teamName'],

  managed: true,
  isActive: true,
} satisfies CollectionConfig
