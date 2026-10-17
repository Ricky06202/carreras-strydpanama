# Backlog — paridad v1 (`cms`) → v2

Auditoría completa del **2026-10-17** comparando `cms` (v1, en producción) contra la
rama `v2`. Actualiza la lista del 2026-10-08 (que ya tenía ítems obsoletos).

Leyenda: 🔴 bloquea un flujo real de usuario · 🟡 se nota · 🟢 cosmético.

## Pagos / inscripción (lo más importante)

1. 🔴 **Completar pago de un preinscrito.** v1 tiene `/completar-inscripcion`
   (`complete-registration-payment`) + comprobante. v2 no: quien no paga al
   inscribirse queda atascado (y el índice único
   `registrations_race_cedula_idx` impide reinscribirse con la misma cédula).
2. 🔴 **Comprobante de transferencia/efectivo.** `payments.receipt_url` existe en
   el esquema pero **nunca se escribe**; el correo solo dice "comparte tu
   comprobante con un coordinador".
3. 🟡 **Recordatorio de pago a preinscritos** (`notify-preinscritos` +
   `mark-reminded`, dedupe 24 h). Depende de `RESEND_API_KEY`.
4. 🟡 **RS Pay** — ✅ implementado (ver `docs/rs-pay.md`); falta cargar las llaves
   Yappy del comercio `stryd-carreras` y encender `PAGO_RS_PAY`.

## Inscripción (lógica que v1 sí tiene)

5. 🔴 **Tipos de participante**: estudiante / docente / administrativo / padrino /
   virtual (v1 los maneja en `register` + precio y validaciones por tipo).
6. 🔴 **Autollenado por cédula** (`lookup-runner`): en v1 el corredor recurrente no
   vuelve a escribir todo.
7. 🟡 **Equipos multi-integrador** (`teamMembers`, `bulk-teams`).
8. 🟡 **Lista de espera** cuando la carrera está llena.
9. 🟡 **Padrinos**: código de padrino, cupos donados, export de padrinos.
10. 🟡 **Subida de carnet/matrícula** para los tipos estudiante/docente.

## Público

11. 🔴 **`/atletas` (directorio) + `/atletas/[cedula]` + `/corredor/[id]`.** El nav
    v2 ya enlaza `/atletas` → **404**. Decidir qué campos son públicos (privacidad).
12. 🟡 **`/premiacion`** (selector de carrera + podio por categoría).
13. 🟡 **Resultados en vivo**: v1 hace polling; v2 no (solo página estática).
14. 🟡 **Mapa del recorrido** en la página de carrera: v2 guarda
    `routeGpxUrl`/`routeEmbedCode` pero **no los pinta**.
15. 🟡 **Ganadores de la tómbola visibles en público** (v2 solo los tiene en admin).
16. 🟢 Pestaña de equipos y modal de corredor en resultados.

## Admin

17. 🟡 **Códigos**: marcar vendido / free / padrino, lotes, export
    (`mark-sold`, `mark-free-code`, `mark-padrino-code`, `codes-stats`).
18. 🟡 **Libreta de dorsales PDF por lote** (`race-bibs`).
19. 🟡 **Directorio de inscritos**: ver comprobante, exportar, borrar (hoy "anular"),
    filtro por padrino.
20. 🟡 **Correos**: plantillas, envío masivo y bitácora (`email-templates`,
    `send-bulk`, `email-log`).
21. 🟡 **Editor de recorrido** (distancias + mapa) en `RaceEditor`.
22. 🟢 **Dashboard**: recaudación neta, conteo de tallas, PDFs rápidos.

## Hardware / otros

23. 🟢 **Cámara de meta** (`register-finish-camera`): endpoint `timing` con
    `source:"camera"` listo, falta UI y el hardware. Ver `docs/camara-v2.md`.
24. 🟢 **Kiosco de checkpoint** dedicado (`retorno.astro` en v1) con feedback sonoro.
25. 🟢 **Snapshot de precio por ficha** (`backlog-precio-snapshot.md`).

## Ya resuelto en v2 (no está en la lista vieja)

- ✅ Finanzas: `admin/finanzas`, `lib/admin/finance.ts`, PDF — el ítem 2 del
  backlog de octubre ya no aplica.
- ✅ Cupos digitales (cNFT) + verificación QR.
- ✅ Login de corredor con contraseña propia + SSO RS ID.
- ✅ Auth real de admin (Google OAuth + `guardAdmin()`); v1 **no validaba token**
  en `api/admin/update-race`.
- ✅ Cronometraje server-side con deshacer y CSV.
- ✅ Tómbola con RNG criptográfico.
