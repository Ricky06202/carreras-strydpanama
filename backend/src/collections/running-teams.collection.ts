// src/collections/running-teams.collection.ts
import type { CollectionConfig } from '@sonicjs-cms/core'

export default {
  name: 'running_teams',
  displayName: 'Equipos de Running',
  description: 'Equipos registrados',
  icon: '👥',

  schema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        title: 'Nombre del Equipo',
        required: true,
      },
      isApproved: {
        type: 'checkbox',
        title: 'Aprobado',
        default: false,
      },
    },
    required: ['name'],
  },

  listFields: ['name', 'isApproved'],
  searchFields: ['name'],

  managed: true,
  isActive: true,
}
