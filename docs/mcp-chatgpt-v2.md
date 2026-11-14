# Carreras V2 — MCP para ChatGPT y Claude
Estado: preparado en el código, NO activado en producción.

## Autenticación y herramientas
- Servidor MCP remoto: https://carreras.strydpanama.com/mcp
- OAuth 2.1 con DCR, Authorization Code + PKCE S256, consentimiento en sesión administrativa Google, scopes carreras:read.
- Las autorizaciones se vinculan al correo verificado del administrador y son revocables desde /admin/integraciones.
- Herramientas de solo lectura: resumen_carreras y listar_carreras. No exponen nombres, cédulas ni otros datos personales.
- Tokens de acceso: 1 hora; refresh rotativo: 30 días.

## Pasos para activar
1. Respaldar D1 y aplicar v2/drizzle/0009_mcp_oauth.sql (incluye email de admin_sessions).
2. Ejecutar typecheck/build, pruebas HTTP/MCP, PKCE, revocación, expiración y CSRF.
3. Desplegar V2 tras validar seguridad. Volver a iniciar sesión para registrar el correo en la sesión administrativa.
4. Crear y probar el plugin ChatGPT con la URL /mcp. Distribuirlo según las políticas de OpenAI.
5. Configurar CARRERAS_CHATGPT_PLUGIN_URL con la URL oficial publicada https://chatgpt.com/plugins/... .
6. Activar límites de solicitudes Cloudflare WAF en /oauth/register y /oauth/token, y política de purga de filas expiradas.

El botón del panel no puede instalar unilateralmente un complemento ni vincular una cuenta de ChatGPT. Sin enlace publicado abre el directorio y explica la limitación.
