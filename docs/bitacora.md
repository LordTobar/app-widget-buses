# Bitácora

Registro cronológico de lo iterado, con problemas y soluciones. Fecha: 2026-11-17/18.

## Decisiones de partida

- Idea: widget iOS. Sin Mac (Windows) → Scriptable en vez de WidgetKit.
- Fuente de datos: RedTransporteAPI. No existe instancia pública; se autohospeda en Raspberry Pi 4/5 (64-bit, ≥4 GB) con Docker + Portainer + cloudflared (contenedor, túnel gestionado en panel Cloudflare).
- Paradero fijo, todas las líneas. API privada con token.

## Hallazgos de recon

- La imagen `ghcr.io/iiroak/redtransporteapi:latest` se publica solo amd64 → compilar en la Pi.
- Auth con `Authorization: Bearer`. Tokens por `POST /admin/tokens` (master token). Token crudo se ve una sola vez.
- Rate limit: público 20 req/min por IP; token nuevo 60 req/min por defecto.
- Modelos de predicción: `StopPrediction` → `servicios[]` → `buses[]` (`patente`, `tiempo_llegada` texto, `distancia`, `source`).
- El repo dice uso personal/educativo; predicciones por scraping pueden romperse.

## Problemas y soluciones

| # | Problema | Causa | Solución |
|---|----------|-------|----------|
| 1 | Portainer: `service "api" refers to undefined network tunnel` | Al pegar el stack faltó el bloque `networks:` al final | Quitar `networks` del servicio y usar IP LAN en Cloudflare |
| 2 | Puerto 8080 ocupado | Otro servicio en la Pi | Mapear `8090:8000` |
| 3 | `{"detail":"Invalid master token"}` | Se ejecutó el comando con `TU_MASTER_TOKEN` literal | Usar el valor real de `MASTER_TOKEN` del stack |
| 4 | `/health` con `gtfs_loaded:false` | GTFS no cargado al inicio | `/routes` y `/stops` igual respondieron (carga bajo demanda); `/gtfs/status` mostró `available:false` |
| 5 | `/gtfs/status` con master token → "Invalid or revoked token" | Endpoints de lectura exigen token de API, no master | Usar token `widget-ios` |
| 6 | Widget daba 401 en Scriptable, `curl` daba 200 | Token mal pegado en Keychain | `scripts/reset-token.js` |
| 7 | Predicciones vacías | Prueba a las 00:27, sin servicio nocturno | Reprobar de día para ver `tiempo_llegada` real |

## Datos obtenidos

- G22: Estación 5 Pinos ↔ (M) La Cisterna. Ida 41 paraderos, vuelta 39. Frecuencias en datos: L-V 18:30–20:30 c/4,8 min; sáb 05:30–06:30 c/12; dom 21:00–22:00 c/15 (una sola franja por día, no es horario completo).
- PG1407 = El Pillán / esq. Indio Jerónimo. Servicios: G22, G22c, 262n, G01, G01c.

## Estado final

Backend en `192.168.1.250:8090`, token `widget-ios` creado, widget funcionando en WiFi de casa ("muy básico pero funciona").
