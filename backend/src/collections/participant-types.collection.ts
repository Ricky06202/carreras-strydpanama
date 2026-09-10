// src/collections/participant-types.collection.ts
import type { CollectionConfig } from '@sonicjs-cms/core'

export default {
  name: 'participant_types',
  displayName: 'Tipos de Participante',
  description: 'Tipos de participante configurables por carrera (Público General, Estudiante, Padrino, etc.)',
  icon: '👥',

  schema: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        title: 'Nombre (label que se muestra en el formulario)',
        required: true,
      },
      race: {
        type: 'string',
        title: 'Carrera (ID)',
        required: true,
      },
      key: {
        type: 'string',
        title: 'Identificador (key) — ej: general, estudiante, militar',
      },
      enabled: {
        type: 'boolean',
        title: 'Habilitado',
      },
      order: {
        type: 'number',
        title: 'Orden de aparición',
      },
      categoryKeyword: {
        type: 'string',
        title: 'Palabra clave para asignar categoría automática (opcional — ej: estudiante)',
      },
      distanceKeyword: {
        type: 'string',
        title: 'Palabra clave para preseleccionar distancia (opcional — ej: general, estudiante)',
      },
    },
    required: ['title', 'race'],
  },

  listFields: ['title', 'race', 'key', 'enabled', 'order'],
  searchFields: ['title', 'key'],

  managed: true,
  isActive: true,
} satisfies CollectionConfig