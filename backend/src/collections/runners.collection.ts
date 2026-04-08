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
      // Perfil público
      bio: { type: 'textarea', title: 'Bio como Corredor' },
      publicProfile: { type: 'boolean', title: 'Perfil Público Visible' },
      publicFields: { type: 'textarea', title: 'Campos Públicos (JSON: {bio,records,gear,races,gallery,social})' },
      // Redes sociales
      instagram: { type: 'string', title: 'Instagram (@usuario)' },
      strava: { type: 'string', title: 'Strava (URL o usuario)' },
      facebook: { type: 'string', title: 'Facebook (@usuario)' },
      tiktok: { type: 'string', title: 'TikTok (@usuario)' },
      // Fotos adicionales
      bannerUrl: { type: 'string', title: 'URL Foto de Portada/Banner' },
      galleryPhotos: { type: 'textarea', title: 'Galería de Fotos (JSON array de URLs)' },
      // Marcas y logros
      personalRecords: { type: 'textarea', title: 'Marcas Personales (JSON: [{distance,time,date}])' },
      favoriteRaces: { type: 'textarea', title: 'Carreras Destacadas (JSON: [{name,year,time}])' },
      plannedRaces: { type: 'textarea', title: 'Próximas Carreras (JSON: [{name,date}])' },
      // Equipamiento
      gearWatch: { type: 'string', title: 'Reloj (ej: Garmin Forerunner 965)' },
      gearShoes: { type: 'string', title: 'Zapatillas (ej: Nike Alphafly 3)' },
      gearElectrolyte: { type: 'string', title: 'Electrolitos (ej: Maurten Gel 100)' },
      gearOther: { type: 'string', title: 'Otro Equipo' },
      // Autenticación de perfil
      passwordHash: { type: 'string', title: 'Hash de Contraseña (PBKDF2)' },
      passwordSalt: { type: 'string', title: 'Salt de Contraseña' },
      sessionToken: { type: 'string', title: 'Token de Sesión Activo' },
      sessionExpiry: { type: 'number', title: 'Expiración de Sesión (timestamp ms)' },
    },
    required: ['title'],
  },

  listFields: ['title', 'cedula', 'email', 'totalRaces', 'publicProfile'],
  searchFields: ['title', 'cedula', 'email'],

  managed: true,
  isActive: true,
} satisfies CollectionConfig
