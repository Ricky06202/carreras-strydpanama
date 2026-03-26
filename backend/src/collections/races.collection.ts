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
      title: {
        type: 'string',
        title: 'Nombre de la Carrera',
        required: true,
      },
      description: {
        type: 'textarea',
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
        type: 'string',
        title: 'URL del GPX de la Ruta',
      },
      imageUrl: {
        type: 'string',
        title: 'Imagen de la Carrera',
      },
      technicalInfo: {
        type: 'textarea',
        title: 'Información Técnica',
      },
      termsAndConditions: {
        type: 'textarea',
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
      timerStart: {
        type: 'number',
        title: 'Inicio Cronómetro (Timestamp)',
      },
      timerStop: {
        type: 'number',
        title: 'Fin Cronómetro (Timestamp)',
      },
    },
    required: ['title'],
  },

  listFields: ['title', 'date', 'status', 'price'],
  searchFields: ['title', 'description', 'location'],
  defaultSort: 'date',
  defaultSortOrder: 'desc',

  managed: true,
  isActive: true,
} satisfies CollectionConfig
