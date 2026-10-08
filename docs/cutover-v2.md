# Plan de cutover v2 — F7 parte operativa

El código de F7 está hecho (SEO, a11y, E2E). Esto es lo que falta para pasar a producción y **requiere acceso de Ricky**: secrets, DNS y panel de Yappy.

## 0. Secrets y OAuth (no van en el repo)
`v2/wrangler.jsonc` declara como `vars` vacíos: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `RESEND_API_KEY`, `YAPPY_MERCHANT_ID`, `YAPPY_SECRET_KEY`, `YAPPY_URL_DOMAIN`. El panel admin ya NO usa contraseña maestra: el login es con Google OAuth y la lista blanca vive en la D1 (clave `admin_emails` de `settings`, separada por comas; sin fila = nadie entra).

**Google Cloud Console** (una vez):
- Config de consentimiento OAuth: externa, con los correos de la lista como test users (o publicarla al dominar la cuenta de trabajo).
- Credenciales → OAuth client ID → tipo *Web application*:
  - Orígenes autorizados: `https://carreras.strydpanama.com` y `http://localhost:5173` (dev).
  - URI de redirección: `https://carreras.strydpanama.com/api/admin/callback` y `http://localhost:5173/api/admin/callback`.
- Copiar Client ID y Client secret.

Tras el primer deploy, establecer los secrets reales:

```bash
cd v2
bun run deploy                                   # crea/actualiza el worker carreras-strydpanama-v2
bunx wrangler secret put GOOGLE_CLIENT_ID
bunx wrangler secret put GOOGLE_CLIENT_SECRET
bunx wrangler secret put RESEND_API_KEY
bunx wrangler secret put YAPPY_MERCHANT_ID
bunx wrangler secret put YAPPY_SECRET_KEY
bunx wrangler secret put YAPPY_URL_DOMAIN
```

Lista blanca (editable sin redeploy; los correos NO van al repo):

```bash
CLOUDFLARE_ACCOUNT_ID=66f8699b20c28ad6be430da2eaa98d34 \
bunx wrangler d1 execute carreras-v2-db --remote --command \
  "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('admin_emails', '<email1>,<email2>', datetime('now'))"
```

## 1. Staging + performance
- Deploy de staging del worker v2 (URL workers.dev o dominio de staging temporal).
- Verificar migraciones aplicadas: `bunx wrangler d1 migrations list carreras-v2-db --remote`.
- Smoke E2E: `E2E_BASE=https://<staging> bun run e2e` — nota: usa `/api/setup-dev` y `/api/dev-query`, que solo responden en dev; en staging el seed ya existe, basta correr el paso de POST /api/inscripciones a mano o con el script apuntando a datos reales.
- **Lighthouse mobile > 90** en `/`, `/carreras/[slug]` y `/carrera/[slug]/inscribirse`. Si el hero WebGL pesa: verificar que parte lazy; el script de Yappy ya carga diferido.

## 2. Sincronización final de datos (noche del cutover)
- Export D1 v1 → `bun scripts/migrate.ts` (existe en v2) → verificar conteos vs v1.
- Media R2 vieja → nueva (`wrangler r2 object copy` en lote) para posters subidos después de la primer migración.

## 3. Yappy
- Cambiar la URL del webhook del panel de merchant a `https://<dominio>/api/yappy/webhook`.
- Pago de prueba real y verificación de conciliación (`/admin/inscripciones` → confirmar).

## 4. DNS
- Bajar TTL del registro `carreras` a 5 min una hora antes.
- Mover el custom domain/route a el worker v2.
- Prueba de inscripción real post-cutover + `wrangler tail` las primeras 24 h.

## 5. Desmantelar v1
- Con 7 días de estabilidad v2: apagar Pages/SonicJS (rama `cms` queda en la repo como referencia).
- Backup final: `wrangler d1 export carreras-strydpanama-db --remote` + snapshot R2 vieja.

## 6. Post-cutover
- Search Console: someter `https://carreras.strydpanama.com/sitemap.xml`.
- Rotar credenciales expuestas de v1 (ADMIN_PASSWORD/ADMIN_SECRET históricos).
- OG image dedicada (hoy la tarjeta usa solo título/desc; pendiente diseño).
