# SPEC 01 — Backend RedTransporteAPI en Raspberry

> **Estado:** Implementado
> **Depende de:** ninguna
> **Fecha:** 2026-11-18
> **Objetivo:** Autohospedar RedTransporteAPI en la Raspberry Pi vía Portainer, accesible solo con token.

## Por qué existe esta spec

El repo `iiroak/RedTransporteAPI` es código de servidor, no una API pública. Para consumirla desde un iPhone hay que correr una instancia propia. La Pi ya tiene Docker, Portainer y cloudflared.

## Alcance

**Dentro:**

- Stack de Portainer (`stack.yml`) que compila la imagen en la Pi.
- API privada: `RED_TRANSPORTE_PUBLIC_API=false`.
- Master token en variable del stack; token de API `widget-ios` para el cliente.
- Verificación por LAN (`http://192.168.1.250:8090`).

**Fuera de alcance (specs futuras):**

- Exponer la API a internet (ver SPEC 03).
- Cliente / widget (ver SPEC 02).
- Monitoreo y alertas.

## Modelo de datos

Variables del stack (Portainer → Environment variables):

| Variable       | Valor                                      |
| -------------- | ------------------------------------------ |
| `MASTER_TOKEN` | cadena aleatoria larga (`secrets.token_urlsafe(32)`) |

Variables del contenedor: `RED_TRANSPORTE_DATA_DIR=/data`, `RED_TRANSPORTE_PUBLIC_API=false`, `RED_TRANSPORTE_MASTER_TOKEN=${MASTER_TOKEN}`, `RED_TRANSPORTE_TRUST_PROXY=false`.

Creación del token del cliente — `POST /admin/tokens` con `Authorization: Bearer <MASTER_TOKEN>`:

```json
{"name":"widget-ios","requests_per_minute":30,"allow_gtfs":true,"allow_ibus":true,"allow_red_web":true,"allow_raptor":false}
```

La respuesta incluye `token` (se muestra una sola vez; el servidor guarda solo su hash SHA-256).

Puertos: host `8090` → contenedor `8000`. Volumen `red_transporte_data` en `/data`.

## Plan de implementación

1. Definir `MASTER_TOKEN` y crear el stack en Portainer con `stack.yml`. Verificar: build termina y el contenedor arranca.
2. `curl http://192.168.1.250:8090/health` → `{"status":"ok",...}`.
3. Crear token `widget-ios` con el master token.
4. Verificar acceso con token: `GET /routes/G22` y `GET /stops/PG1407/predictions` devuelven 200.
5. Verificar que sin token la API rechaza (401/403).

## Criterios de aceptación

- [ ] `GET /health` responde `status: ok`.
- [ ] `GET /stops/PG1407/predictions` sin `Authorization` devuelve 401 o 403.
- [ ] El mismo request con el token `widget-ios` devuelve 200 y JSON con `servicios`.
- [ ] `GET /routes/G22` con token devuelve la línea "Estacion 5 Pinos - (M) La Cisterna".
- [ ] El contenedor se reinicia solo (`unless-stopped`) y mantiene datos en el volumen.

## Decisiones

- **Sí:** compilar la imagen en la Pi. La imagen oficial se publica solo para amd64 (`container.yml` sin `platforms`) y la Pi es ARM.
- **Sí:** `PUBLIC_API=false` + token. Evita que cualquiera con la URL consuma el rate limit (20 req/min por IP).
- **Sí:** puerto host 8090. El 8080 ya estaba ocupado por otro servicio.
- **Sí:** token separado para el widget. El master token nunca va al iPhone.
- **No:** red Docker compartida con cloudflared. Falló con `service "api" refers to undefined network tunnel` (se perdió el bloque `networks:` al pegar). Se eliminó y se usa la IP LAN.
- **No:** imagen precompilada de ghcr. Es solo amd64.
- **No:** usar el master token para endpoints de lectura. `/gtfs/status` lo rechaza con "Invalid or revoked token"; la lectura usa tokens de API.

## Riesgos y hallazgos

| Riesgo / hallazgo                                                              | Mitigación                                                                    |
| ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| `/health` dice `gtfs_loaded:false` y `/gtfs/status` `available:false`          | `/routes` y `/stops` igual responden (carga bajo demanda). Primer request lento. |
| Predicciones vienen de scraping (iBus / RED web)                               | Pueden romperse sin aviso; el widget muestra caché si falla.                  |
| Error `Invalid master token` al copiar el comando con el placeholder literal   | Reemplazar `TU_MASTER_TOKEN` por el valor real del stack.                     |
| Tokens expuestos en el chat durante el desarrollo                              | Rotar master y token del widget (ver `docs/backlog.md`).                      |

## Qué **no** está en esta spec

- Acceso desde internet (SPEC 03).
- Widget de iOS (SPEC 02).
- Planificador de rutas (`allow_raptor` queda en `false`).
