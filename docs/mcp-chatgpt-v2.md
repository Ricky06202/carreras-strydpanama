# RS Connect para ChatGPT

Estado: el servidor MCP de Carrera y la API firmada de Comibox están desplegados en producción.

## Conexión

- Servidor MCP: `https://carreras.strydpanama.com/mcp`.
- Descubrimiento OAuth: `https://carreras.strydpanama.com/.well-known/oauth-authorization-server`.
- Metadatos del recurso: `https://carreras.strydpanama.com/.well-known/oauth-protected-resource`.
- OAuth 2.1 usa Dynamic Client Registration, Authorization Code, PKCE S256 y consentimiento desde una sesión administrativa.
- Para usarlo, agrega el servidor MCP como conector personalizado en ChatGPT y autoriza la cuenta administrativa. La publicación en el directorio de ChatGPT es independiente y no se hace desde el panel de Carrera.

## Arquitectura y permisos

- Endpoint MCP: `https://carreras.strydpanama.com/mcp`.
- OAuth 2.1 con Dynamic Client Registration, Authorization Code, PKCE S256 y consentimiento desde una sesión administrativa.
- Permisos OAuth independientes: `carreras:read`, `carreras:write`, `comibox:read` y `comibox:write`.
- Carreras permite consultar carreras, resúmenes e inscripciones. La importación requiere vista previa, aprobación explícita, consentimiento declarado y validación de duplicados, modalidad, categoría, capacidad y estado de carrera.
- Las inscripciones importadas empiezan como preinscritas y pendientes. Si el administrador las marca pagadas, se usa `confirmRegistrationPayment()`, que asigna dorsal, emite el cupo digital según la configuración existente y envía el correo de confirmación.
- Comibox permite buscar boxeadores, consultar informes JSON y crear boxeadores. Su API comprueba una firma HMAC por solicitud (actor, método, ruta, hash del cuerpo y clave de idempotencia), verifica el correo/rol activo y audita el ID real de persona. Consulta puede leer; editor/admin pueden escribir.
- Ningún módulo permite borrar. Informes no generan PDFs. El backend recibe JSON estructurado; los archivos fuente no se almacenan ni envían desde el backend.
- No hay llamadas al API de OpenAI desde estos servicios. ChatGPT actúa como cliente MCP.

## Configuración de producción

- Las migraciones de Carrera, incluida `0010_rs_connect_imports.sql`, están aplicadas a D1.
- `COMIBOX_RS_CONNECT_API_KEY` y `COMIBOX_RS_CONNECT_HMAC_SECRET` están configuradas en ambos Workers con los mismos valores. La URL de Comibox y el origen canónico de Carrera se declaran en `v2/cloudflare.config.ts`.
- `COMIBOX_ASSISTANT_API_KEY` permanece reservado a los clientes legacy de Comibox.
- El pipeline de producción ejecuta `bun test`, `bun run build` y el despliegue antes de poner la versión al 100% del tráfico.

## Pendientes operativos

- La persona administradora debe agregar el MCP en ChatGPT y completar el consentimiento OAuth; desplegar el servidor no instala el conector en una cuenta de ChatGPT.
- Rotar las credenciales que aparecieron históricamente en el repositorio público antes de conceder permisos de escritura. Borrar el texto del repositorio no invalida una credencial que ya se haya expuesto.
- El panel de integraciones no instala unilateralmente un complemento; si no está disponible el conector personalizado en la cuenta de ChatGPT, el botón abre el directorio.
