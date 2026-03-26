// src/collections/races.collection.ts
import type { CollectionConfig } from '@sonicjs-cms/core'

export default {
  name: 'races',
  displayName: 'Carreras',
  description: 'Carreras pedestres del sistema',
  icon: '🏃',

  schema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        title: 'Nombre de la Carrera',
      },
      description: {
        type: 'richtext',
        title: 'Descripción',
      },
      date: {
        type: 'date',
        title: 'Fecha',
      },
      startTime: {
        type: 'string',
        title: 'Hora de Inicio',
      },
      location: {
        type: 'string',
        title: 'Ubicación',
      },
      routeGpxUrl: {
        type: 'url',
        title: 'URL del GPX de la Ruta',
      },
      imageUrl: {
        type: 'media',
        title: 'Imagen de la Carrera',
      },
      technicalInfo: {
        type: 'richtext',
        title: 'Información Técnica',
      },
      termsAndConditions: {
        type: 'richtext',
        title: 'Términos y Condiciones',
      },
      price: {
        type: 'number',
        title: 'Precio',
      },
      maxParticipants: {
        type: 'number',
        title: 'Máximo de Participantes',
      },
      status: {
        type: 'select',
        title: 'Estado',
        enum: ['upcoming', 'accepting', 'active', 'finished'],
      },
      showTimer: {
        type: 'boolean',
        title: 'Mostrar Temporizador',
      },
      showShirtSize: {
        type: 'boolean',
        title: 'Mostrar Talla de Camiseta',
      },
    },
  },

  listFields: ['name', 'date', 'status', 'price'],
  searchFields: ['name', 'description', 'location'],
  defaultSort: 'date',
  defaultSortOrder: 'desc',

  managed: false,
  isActive: true,
} satisfies CollectionConfig
