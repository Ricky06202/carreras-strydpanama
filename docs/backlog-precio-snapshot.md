# Backlog: Opción A — Snapshot de precio por participante

Pendiente para cuando se pida. Reemplazaría el corte por fecha (`legacyPrice`/`legacyCutoff` en la carrera, Opción B ya implementada) por un modelo explícito por ficha. Sigue el patrón que ya usamos (`categoryName`, `distanceName` son snapshots en la ficha):

1. **Schema** `participants.collection.ts`: agregar `registeredPrice` (number) e `includesShirt` (boolean).
2. **Backfill one-off**: script con token admin que marca a los preinscritos actuales de la carrera con `registeredPrice: 25, includesShirt: true`. Los que se preinscriban después de correr el script quedan afuera → pagan el precio vigente ($20).
3. **RegistrationForm**: al inscribir/preinscribir, guardar snapshot `registeredPrice = distance?.price ?? race?.price` y `includesShirt = showShirtSize !== false` (para futuras carreras queda resuelto el problema para siempre).
4. **CompleteRegistration.tsx** (`basePrice`): `p.registeredPrice ?? (distance?.price ?? race?.price ?? 0)` → el preinscrito viejo paga $25 en Yappy/transferencia, verificado igual en el resumen de "Mis Inscripciones".
5. **Logística de camisas**: los preinscritos viejos conservan su talla guardada; condición del "Conteo por Tallas" del Dashboard (`showSizes`): flag encendido **O** existen inscritos con talla — la tarjeta reaparece contando solo las camisas pendientes (los nuevos salen sin talla).
6. **Bonus encajable**: el KPI "Recaudación Neta" deja de asumir $15/$10 y suma `p.registeredPrice` por persona → números correctos con mezcla de tarifas.
