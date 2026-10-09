// src/collections/email-log.collection.ts
import type { CollectionConfig } from '@sonicjs-cms/core'

export default {
  name: 'email_log',
  displayName: 'Bitácora de Correos',
  description: 'Registro de cada lote de correos enviado: fecha, asunto, tipo de destinatarios, cantidad y resultado. También alimenta el contador del cupo diario de Resend.',
  icon: '📨',
  schema: {
    type: 'object',
    properties: {
      date: { type: 'date', title: 'Fecha', required: true },
      subject: { type: 'string', title: 'Asunto', required: true },
      audience: { type: 'select', title: 'Destinatarios', enum: ['todos', 'inscritos', 'preinscritos', 'individual'], required: true },
      race: { type: 'string', title: 'Carrera (ID)' },
      raceTitle: { type: 'string', title: 'Carrera (nombre)' },
      campaignId: { type: 'string', title: 'ID de campaña (agrupa los lotes)' },
      recipients: { type: 'number', title: 'Destinatarios intentados' },
      sent: { type: 'number', title: 'Enviados' },
      failed: { type: 'number', title: 'Fallidos' },
      skippedNoEmail: { type: 'number', title: 'Omitidos sin correo' },
      details: { type: 'textarea', title: 'Detalle (correos enviados, separados por coma)' },
      status: { type: 'select', title: 'Estado', enum: ['completado', 'pausado', 'error'], default: 'completado' },
    },
    required: ['date', 'subject', 'audience'],
  },
  listFields: ['date', 'subject', 'audience', 'raceTitle', 'sent', 'failed', 'status'],
  searchFields: ['subject', 'raceTitle'],
  managed: true,
  isActive: true,
} satisfies CollectionConfig
