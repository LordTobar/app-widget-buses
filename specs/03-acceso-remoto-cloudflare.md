# SPEC 03 — Acceso remoto vía Cloudflare Tunnel

> **Estado:** Borrador
> **Depende de:** SPEC 01, SPEC 02
> **Fecha:** 2026-11-18
> **Objetivo:** Hacer que el widget funcione fuera de casa exponiendo la API por el túnel cloudflared existente.

## Por qué existe esta spec

Hoy `BASE_URL` apunta a `192.168.1.250:8090`, que solo es alcanzable en la WiFi de casa. La Pi ya corre cloudflared (contenedor Docker, túnel gestionado desde el panel de Cloudflare).

## Alcance

**Dentro:**

- Public Hostname en Zero Trust apuntando a `http://192.168.1.250:8090`.
- Cambiar `BASE_URL` en `widget.js` a la URL pública.
- Verificar desde datos móviles.

**Fuera de alcance (specs futuras):**

- Cloudflare Access / service tokens (capa extra de autenticación).
- Rate limiting adicional en Cloudflare.
- Monitoreo del túnel.

## Modelo de datos

Esta spec no introduce estructuras nuevas.

| Elemento        | Valor                                         |
| --------------- | --------------------------------------------- |
| Hostname        | `bus.<dominio>` (por definir; pendiente)      |
| Tipo / destino  | HTTP → `http://192.168.1.250:8090`            |
| Cambio en cliente | `BASE_URL = "https://bus.<dominio>"` en `widget.js` |

Se usa la IP LAN porque cloudflared y la API no comparten red Docker (ver SPEC 01, decisiones).

## Plan de implementación

1. Decidir subdominio y dominio.
2. Zero Trust → Networks → Tunnels → túnel → Public Hostname → Add (HTTP, `192.168.1.250:8090`).
3. Desde el PC, `curl https://bus.<dominio>/health` → `status: ok`.
4. Desde datos móviles (WiFi apagada), `GET /stops/PG1407/predictions` con token → 200.
5. Cambiar `BASE_URL` en `widget.js` y probar el widget con datos móviles.

## Criterios de aceptación

- [ ] `https://bus.<dominio>/health` responde con `status: ok`.
- [ ] Sin token, `/stops/PG1407/predictions` por la URL pública da 401 o 403.
- [ ] Con el iPhone en datos móviles, el widget muestra datos (no caché).
- [ ] Ningún puerto nuevo abierto en el router.

## Decisiones

- **Sí:** reutilizar el túnel cloudflared existente. Sin puertos abiertos.
- **Sí:** destino por IP LAN. No hay red Docker compartida.
- **Sí:** mantener `PUBLIC_API=false`. La API queda pública en internet; el token es la única barrera.
- **No:** Cloudflare Access en esta spec. Complica el widget (headers extra); se evalúa después.

## Riesgos

| Riesgo                                               | Mitigación                                                              |
| ---------------------------------------------------- | ----------------------------------------------------------------------- |
| API en internet protegida solo por token             | Token con `requests_per_minute` bajo; rotación (ver `docs/backlog.md`). |
| Tokens ya expuestos en el chat durante el desarrollo | Rotar master y token del widget antes de exponer.                       |
| IP LAN de la Pi cambia por DHCP                      | Reservar IP en el router.                                               |

## Qué **no** está en esta spec

- Cloudflare Access.
- Filtros o features nuevas del widget.
- Cambios al backend.
