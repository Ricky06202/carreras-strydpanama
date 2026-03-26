// src/collections/races.collection.ts
import type { CollectionConfig } from '@sonicjs-cms/core'

const racesCollection: CollectionConfig = {
  name: 'races',
  displayName: 'Carreras',
  description: 'Carreras pedestres del sistema',
  icon: '🏃',

  schema: {
    type: 'object',
    properties: {
      name: { type: 'string', title: 'Nombre de la Carrera' },
      description: { type: 'textarea', title: 'Descripción' },
      date: { type: 'date', title: 'Fecha' },
      startTime: { type: 'string', title: 'Hora de Inicio' },
      location: { type: 'string', title: 'Ubicación' },
      routeGpxUrl: { type: 'string', title: 'URL del GPX de la Ruta' },
      imageUrl: { type: 'string', title: 'Imagen de la Carrera' },
      technicalInfo: { type: 'textarea', title: 'Información Técnica' },
      termsAndConditions: { type: 'textarea', title: 'Términos y Condiciones' },
      price: { type: 'number', title: 'Precio', default: 0 },
      maxParticipants: { type: 'number', title: 'Máximo de Participantes' },
      status: { type: 'select', title: 'Estado', enum: ['upcoming', 'accepting', 'active', 'finished'], default: 'upcoming' },
      showTimer: { type: 'select', title: 'Mostrar Temporizador', enum: ['true', 'false'], default: 'false' },
      showShirtSize: { type: 'select', title: 'Mostrar Talla de Camiseta', enum: ['true', 'false'], default: 'true' },
    }
  },

  listFields: ['name', 'date', 'status', 'price'],
  searchFields: ['name', 'description', 'location'],
  defaultSort: 'date',
  defaultSortOrder: 'desc',

  managed: true,
  isActive: true,
}

export default racesCollection
