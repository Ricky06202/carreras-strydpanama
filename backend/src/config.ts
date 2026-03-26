import { defineConfig } from '@sonicjs-cms/core';

export default defineConfig({
  // Configuración de la aplicación
  app: {
    name: 'Carreras STRYD Panama',
    description: 'Sistema de gestión de carreras pedestres',
    url: 'https://carreras-strydpanama.pages.dev',
  },

  // Configuración de autenticación - Deshabilitada porque usaremos Cloudflare Zero Trust
  auth: {
    enabled: false,
    // Si en algún momento quieres habilitar auth nativa:
    // providers: ['email'],
    // sessionDuration: '7d',
  },

  // Configuración de la base de datos
  database: {
    provider: 'd1',
    // Las migraciones se manejan automáticamente
  },

  // Configuración de media (R2)
  media: {
    provider: 'r2',
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  },

  // Collections personalizadas para Carreras STRYD
  collections: {
    races: {
      name: 'Carreras',
      description: 'Carreras pedestres del sistema',
      fields: {
        name: { type: 'string', required: true },
        description: { type: 'richtext' },
        date: { type: 'date', required: true },
        startTime: { type: 'string' },
        location: { type: 'string' },
        routeGpxUrl: { type: 'string' },
        routeGeoJson: { type: 'richtext' },
        imageUrl: { type: 'media' },
        technicalInfo: { type: 'richtext' },
        termsAndConditions: { type: 'richtext' },
        price: { type: 'number', default: 0 },
        maxParticipants: { type: 'number' },
        status: { 
          type: 'select', 
          options: ['upcoming', 'accepting', 'active', 'finished'],
          default: 'upcoming'
        },
        timerStart: { type: 'number' },
        timerStop: { type: 'number' },
        showTimer: { type: 'boolean', default: false },
        showShirtSize: { type: 'boolean', default: true },
      },
    },
    categories: {
      name: 'Categorías',
      description: 'Categorías de cada carrera',
      fields: {
        name: { type: 'string', required: true },
        raceId: { type: 'reference', collection: 'races', required: true },
      },
    },
    distances: {
      name: 'Distancias',
      description: 'Distancias de cada carrera',
      fields: {
        name: { type: 'string', required: true },
        raceId: { type: 'reference', collection: 'races', required: true },
      },
    },
    participants: {
      name: 'Participantes',
      description: 'Participantes inscritos en carreras',
      fields: {
        firstName: { type: 'string', required: true },
        lastName: { type: 'string', required: true },
        email: { type: 'email', required: true },
        phone: { type: 'string' },
        birthDate: { type: 'date' },
        gender: { type: 'select', options: ['M', 'F', 'Otro'] },
        raceId: { type: 'reference', collection: 'races', required: true },
        categoryId: { type: 'reference', collection: 'categories' },
        distanceId: { type: 'reference', collection: 'distances' },
        teamName: { type: 'string' },
        teamId: { type: 'string' },
        bibNumber: { type: 'number' },
        size: { type: 'select', options: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] },
        cedula: { type: 'string' },
        country: { type: 'string' },
        codeId: { type: 'string' },
        paymentMethod: { type: 'select', options: ['yappy', 'card', 'cash'] },
        paymentStatus: { 
          type: 'select', 
          options: ['pending', 'paid', 'refunded'],
          default: 'pending'
        },
        termsAccepted: { type: 'boolean', default: false },
        finishTime: { type: 'number' },
      },
    },
    'registration-codes': {
      name: 'Códigos de Registro',
      description: 'Códigos para registro gratuito o con descuento',
      fields: {
        code: { type: 'string', required: true, unique: true },
        raceId: { type: 'reference', collection: 'races', required: true },
        used: { type: 'boolean', default: false },
        usedByParticipantId: { type: 'string' },
      },
    },
    transactions: {
      name: 'Transacciones',
      description: 'Transacciones de pagos',
      fields: {
        participantId: { type: 'reference', collection: 'participants', required: true },
        yappyOrderId: { type: 'string' },
        amount: { type: 'number', required: true },
        status: { 
          type: 'select', 
          options: ['pending', 'completed', 'failed', 'refunded'],
          default: 'pending'
        },
      },
    },
    'running-teams': {
      name: 'Equipos de Running',
      description: 'Equipos registrados',
      fields: {
        name: { type: 'string', required: true, unique: true },
        isApproved: { type: 'boolean', default: false },
      },
    },
  },

  // Plugins personalizados
  plugins: [
    // Aquí se pueden agregar plugins personalizados para lógica de negocio
  ],
});
