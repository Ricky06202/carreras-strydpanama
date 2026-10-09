// src/collections/email-templates.collection.ts
import type { CollectionConfig } from '@sonicjs-cms/core'

export default {
  name: 'email_templates',
  displayName: 'Plantillas de Correo',
  description: 'Asuntos y cuerpos de correo que la oficina crea y reutiliza para enviar a inscritos y preinscritos.',
  icon: '✉️',
  schema: {
    type: 'object',
    properties: {
      name: { type: 'string', title: 'Nombre de la plantilla', required: true },
      subject: { type: 'string', title: 'Asunto del correo', required: true },
      body: { type: 'textarea', title: 'Cuerpo del correo (se admiten etiquetas simples y {nombre})', required: true },
      isActive: { type: 'boolean', title: 'Activa', default: true },
    },
    required: ['name', 'subject', 'body'],
  },
  listFields: ['name', 'subject', 'isActive'],
  searchFields: ['name', 'subject'],
  managed: true,
  isActive: true,
} satisfies CollectionConfig
