# Astro Starter Kit: Basics

```sh
bun create astro@latest -- --template basics
```

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
/
├── public/
│   └── favicon.svg
├── src
│   ├── assets
│   │   └── astro.svg
│   ├── components
│   │   └── Welcome.astro
│   ├── layouts
│   │   └── Layout.astro
│   └── pages
│       └── index.astro
└── package.json
```

To learn more about the folder structure of an Astro project, refer to [our guide on project structure](https://docs.astro.build/en/basics/project-structure/).

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `bun install`             | Installs dependencies                            |
| `bun dev`             | Starts local dev server at `localhost:4321`      |
| `bun build`           | Build your production site to `./dist/`          |
| `bun preview`         | Preview your build locally, before deploying     |
| `bun astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `bun astro -- --help` | Get help using the Astro CLI                     |

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).

---

## Pago de inscripciones con RS Pay (EMBEBIDO, detras de flag)

Las inscripciones se pagan con **Yappy directo** (`<btn-yappy>`) o, si se enciende el flag, con
**RS Pay** (`pay.rsanjur.com`) cobrando la inscripcion por el mismo motor. **El flag esta APAGADO por
defecto**: con `PAGO_RS_PAY=0` (o ausente) el sitio se comporta **exactamente** como hoy.

### El flag

```jsonc
// frontend/wrangler.jsonc
"vars": { "PAGO_RS_PAY": "0", "RS_PAY_URL": "https://pay.rsanjur.com" }
```

- `PAGO_RS_PAY = "1"` **o** `pagoRsPay: true` en la carrera (SonicJS) encienden el flujo
  (`rsPayActivo()` en `frontend/src/lib/rsPay.ts`).
- Apagado, `POST /api/rs-pay/checkout` responde **404** y el frontend sigue con `<btn-yappy>`.
- Secretos (solo en el worker, nunca en el navegador): `RS_PAY_API_KEY`,
  `RS_PAY_CALLBACK_SECRET`.

### Como funciona (flujo embebido)

1. El frontend registra la inscripcion como **pendiente** (`/api/register`) y crea la orden en RS Pay
   server-side (`POST /api/rs-pay/checkout` -> `{ url_pago, token, rs_pay }`).
2. **NO redirige.** Abre el checkout con el **helper existente de RS Pay** (`rs-pay.js`,
   `window.RSPay.open(url_pago, { onSuccess, onCancel })`) — el mismo mecanismo que documentan
   `pay.rsanjur.com/marca` y `/docs`. El helper carga el checkout **embebido en un modal** (iframe a
   `/p/{token}?embed=1&parent={origen del sitio}`), sin que el usuario salga del sitio.
   No se inventa un modal propio: se reusa el del helper (que ya trae foco atrapado, `Esc`, scroll del
   fondo bloqueado y "Abrir en otra pestaña").
3. RS Pay confirma el pago (Yappy) y **avisa por `postMessage`**:
   `{ origen: "rs-pay", tipo: "pagado"|"expirado"|"cancelado", orden: { id, estado } }`.
   El helper lo escucha, cierra su modal y dispara `onSuccess`; carreras entonces muestra la
   confirmacion en la propia pagina (mismo comportamiento que hoy al volver del pago).
4. **Respaldo:** si el `postMessage` no llega, el propio helper consulta
   `GET {RS_PAY_URL}/api/orders/{token}` y actua igual. Si el helper no llega a cargar (red/bloqueo de
   terceros), carreras abre `url_pago` en otra pestaña como escape.
5. La inscripcion la confirma el **webhook** de RS Pay (`POST /api/rs-pay/webhook`, firma HMAC), que
   reutiliza `confirmYappyOrder()` — el mismo handler idempotente de Yappy.

### Como se embebe en CUALQUIER sitio (el helper)

```html
<script src="https://pay.rsanjur.com/rs-pay.js"></script>
<!-- Boton listo: crea la orden y abre el checkout en el modal -->
<rs-pay-button monto="12.50" concepto="Pedido #1042" api-key="***"></rs-pay-button>
```

```js
// Si tu backend ya creo la orden:
var host = window.RSPay.open(orden.url_pago, {
  onSuccess: function (e) { /* e.orden -> { id, estado } */ },
  onCancel:  function (e) { /* cierre manual, o e.estado = "expirado"|"cancelado" */ },
});
// host.close();   // o eventos: rs-pay:success | rs-pay:cancel | rs-pay:error

// Para sitios SIN el helper, el checkout embebido avisa por postMessage:
window.addEventListener('message', function (e) {
  if (e.origin !== 'https://pay.rsanjur.com') return;
  if (!e.data || e.data.origen !== 'rs-pay') return;   // { origen, tipo, orden:{id,estado} }
});
```

carreras carga el helper **bajo demanda** (solo al iniciar el pago con el flag encendido), para no meter
un script de terceros en el resto del sitio.

### Accesibilidad y fallback

- Foco **atrapado** en el modal, se cierra con **Esc**, y el fondo **no scrollea** mientras esta abierto.
- Enlace **"Abrir en otra pestaña"** (`url_pago`, checkout normal) por si el modal falla (navegadores
  raros, bloqueo de terceros).

### Limite conocido (celular)

Aunque el pago va embebido, en el celular la app de **Yappy** puede tomar la pantalla al pagar (deep
link del banco). Eso **no lo controla la web**: si pasa, el usuario vuelve al navegador y el pago se
confirma igual. Por eso el enlace "Abrir en otra pestaña" queda a la vista.
