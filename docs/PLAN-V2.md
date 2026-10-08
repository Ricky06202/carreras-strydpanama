# Plan V2 — carreras.strydpanama.com

> Rediseño total. Se va SonicJS y MUI. Next.js 15 sobre Cloudflare (Workers + D1 + R2),
> BD nueva con schema limpio, UI futurista con animaciones, colores Stryd intactos.
> El sitio actual (branch `cms`) sigue vivo en producción hasta que v2 esté listo.

## Decisiones tomadas
| Tema | Decisión |
|---|---|
| Framework | Next.js (App Router, API 16.x) sobre **vinext** (Vite), sin librerías de componentes |
| UI | Tailwind v4 design-system propio + Motion (`motion`) + GSAP ScrollTrigger |
| Hosting | Cloudflare Workers vía vinext nativo: `vinext init --platform=cloudflare` + `@vinext/cloudflare deploy` (un solo deploy: sitio + API + admin). Fallback si algo choca: OpenNext (el código es Next estándar, cambiar solo el toolchain) |
| BD | D1 nueva (`carreras-v2-db`) + Drizzle ORM (SQLite dialect), schema limpio |
| Archivos | R2 nueva bucket `carreras-v2-media` (fotos se copian de la bucket vieja) |
| Admin | Propio en Next.js `/admin`, por fases |
| Auth | Sesiones propias con cookies httpOnly (mismo patrón PBKDF2 que runners, o argon2) |

## Estructura del repo v2
```
v2/
├── src/
│   ├── app/                 # App Router
│   │   ├── (site)/          # público: /, /carrera/[slug], /resultados, /atletas...
│   │   ├── (auth)/          # /login, /registro, /mi-cuenta
│   │   ├── admin/           # panel propio
│   │   └── api/             # route handlers: registration, yappy, webhooks, timing
│   ├── components/
│   │   ├── ui/              # botones, inputs, cards, dialog... (nuestros primitivos)
│   │   └── effects/         # hero animado, partículas, reveal-on-scroll, glitch text
│   ├── lib/                 # db, auth, yappy, email, codes, validators (zod)
│   ├── styles/              # tokens Stryd + globals
│   └── drizzle/             # schema.ts + migrations + seed
├── scripts/                 # migración de datos desde la BD vieja
└── cloudflare.config.ts     # worker + bindings D1/R2/KV (cf/vinext)
```

## Paleta y dirección de arte (se conserva Stryd: NEGRO con toques naranjas)
- Base: negro dominante (`#000000` / `#0A0A0B` / `#141416`), gris texto `#8A8A8E`.
  El naranja es ACENTO escaso y con intención (CTAs, dorsales, activos, glow) — nunca fondo.
- Acento: `#FF6B00` (hover `#E55A00`, glow `rgba(255,107,0,.35)`)
- Tipografía: display tech (ej. `Space Grotesk` / `Clash Display`) + mono para dorsales/tiempos (`JetBrains Mono`)
- Lenguaje visual: gradientes naranja sobre negro, grid/scanlines sutiles, glow de acento,
  números grandes estilo crono, glassmorphism oscuro en cards, micro-interacciones en todo.

## Animaciones (stack)
- `motion` (Framer Motion) — transiciones, layout animations, page transitions, modal registro
- `GSAP + ScrollTrigger` — narración de scroll en home (ruta, premios, cronómetro)
- `lenis` — smooth scroll
- Canvas/WebGL ligero para hero (partículas/rutas animadas; opcional `ogl`, NO three completo)
- Conteo animado de dorsales/tiempos, shimmer en states de carga, stagger en lists
- Regla: todo con `prefers-reduced-motion` respetado.

## Nuevo schema (D1 + Drizzle) — limpieza de datos
Principios: nombres en singular/snake_case, claves foráneas reales, nada de JSON suelto donde
puede ser tabla, `race_id` explícito donde falte, status como enums(check), índices únicos
en `code`, `cedula`, `confirmation_code`.

- `races` (slug, título, fecha, hora, lugar, km, precio, fee plataforma, cupo, status,
  timer_start/timer_stop, bib inicial, reglas de camiseta/team/padrino, T&C, imágenes)
- `race_distances` (race_id, km, precio, sort)
- `race_categories` (race_id, min_age, max_age, gender, keyword para códigos)
- `participant_types` (race_id, key, activo, orden, keywords)
- `runners` (cédula única, nombres, email, teléfono, nacimiento, género, país, foto, bio,
  redes, records JSON, gear, total_races, passhash/salt, token sesión)
- `registrations` (antes `participants`: race_id, runner_id nullable, datos del evento,
  category_id, distance_id, participant_type_id, bib, talla, status enum
  preinscrito/inscrito/anulado, code_id, equipo_id, padrino, dirección envío)
- `payments` (registration_id, monto, estado, provider `yappy`, order_id, receipt, payload)
- `registration_codes` (race_id, code único, vendor, batch, status, tipo permitido, redimido_por)
- `teams` (race_id, nombre, aprobado)  + `team_members` (registration_id)
- `timing_events` (race_id, runner/bib, checkpoint, timestamp, fuente, confianza)
- `results` (race_id, registration_id, finish_time, puesto, puesto_cat — derivado, recalculable)
- `raffle_winners` (race_id, registration_id, prize)
- `sponsors` (nombre, logo, nivel, sort) ← no existía como datos, ahora sí
- `settings` (key/value global)

## Migración de datos (scripts/migrate)
1. Export desde D1 vieja: `wrangler d1 export carreras-strydpanama-db` → JSON por tabla
   SonicJS (`*_content`), parsear columna `fields` JSON.
2. Normalizar: dedupe de `runners` por cédula, mapear category/distance por nombre→ID,
   fechas/numeros limpios, participants → registrations con FKs resueltos.
3. Cargar en BD nueva con Drizzle (`scripts/migrate/run.ts`), reporte de filas huérfanas.
4. Copiar media: `wrangler r2 object copy` bucket vieja → nueva.
5. Verificación: conteos por carrera + muestra manual de inscripciones.

## Fases (orden de ejecución)
- **F0 — Fundaciones** ✅: scaffold vinext+bun, design tokens Stryd, primitivos UI + `/lab`,
  nav/footer/Hero/Lenis, build+tsc limpios. Queda pendiente: deploy staging vacío (F1 listo).
- **F1 — Datos** ✅: schema Drizzle 15 tablas (teams global, registration codes, timing,
  settings, sponsors); D1 nueva `carreras-v2-db` + R2 `carreras-v2-media` con bindings en
  `cloudflare.config.ts`; migraciones 0000-0002 aplicadas remoto;   datos v1 migrados y limpiados (2 races, 7 regs, 6 dist, 4 pay, 122 teams, 0 huérfanos;
  descartados 4 distances huérfanos). Dev local: POST `/api/setup-dev` aplica DDL+seed en la D1 de
  miniflare; `/api/health` demuestra lectura Drizzle real. Reset local: `/api/dev-drop`.
- **F2 — Sitio público**: home futurista (hero WebGL/scroll), listado carreras,
  `/carrera/[slug]` (detalle, mapa GPX, cronómetro), resultados/podio, atletas, T&C.
- **F3 — Registro**: wizard de inscripción (validación zod, códigos, categorías, tipos),
  Yappy checkout + webhook, confirmación email (Resend), preinscripción→pago pendiente.
- **F4 — Portal del corredor**: login/registro, mis-inscripciones, mi-perfil, edición de datos.
- **F5 — Admin fase 1**: CRUD carreras/categorías/distancias/códigos bulk, vista de
  inscripciones, aprobación equipos.
- **F6 — Admin fase 2 (operación de carrera)** ✅: cronómetro vivo estilo v1 (`/admin/timing`), meta/control manual + ingesta por cámara lista (`source:"camera"`, ver `docs/camara-v2.md` — falta decisión de hardware), deshacer con historial de eventos, cálculo de tiempos/podium con puesto por categoría, export CSV, envío masivo de resultados por correo, tómbola con RNG criptográfico (`/admin/tombole`), podio público (`/resultados`, `/resultados/[slug]`) y certificado imprimible/PDF en el portal del corredor.
- **F7 — Cierre (código) ✅**: metas base con Open Graph/twitter + metadata por página, `robots.txt` y `sitemap.xml` dinámico,
  a11y (lang es-PA, skip link, `noindex` en panel/portal, aria-labels en iconos), y smoke E2E del registro
  (`bun run e2e` contra workerd local: flujo completo inscripción → estado → rechazos → SEO, 15/15).
  Pendiente operativo (no es código): deploy con secrets, Lighthouse, webhook Yappy, DNS y apagar SonicJS → **`docs/cutover-v2.md`**.

## Reglas del branch
- `v2` vive del `cms`; nada de tocar el código viejo salvo hotfixes en `cms`.
- Sin MUI, sin componentes importados de la app vieja: todo UI nuevo en `components/ui|effects`.
- Secretos/env: nunca commitear; documentar vars en `docs/env-v2.md`.
- Cada fase termina con: build limpio (`vite build` + `vinext start` local), migrate/reset
  local OK, commit atómico.
- Gaps conocidos de vinext que nos afectan (aceptados): optimización de imágenes/fonts en
  build-time (usamos `@unpic`/CDN de Cloudflare Images y fuentes vía `next/font/google`),
  y PPR/`use cache` incompleto (no lo usamos). Antes de features exóticas: revisar
  vinext.dev/docs o `vinext check`.
