# Backlog — paridad pendiente v1 → v2 (NO INICIAR aún)

Anotado el 2026-10-08 por pedido expreso de Nini: registrar los gaps, pero
todavía no se desarrollan. Orden sugerido: 1 y 2 primero (lo que más se ve).

Auditoría de 2026-10-08 comparando `cms` (v1) vs rama `v2`.

## 1. Página pública /atletas
- En la v2 el nav público (`components/site/Nav.tsx`) YA enlaza `/atletas`,
  pero la página no existe → link muerto (404). En v1 es
  `frontend/src/pages/atletas`.
- Tarea: crear `app/atletas/page.tsx` server-rendered (patrón de
  `app/carreras/page.tsx`; datos vía `lib/db/queries.ts`, board en
  `components/site/` con `import type`).

## 2. Finanzas (gastos + informe PDF)
- v1 tiene CRUD de gastos (`backend api/admin/create|update|delete-expense`,
  `expenses.ts`) y un informe financiero PDF (`exportFinancePDF` en
  AdminDashboard, jspdf-autotable, resumen por carrera).
- v2 no tiene nada de esto. Tarea: tabla/migración `expenses`, panel
  `/admin/finanzas`, API, board con ConfirmSheet para destructivos, y el
  informe PDF o CSV (decidir formato al iniciar).

## 3. Recordatorios de pago a preinscritos
- v1: `notify-preinscritos` + `mark-reminded` — correo de recordatorio a
  preinscritos de UNA carrera (filtro de carrera obligatorio), con dedupe de
  24 h por destinatario.
- v2: `lib/admin/notify.ts` solo manda RESULTADOS (`sendRaceResults`). Falta
  el recordatorio de pago. Nota: depende del secreto `RESEND_API_KEY` (lo
  pone Ricky en el cutover).

## 4. Libreta de dorsales (PDF por lote)
- v1: `printLibreta` — arma un PDF letter con los tickets de dorsal por lote
  (`race-bibs`), para el día de entrega de dorsales.
- v2: solo existe export CSV de tiempos. Falta la libreta.

## 5. Cámara de meta
- v1: `register-finish-camera` (foto en el finish).
- v2: pendiente también de HARDWARE; no es solo código.

## Contexto
- Nada de esto bloquea el uso actual de v1 (producción).
- El cutover v2 sigue su runbook propio (`docs/cutover-v2.md`).
- Otros pendientes ya registrados aparte: snapshot de precio por ficha
  (`backlog-precio-snapshot.md`), fotos/cámara (hardware), deploy+secrets+DNS.
