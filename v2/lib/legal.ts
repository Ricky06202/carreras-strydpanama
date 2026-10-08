// Fuente única de los términos legales de la plataforma.
// Se versiona aquí y el registro de consentimiento guarda versión + hash del texto exacto.

export const TERMS_VERSION = "2026-10-08";
export const TERMS_UPDATED_LABEL = "8 de octubre de 2026";

export type LegalSection = { h: string; p: string; bullets?: string[] };

export const TERMS_SECTIONS: LegalSection[] = [
  {
    h: "1. Aceptación de los Términos",
    p: "Al acceder y utilizar esta plataforma de registro para eventos organizados por Stryd Panama y sus filiales, usted acepta estar sujeto a estos Términos y Condiciones y al Aviso de Privacidad. Si no está de acuerdo con alguna parte, por favor absténgase de utilizar nuestros servicios de registro de carreras.",
  },
  {
    h: "2. Inscripción, Pagos y Reembolsos",
    p: "",
    bullets: [
      "Todas las inscripciones son personales e intransferibles.",
      "El registro no quedará en firme hasta que se haya completado el pago en su totalidad o el estado figure como \"Pagado\" (Válido para pagos mediante Yappy/ACH).",
      "Stryd Panama canceló el evento: se devuelve el 100% del monto pagado por el mismo medio de pago, en un plazo máximo de 30 días calendario, sin necesidad de solicitud.",
      "El participante no puede asistir por razones personales (enfermedad, lesión, mudanza, viaje): no hay devolución del pago, pero podrá solicitar una vez, con al menos 7 días naturales de anticipación, el crédito del monto pagado para la siguiente edición de la misma carrera, escribiendo a carreras@strydpanama.com con su código de confirmación.",
      "Casos de fuerza mayor comprobable que impidan la participación del corredor (impedimento de salud grave documentado): la organizadora evaluará la devolución del pago menos la comisión de la pasarela de pago, decisión que comunicará por escrito en un plazo de 15 días hábiles.",
      "No se devuelve el pago por no presentar (DNS) ni por no completar la carrera.",
      "Toda solicitud se resuelve por correo electrónico al código de inscripción; la respuesta se envía dentro de los 15 días hábiles siguientes a la solicitud.",
    ],
  },
  {
    h: "3. Salud y Condición Física",
    p: "Al inscribirse, el participante certifica tener un estado de salud físico óptimo y haber entrenado adecuadamente para completar la carrera en la que se registra. Stryd Panama y los patrocinadores no se hacen responsables por afecciones médicas o emergencias ocurridas durante el evento producto de patologías previas de los corredores.",
  },
  {
    h: "4. Privacidad de Datos",
    p: "El tratamiento de sus datos personales se rige por nuestro Aviso de Privacidad (disponible en /privacidad) y por la Ley 81 de 2019 de Protección de Datos Personales. La información recopilada mediante el formulario de inscripción se utilizará exclusivamente para fines logísticos de la carrera, generación de Dorsales (BIBs), chips de rastreo en ciertos eventos y contacto directo. No vendemos ni compartimos sus datos con entidades publicitarias de terceros. Para ejercer sus derechos de acceso, rectificación, cancelación, oposición o revocación, escriba a carreras@strydpanama.com.",
  },
  {
    h: "5. Derechos de Autor y Medios",
    p: "Su inscripción al evento le concede a Stryd Panama los derechos para grabar, usar y publicar fotografías, videos y audios tomados durante el evento en nuestras redes sociales, páginas web y para propósitos de marketing futuro. Usted puede oponerse a este uso en cualquier momento escribiendo a carreras@strydpanama.com; al recibir la solicitud, dejaremos de publicar nuevo material con su imagen identificable.",
  },
  {
    h: "6. Modificaciones, Suspensión o Cancelación de Evento",
    p: "Solo por causas justificadas (tormentas tropicales extremas, condiciones de rutas caóticas o requerimientos gubernamentales) podrá modificarse el horario, fecha o rutas del evento, comunicándolo por los canales oficiales. Si el cambio es sustancial (fecha, hora de salida o ruta), el participante podrá retirar su inscripción con derecho a devolución del 100% del pago, dentro de los 7 días naturales siguientes a la comunicación del cambio. Si el evento se reprograma por fuerza mayor y el participante acepta la nueva fecha, se mantiene su inscripción sin cambios.",
  },
  {
    h: "7. Participantes Menores de Edad",
    p: "Las inscripciones de menores de 18 años deben ser realizadas o autorizadas expresamente por su padre, madre o tutor legal, quien declara aceptar estos términos en nombre del menor. La organizadora trata los datos de menores conforme al Capítulo correspondiente de la Ley 81 de 2019.",
  },
  {
    h: "8. Legislación Aplicable",
    p: "Estos términos se rigen por las leyes de la República de Panamá. Nada en este documento impide al participante acudir a la Autoridad Nacional de Transparencia, Acceso a la Información y Protección de Datos Personales (ANPD) o a las autoridades de protección al consumidor.",
  },
];

export const PRIVACY_UPDATED_LABEL = "8 de octubre de 2026";

export const PRIVACY_SECTIONS: LegalSection[] = [
  {
    h: "1. Responsable del tratamiento",
    p: "Stryd Panama — organizadora de eventos deportivos, con domicilio en Ciudad de Panamá, Panamá. Contacto para asuntos de datos personales: carreras@strydpanama.com. (Pendiente de completar ante la ANPD: razón social registrada, RUC y domicilio legal.)",
  },
  {
    h: "2. Datos que recolectamos",
    p: "",
    bullets: [
      "Identificación: nombre completo, cédula o pasaporte, fecha de nacimiento, género.",
      "Contacto: correo electrónico y teléfono celular.",
      "Deportivos: modalidad/categoría elegida, dorsal (BIB), tiempos de carrera, resultados.",
      "Logísticos: talla de camiseta, equipo, dirección de envío (si aplica), código de confirmación y estado de pago.",
      "Credenciales de cuenta (si crea usuario): correo y contraseña cifrada con hash + sal; nunca guardamos la contraseña en texto plano.",
      "En categorías especiales: foto de carné estudiantil y constancia de matrícula.",
      "Imagen: fotografías y videos tomados durante el evento (ver sección de oposición).",
    ],
  },
  {
    h: "3. Finalidades del tratamiento",
    p: "Gestionar la inscripción y el pago, generar dorsales y chips de rastreo, cronometrar y publicar resultados oficiales, entregar kits, contactarlo para avisos operativos del evento (horarios, cambios, seguridad) y, con su aceptación, fines de difusión del evento. No comercializamos ni alquilamos sus datos.",
  },
  {
    h: "4. Base legal",
    p: "Consentimiento expreso otorgado al marcar las casillas durante la inscripción (términos y este aviso), ejecutado mediante registro de versión, fecha y huella digital del texto aceptado, y la ejecución del contrato de inscripción.",
  },
  {
    h: "5. Proveedores y transferencias internacionales",
    p: "Para operar el servicio compartimos datos mínimos con proveedores: Cloudflare (infraestructura y base de datos, con centros de datos fuera de Panamá), la pasarela Yappy/ACH (solo los datos necesarios para cobrar) y Resend (envío de correos de confirmación y resultados). Estos encargados tratan los datos únicamente por nuestra cuenta y según este aviso. Al inscribirse usted acepta estas transferencias necesarias para prestar el servicio.",
  },
  {
    h: "6. Retención",
    p: "Conservamos su inscripción y resultados mientras la plataforma esté activa, para el historial oficial de la carrera y para resolver reclamaciones (hasta 5 años después del evento, o el plazo legal aplicable si fuera mayor). Puede solicitar la supresión de sus datos; mantendremos solo los registros mínimos exigidos por ley (comprobantes de pago).",
  },
  {
    h: "7. Sus derechos (Ley 81 de 2019)",
    p: "Usted puede solicitar acceso, rectificación, cancelación, oposición (incluido el uso de su imagen) y revocación del consentimiento. Escríbanos a carreras@strydpanama.com desde el correo registrado; responderemos dentro de 15 días hábiles. Si no queda conforme, puede acudir a la ANPD.",
  },
  {
    h: "8. Seguridad y navegación",
    p: "Aplicamos medidas razonables: transporte cifrado (HTTPS), contraseñas con hash, acceso administrativo restringido. La página usa almacenamiento local del navegador únicamente para reanudar un pago interrumpido; no usamos cookies publicitarias.",
  },
  {
    h: "9. Menores de edad",
    p: "Los datos de menores de 18 años se tratan solo con autorización de padre, madre o tutor (ver términos, sección 7) y con las medidas reforzadas del Capítulo de la Ley 81 de 2019 sobre datos de menores.",
  },
];

// Texto canónico para huella digital (misma fuente que renderiza /terminos).
export function termsCanonicalText(): string {
  return TERMS_SECTIONS.map((s) => [s.h, s.p, ...(s.bullets ?? [])].filter(Boolean).join("\n")).join(
    "\n\n",
  );
}

export async function termsTextHash(): Promise<string> {
  const data = new TextEncoder().encode(`${TERMS_VERSION}\n${termsCanonicalText()}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
