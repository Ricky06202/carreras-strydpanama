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
        type: 'media',
        title: 'Archivo GPX de la Ruta',
      },
      routeEmbedCode: {
        type: 'textarea',
        title: 'Código Embed de la Ruta (iframe de Garmin, Strava, etc.)',
      },
      imageUrl: {
        type: 'media',
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
        title: 'Precio (Opcional, sobrescribe el precio base si no se configuran distancias)',
      },
      platformFee: {
        type: 'number',
        title: 'Tarifa de Plataforma de Recaudo (Ej: 0.45 de Yappy/Stripe)',
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
      startingBib: {
        type: 'number',
        title: 'Dorsal Inicial (ej: 1 o 100)',
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
      timer2Label: {
        type: 'string',
        title: 'Etiqueta 2° Cronómetro (ej: 1K Niños)',
      },
      timer2Start: {
        type: 'number',
        title: 'Inicio 2° Cronómetro (Timestamp)',
      },
      timer2Stop: {
        type: 'number',
        title: 'Fin 2° Cronómetro (Timestamp)',
      },
      teamEnabled: {
        type: 'boolean',
        title: 'Habilitar Inscripción por Equipos',
      },
      certificateArtUrl: {
        type: 'string',
        title: 'URL Arte del Certificado (fondo)',
      },
      certificateLogoUrl: {
        type: 'string',
        title: 'URL Logo para Certificado',
      },
      raffleWinners: {
        type: 'textarea',
        title: 'Ganadores de Tómbola (Historial encriptado)',
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
