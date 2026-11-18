# SPEC 02 — Widget Scriptable de próximos buses

> **Estado:** Implementado
> **Depende de:** SPEC 01
> **Fecha:** 2026-11-18
> **Objetivo:** Mostrar en un widget de iOS los próximos buses del paradero PG1407.

## Por qué existe esta spec

El usuario consulta siempre el mismo paradero y no quiere abrir una app. Se eligió Scriptable porque el usuario trabaja en Windows (sin Mac para Xcode).

## Alcance

**Dentro:**

- Script `widget.js` para Scriptable (small / medium / large).
- Paradero fijo `PG1407` (El Pillán / esq. Indio Jerónimo), todas las líneas.
- Token guardado en Keychain de Scriptable.
- Caché local para mostrar el último dato si falla la red.

**Fuera de alcance (specs futuras):**

- Uso fuera de la WiFi de casa (SPEC 03).
- Filtrar líneas o sentido.
- Paradero configurable desde el widget o por ubicación.
- Widget nativo (WidgetKit).

## Modelo de datos

Respuesta real de `GET /stops/PG1407/predictions` (de madrugada, sin buses):

```json
{
  "paradero": {"codigo":"PG1407","nombre":"EL PILLÁN / ESQ. INDIO JERÓNIMO","hora_consulta":"00:27"},
  "servicios": [{"servicio":"G22","buses":[],"mensaje":"No hay buses que se dirijan al paradero"}],
  "sources": ["red_web","ibus"]
}
```

Servicios en el paradero: `G22`, `G22c`, `262n`, `G01`, `G01c`. Cada bus es `BusArrival`: `patente`, `tiempo_llegada` (texto), `distancia` (int), `source`. El formato real de `tiempo_llegada` **no está verificado** (no había buses al probar).

Fila aplanada en el widget:

```js
{ servicio, texto, mins, dist } // mins = primer número de tiempo_llegada; 0 si "llegando/menos"; 999 si no hay número
```

Persistencia en el iPhone:

- Keychain `redtransporte_token`: token de API.
- Archivo `redtransporte_cache.json` (documentos locales de Scriptable): último JSON válido + `_ts`.

Config en `widget.js`: `BASE_URL = http://192.168.1.250:8090`, `STOP_CODE = PG1407`, `REFRESH_MIN = 5`. Filas: small 3, medium 4, large 10.

## Plan de implementación

1. Instalar Scriptable y pegar `widget.js`.
2. Guardar el token en Keychain (`scripts/reset-token.js`).
3. Ejecutar en la app: preview medium sin error.
4. Agregar widget a la pantalla de inicio y elegir el script.
5. Probar modo avión: muestra caché marcada "sin conexión".

## Criterios de aceptación

- [ ] Ejecutar `widget.js` en la app muestra el nombre del paradero y no lanza error.
- [ ] Sin buses, muestra "Sin buses próximos".
- [ ] Con buses, las filas salen ordenadas por minutos ascendente.
- [ ] Con el iPhone en modo avión, muestra el último dato con "sin conexión".
- [ ] El token no aparece en el código de `widget.js`.
- [ ] El widget se ve en la pantalla de inicio en tamaños small y medium.

## Decisiones

- **Sí:** Scriptable. Sin Mac, sin cuenta de desarrollador, script editable en el iPhone.
- **No:** WidgetKit. Exige Mac con Xcode y Apple Developer (USD 99/año).
- **No:** Atajos de iOS. Texto básico y poco flexible.
- **Sí:** token en Keychain. No queda en el código ni en el repo.
- **Sí:** caché local. El widget sigue útil con red mala.
- **Sí:** todas las líneas del paradero. Menos configuración; filtrar queda para después.
- **Sí:** refresco pedido cada 5 min. iOS decide el real (típico 5–15 min); no es en vivo.
- **Sí:** URL por IP LAN mientras no exista SPEC 03.

## Riesgos y hallazgos

| Riesgo / hallazgo                                                | Mitigación                                                                                      |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Formato de `tiempo_llegada` sin verificar                        | Capturar respuesta con buses reales y ajustar `flatten()` en `widget.js`.                       |
| 401 en Scriptable aunque el token era válido (`curl` daba 200)   | Token mal pegado en Keychain. Se reseteó con `scripts/reset-token.js`.                          |
| `BASE_URL` LAN solo funciona en la WiFi de casa                  | SPEC 03.                                                                                        |
| Sin buses el widget solo dice "Sin buses próximos"               | Backlog: mostrar `mensaje` de la API.                                                           |

## Qué **no** está en esta spec

- Acceso remoto (SPEC 03).
- Filtros por línea o sentido.
- Paradero por ubicación.
- Notificaciones o Live Activities.
