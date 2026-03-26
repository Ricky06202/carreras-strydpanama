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
      title: { type: 'string', title: 'Nombre del Equipo', required: true },
      isApproved: { type: 'boolean', title: 'Aprobado' },
    },
    required: ['title'],
  },

  listFields: ['title', 'isApproved'],
  searchFields: ['title'],

  managed: true,
  isActive: true,
} satisfies CollectionConfig
