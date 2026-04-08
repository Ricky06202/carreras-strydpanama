// src/collections/participants.collection.ts
import type { CollectionConfig } from '@sonicjs-cms/core'

export default {
  name: 'participants',
  displayName: 'Participantes',
  description: 'Participantes inscritos en carreras',
  icon: '👤',

  schema: {
    type: 'object',
    properties: {
      title: { type: 'string', title: 'Nombre Completo', required: true },
      firstName: { type: 'string', title: 'Nombre' },
      lastName: { type: 'string', title: 'Apellido' },
      email: { type: 'email', title: 'Email' },
      phone: { type: 'string', title: 'Teléfono' },
      cedula: { type: 'string', title: 'Cédula/Pasaporte' },
      birthDate: { type: 'string', title: 'Fecha Nacimiento' },
      gender: { type: 'string', title: 'Género' },
      country: { type: 'string', title: 'País' },
      race: { type: 'string', title: 'Carrera' },
      category: { type: 'string', title: 'Categoría' },
      distance: { type: 'string', title: 'Distancia' },
      teamName: { type: 'string', title: 'Equipo' },
      photoUrl: { type: 'string', title: 'URL de Foto del Corredor' },
      runnerId: { type: 'string', title: 'ID en Base de Corredores' },
      bibNumber: { type: 'number', title: 'Dorsal' },
      size: { type: 'string', title: 'Talla' },
      paymentStatus: { type: 'string', title: 'Pago' },
      finishTime: { type: 'number', title: 'Tiempo de Llegada (s)' },
      receiptUrl: { type: 'string', title: 'URL Comprobante de Pago' },
      studentIdUrl: { type: 'string', title: 'URL Foto Cédula' },
      matriculaUrl: { type: 'string', title: 'URL Foto Matrícula' },
      confirmationCode: { type: 'string', title: 'Código de Confirmación (STRYD-XXXX)' },
      participantType: { type: 'string', title: 'Tipo de Participante (general/estudiante/docente/administrativo)' },
      categoryName: { type: 'string', title: 'Nombre de Categoría' },
      distanceName: { type: 'string', title: 'Nombre de Distancia' },
      registrationType: { type: 'string', title: 'Tipo de Registro (individual/team)' },
      checkpointTime: { type: 'number', title: 'Tiempo en Retorno (s)' },
    },
    required: ['title', 'firstName', 'lastName', 'email'],
  },

  listFields: ['title', 'email', 'race', 'paymentStatus'],
  searchFields: ['title', 'email', 'teamName'],

  managed: true,
  isActive: true,
} satisfies CollectionConfig
