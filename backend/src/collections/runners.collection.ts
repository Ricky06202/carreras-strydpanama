// src/collections/runners.collection.ts
import type { CollectionConfig } from '@sonicjs-cms/core'

export default {
  name: 'runners',
  displayName: 'Corredores',
  description: 'Base de datos permanente de corredores registrados',
  icon: '🏅',

  schema: {
    type: 'object',
    properties: {
      title: { type: 'string', title: 'Nombre Completo', required: true },
      cedula: { type: 'string', title: 'Cédula / Pasaporte (único)' },
      firstName: { type: 'string', title: 'Nombre' },
      lastName: { type: 'string', title: 'Apellido' },
      email: { type: 'email', title: 'Email' },
      phone: { type: 'string', title: 'Teléfono' },
      birthDate: { type: 'string', title: 'Fecha de Nacimiento' },
      gender: { type: 'string', title: 'Género' },
      country: { type: 'string', title: 'País' },
      photoUrl: { type: 'string', title: 'URL de Foto' },
      totalRaces: { type: 'number', title: 'Total de Carreras Completadas' },
    },
    required: ['title'],
  },

  listFields: ['title', 'cedula', 'email', 'totalRaces'],
  searchFields: ['title', 'cedula', 'email'],

  managed: true,
  isActive: true,
} satisfies CollectionConfig
