# RS Pay en carreras v2 (cobro de inscripciones)

El cobro de inscripciones pasa por **RS Pay** (`pay.rsanjur.com`) usando el comercio
**`stryd-carreras`** (método **Yappy**). El Yappy directo (`<btn-yappy>` + webhook IPN)
queda como **respaldo automático**: si faltan las llaves de RS Pay, se usa ese camino.

## Cómo se enciende

| Dónde | Qué | Valor |
|---|---|---|
| `cloudflare.config.ts` | `PAGO_RS_PAY` | `"1"` = cobrar por RS Pay · `"0"`/vacío = Yappy directo |
| `cloudflare.config.ts` | `RS_PAY_URL` | `https://pay.rsanjur.com` |
| `wrangler secret put` | `RS_PAY_API_KEY` | `api_key` del comercio `stryd-carreras` |
| `wrangler secret put` | `RS_PAY_CALLBACK_SECRET` | `callback_secret` del mismo comercio |

`rsPayActivo()` (`lib/rspay.ts`) exige **flag `"1"` + las dos llaves**: si falta cualquiera,
la inscripción se cobra por Yappy directo y nada se rompe.

## Flujo

1. El wizard de inscripción llama `POST /api/inscripciones` con `method: "yappy"`.
2. `createRegistration()` (`lib/registration/service.ts`) — con RS Pay activo — crea la
   orden server-side (`POST {RS_PAY_URL}/api/orders`, header `X-Api-Key`):
   - `concepto` = **código de confirmación** de la inscripción (`STRYD-XXXXXXXX`).
   - `monto_cents` = monto final (precio + cargo de plataforma) × 100.
   - `callback_url` = `{origin}/api/rspay/webhook`.
   - La llave **nunca** llega al navegador.
3. El navegador recibe `pay.rsPayUrl` y abre el checkout con el **helper oficial**
   `rs-pay.js` (`window.RSPay.open(url_pago, { onSuccess, onCancel })`), cargado bajo
   demanda. El helper trae el modal embebido (foco atrapado, Esc, scroll bloqueado,
   "abrir en otra pestaña"). Si no carga, se abre `url_pago` en otra pestaña.
4. RS Pay cobra por Yappy y avisa a `POST /api/rspay/webhook` firmado con
   `X-RS-Pay-Signature` = **HMAC-SHA256 hex del cuerpo crudo** con `callback_secret`.
   El webhook verifica la firma en tiempo constante y, si `estado === "pagado"`,
   llama `confirmRegistrationPayment(db, concepto, { viaIpn: true })` — el **mismo
   handler idempotente** del IPN de Yappy: marca la inscripción pagada, asigna precio
   y dispara el cupo digital (cNFT).

Respuestas del webhook: `200` procesado/ignorado · `401` firma inválida · `500` error
temporal (RS Pay reintenta).

## Configuración del comercio en RS Pay

Fila `comercios.id = 'stryd-carreras'` (D1 `rs-pay-db`, cuenta Cloudflare `rsanjur.dev`):

- `metodos = 'yappy'`
- `dominios_permitidos` = `carreras.strydpanama.com, carreras-strydpanama-v2.ricardosanjur.workers.dev`
  (sin esto el checkout embebido se rechaza por origen).
- `yappy_*` (merchant/token/secret del **merchant de Stryd Panamá**): los mismos que ya
  usa el worker `carreras-strydpanama-cms`. **Pendiente**: cargarlos aquí.

## Bloqueo actual (17/10/2026): faltan las llaves del comercio Yappy

Nadie tiene a mano el `merchantId`/`secretKey` del comercio **Stryd Panamá**. Las del
worker de producción (`carreras-strydpanama-cms`) están como *secret* de Cloudflare y
**no se pueden leer**, solo sobrescribir. Consecuencias:

1. RS Pay no puede cobrar (le faltan `yappy_*`).
2. El **Yappy directo de v2 tampoco** puede cobrar tras el cutover: necesita
   `YAPPY_MERCHANT_ID` / `YAPPY_SECRET_KEY` / `YAPPY_URL_DOMAIN` como secrets del
   worker nuevo, y hay que volver a escribirlas.

Ricky las está pidiendo (o regenerando) en el portal de Yappy de Banco General.
Cuando lleguen:

```bash
# 1) RS Pay: cargar el comercio (D1 rs-pay-db)
#    yappy_merchant_id, yappy_token, yappy_url_domain, yappy_secret_key
# 2) v2: secretos del respaldo directo
npx wrangler secret put YAPPY_MERCHANT_ID --name carreras-strydpanama-v2
npx wrangler secret put YAPPY_SECRET_KEY  --name carreras-strydpanama-v2
#    YAPPY_URL_DOMAIN tambien es obligatorio (va en cloudflare.config.ts)
# 3) encender RS Pay
#    PAGO_RS_PAY = "1" en cloudflare.config.ts y redeploy
```

**Mientras tanto** el flujo que funciona en v2 es: inscripción con pago por
transferencia/efectivo → el corredor sube el comprobante desde `/mi-portal` → el admin
lo revisa ("Ver comprobante") y confirma el pago.

## Probar

```bash
# orden manual con la api_key del comercio
curl -s -X POST https://pay.rsanjur.com/api/orders \
  -H "X-Api-Key: $RS_PAY_API_KEY" -H 'content-type: application/json' \
  -d '{"concepto":"TEST-123","monto_cents":100,"moneda":"USD",
       "callback_url":"https://carreras-strydpanama-v2.ricardosanjur.workers.dev/api/rspay/webhook",
       "metodos_permitidos":["yappy"]}' | jq
```

El `callback_url` debe ser **https público**: RS Pay no llama a `localhost`.
