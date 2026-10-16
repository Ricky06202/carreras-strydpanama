# RS ID en carreras v2 — cableado del SSO

Estado: **código listo y commiteado en `v2`** (no desplegado). Falta poner los
secretos y probar en staging.

## Qué se hizo

| Pieza | Archivo |
| --- | --- |
| Cliente del worker de identidad (canje, cupos, allowlist) | `v2/lib/rsid.ts` |
| Endpoint que cierra el SSO | `v2/app/api/auth/canjear/route.ts` |
| Botón "Entrar con RS ID" + avisos | `v2/app/entrar/page.tsx` |
| Form (alta por RS ID, correo verificado) | `v2/components/account/AuthForm.tsx` |
| Vars (`ID_ORIGEN`, `RS_ID_PANEL_EMAILS`) | `v2/cloudflare.config.ts` |

## Cómo funciona el flujo

1. El corredor toca **"Entrar con RS ID"** en `/entrar`.
2. Va a `https://id.rsanjur.com/id?volver=<origen>/api/auth/canjear[?volver=<ruta>]`.
3. El RS ID valida (código por correo) y redirige de vuelta a
   `<origen>/api/auth/canjear?rsid=<código>`.
4. `canjear` llama a `POST id.rsanjur.com/api/auth/canjear` con el código + el
   **secreto de app** (`x-rsid-app-secret`) y obtiene `{ email, cuenta_id }`.
5. - Correo **ya tiene runner** → abre sesión (`stryd2_session`) → `/mi-portal`
     (o `/admin` si está en la allowlist del panel).
   - Correo **sin runner** → `/entrar?rsid_alta=1&email=…` para completar la
     cuenta (la **cédula es obligatoria** y el SSO no la trae).

Regla de oro: **best-effort**. Si el RS ID no responde o el código es inválido,
nada se rompe: vuelve al login con un aviso. El login por correo/contraseña
sigue funcionando igual.

## Por qué el alta no crea la cuenta sola

`runners.cedula` es `NOT NULL UNIQUE`. El RS ID no entrega cédula, así que
inventarla sería un dato falso que además choca con el índice único. Por eso el
alta por RS ID pide la cédula una vez; de ahí en adelante ya entra directo.

## Secretos / variables (producción y staging)

Secrets (`wrangler secret put`, nunca al repo):
- `RS_ID_MOD_SECRET` — debe ser **el mismo** `RS_ID_CANJE_SECRET` del worker
  `rs-id`. Es el `x-rsid-app-secret` que autoriza el canje.

Vars (por entorno, `var` o `bindings.text`):
- `ID_ORIGEN` — `https://id.rsanjur.com` (default ya puesto en el config).
- `RS_ID_PANEL_EMAILS` — correos con acceso al panel de la mesa,
  coma-separados. Default en código: `eysbel@gmail.com,ricardosanjurg@gmail.com`.

Sin `RS_ID_MOD_SECRET`, el botón **no aparece** (`rsidListo()` es false) y el
canje responde `no_configurado`. Cero riesgo de dejar algo a medias.

## Probar en staging

El origen de vuelta se arma desde el host real de la petición, así que el RS ID
acepta `*.workers.dev` (está en su lista blanca), `localhost` y
`*.strydpanama.com`.

1. Poner el secreto en staging:
   `wrangler secret put RS_ID_MOD_SECRET` (mismo valor que en rs-id).
2. Desplegar `v2` a `v2.ricardosanjur.workers.dev`.
3. Abrir `/entrar`, verificar que aparece **"Entrar con RS ID"**.
4. Tocar el botón → debe llevar a `id.rsanjur.com/id?volver=…`.
5. Entrar con un correo que **ya tenga cuenta** en carreras → debe caer en
   `/mi-portal` con sesión.
6. Repetir con un correo **sin** cuenta → debe caer en `/entrar?rsid_alta=1` con
   el correo precargado y bloqueado.
7. Probar el correo de la allowlist (mesa) → debe caer en `/admin`.

## Pendientes (fuera de este cableado)

- **RS Pay**: aún sin integrar (ver `docs/backlog-paridad-v1.md`).
- Vincular automáticamente inscripciones previas por `cuenta_id` del RS ID
  (hoy el claim sigue siendo por cédula+fecha en `/mi-portal`).
