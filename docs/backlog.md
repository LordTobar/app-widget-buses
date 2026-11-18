# Backlog (candidatas a specs)

Cada ítem, si se hace, va en su propia spec (`/spec`).

## Prioridad alta

- **Acceso remoto** → ya es SPEC 03 (Borrador).
- **Rotar tokens.** El master token y el token `widget-ios` se mostraron en el chat de desarrollo. Crear nuevos, actualizar `MASTER_TOKEN` en Portainer y Keychain del iPhone, y revocar el anterior (`/admin/tokens/{id}`).
- **Verificar `tiempo_llegada` con buses reales.** Capturar respuesta de día y ajustar `flatten()` en `widget.js` (hoy extrae el primer número del texto).

## Mejoras del widget

- Mostrar `mensaje` de la API cuando no hay buses (hoy solo "Sin buses próximos").
- Filtrar por línea (ej. solo G22) y por sentido (G22 → Metro La Cisterna).
- Mostrar distancia del bus.
- Destino por servicio (`red_web.servicios.item[].destino`, ej. "Metro La Cisterna").
- Paradero cercano por ubicación (`/nearby/stops`).
- Dos paraderos (ida y vuelta) en un widget.
- Ruta A→B con `/routing/plan` (requiere `allow_raptor`).

## Infraestructura

- Reservar IP fija de la Pi en el router (hoy 192.168.1.250 por DHCP).
- Monitoreo del contenedor y del túnel.
- Cloudflare Access / service token como segunda barrera.
- Red Docker compartida con cloudflared para no depender de la IP LAN, y quitar `ports`.
- Precargar GTFS (`gtfs update`) para evitar primer request lento.
- Backup del volumen `red_transporte_data` (incluye tokens).
- Revisar uso de RAM en la Pi (`docker stats`).
