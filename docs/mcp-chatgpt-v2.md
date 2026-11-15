# RS Connect para ChatGPT

Estado: implementación local; no desplegada ni habilitada en producción.

## Arquitectura y permisos

- Endpoint MCP: `https://carreras.strydpanama.com/mcp`.
- OAuth 2.1 con Dynamic Client Registration, Authorization Code, PKCE S256 y consentimiento desde una sesión administrativa.
- Permisos OAuth independientes: `carreras:read`, `carreras:write`, `comibox:read` y `comibox:write`.
- Carreras permite consultar carreras, resúmenes e inscripciones. La importación requiere vista previa, aprobación explícita, consentimiento declarado y validación de duplicados, modalidad, categoría, capacidad y estado de carrera.
- Las inscripciones importadas empiezan como preinscritas y pendientes. Si el administrador las marca pagadas, se usa `confirmRegistrationPayment()`, que asigna dorsal, emite el cupo digital según la configuración existente y envía el correo de confirmación.
- Comibox permite buscar boxeadores, consultar informes JSON y crear boxeadores. Su API comprueba una firma HMAC por solicitud (actor, método, ruta, hash del cuerpo y clave de idempotencia), verifica el correo/rol activo y audita el ID real de persona. Consulta puede leer; editor/admin pueden escribir.
- Ningún módulo permite borrar. Informes no generan PDFs. El backend recibe JSON estructurado; los archivos fuente no se almacenan ni envían desde el backend.
- No hay llamadas al API de OpenAI desde estos servicios. ChatGPT actúa como cliente MCP.

## Preparación antes de producción

1. Revisar el diff y respaldar D1.
2. Aplicar las migraciones pendientes de `v2/drizzle`, incluida `0009_mcp_oauth.sql` y la nueva `0010_rs_connect_imports.sql`.
3. Configurar en ambos Workers los secretos dedicados `COMIBOX_RS_CONNECT_API_KEY` y `COMIBOX_RS_CONNECT_HMAC_SECRET` con los mismos valores. Configurar `COMIBOX_API_URL` como variable HTTPS en Carrera. `COMIBOX_ASSISTANT_API_KEY` sigue reservado a los clientes legacy de Comibox.
4. Rotar las credenciales que siguen expuestas en el repositorio público antes de activar esta integración.
5. Validar build, pruebas OAuth/PKCE/CSRF/revocación, firmas y permisos firmados de Comibox, vista previa/aprobación/idempotencia de importaciones, pagos pagados y reintentos.
6. Desplegar ambos Workers en coordinación y probar con administradores de lectura y escritura. Publicar y configurar el conector de ChatGPT por separado.

El panel de integraciones no instala unilateralmente un complemento. Hasta que se publique y configure el conector, el botón abre el directorio de ChatGPT.
