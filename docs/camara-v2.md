# Cronometraje con cámara — contrato v2

> Decisión pendiente de Ricky/hardware: qué cámara y OCR usar. El **endpoint ya está listo** para cuando se integre.

## Endpoint

`POST /api/admin/timing` (misma sesión admin `stryd2_admin` del tablero; para un kiosk/cámara futuro habría que emitir un token de dispositivo dedicado).

```json
{
  "raceId": "…",
  "bib": 123,
  "checkpoint": "finish",        // o "checkpoint"
  "source": "camera",            // "manual" (default) | "camera"
  "time": "52:11",               // OPCIONAL: si se omite, captura el cronómetro vivo del server
  "confidence": 0.87             // 0–1; default 0.9 en camera, 1 en manual
}
```

## Comportamiento

- Cada lectura es un **evento** en `timing_events` (fuente + confianza + marca de ms).
- La ficha (`registrations`) queda con el último tiempo y `timingSource`.
- **Recalcular resultados** toma el evento más nuevo por corredor → `results` con puesto global y por categoría (podio público / `/resultados/[slug]`).
- Dorsal inexistente o anulado → 404/409 sin tocar nada.
- Dorsal repetido = corrección (no duplica finishers; el count usa distintos).
- Con el cronómetro detenido o sin iniciar: `time` es obligatorio (409 con mensaje claro).

## Flujo sugerido para la cámara

1. Admin inicia la carrera desde `/admin/timing` (cronómetro server-side, reloj del worker — no depende del PC de meta).
2. El sistema OCR postea cada placa leída con `source:"camera"` y su `confidence`.
3. Un operador revisa el feed «Últimos registros» en el tablero y deshace lecturas erróneas (el deshacer restaura el tiempo anterior).
4. Al terminar: Detener → Recalcular → Exportar CSV / Enviar resultados (los correos salen con enlace al certificado imprimible).
