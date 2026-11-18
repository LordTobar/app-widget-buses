# SPEC 04 — Estilo del widget y selector de tema

> **Estado:** Aprobado
> **Depende de:** SPEC 02
> **Fecha:** 2026-11-18
> **Objetivo:** Rediseñar el widget con identidad de señalética de tránsito, texto más legible y un botón para alternar tema claro/oscuro.

## Por qué existe esta spec

La v1 de SPEC 02 funciona pero es plana: fondo oscuro fijo, texto de poco contraste y un solo color. El usuario pidió "que luzca más", textos más definidos y poder cambiar entre oscuro y claro. Además el widget no aparecía en la pantalla de inicio: hay que agregarlo manualmente (ver pasos en el README).

## Alcance

**Dentro:**

- Nueva paleta clara y oscura, con modo `auto` (sigue el sistema).
- Chip de color por línea con texto de contraste automático.
- Próximo bus destacado y siguientes en filas.
- Botón de tema en widget mediano y grande; toque completo en el pequeño.
- Mostrar el `mensaje` de la API cuando no hay buses.

**Fuera de alcance (specs futuras):**

- Filtros por línea o sentido.
- Acceso remoto (SPEC 03).
- Colores de línea leídos desde la API (hoy: mapa local + paleta por hash).

## Modelo de datos

Sin estructuras nuevas en el backend. Nuevo estado en el iPhone:

- Keychain `redtransporte_theme`: `auto` | `claro` | `oscuro` (por defecto `auto`).
- `Edit Widget → Parameter` con `claro`/`oscuro`/`auto` anula la preferencia guardada.

Paleta (`widget.js`, constante `PAL`):

| Token   | Claro     | Oscuro    |
| ------- | --------- | --------- |
| bg      | `#EAF0F7` | `#0B1220` |
| surface | `#FFFFFF` | `#16223A` |
| text    | `#0A1424` | `#F4F7FB` |
| muted   | `#4A5A73` | `#A9B6CC` |
| hot     | `#B45309` | `#FFB020` |

`hot` marca buses a 3 min o menos. Color de línea: `LINE_COLORS` (G22 = `#F58220`) y, si falta, `PALETTE` por hash del nombre. Tipografía: `DINAlternate-Bold` para líneas y minutos; sistema semibold/bold para nombres y etiquetas.

Botón de tema: URL `scriptable:///run/<nombre del script>?theme=cycle`; el script avanza `auto → claro → oscuro`.

## Plan de implementación

1. Reemplazar `widget.js` con la v2.
2. Pegar en Scriptable, ejecutar en la app: preview mediana sin errores.
3. Agregar widget a la pantalla de inicio (README, "Agregar al inicio").
4. Tocar el botón y comprobar que el tema cambia tras el siguiente refresco.
5. Probar tamaños pequeño y grande.

## Criterios de aceptación

- [ ] El widget se ve en la pantalla de inicio.
- [ ] En modo `auto` cambia solo al cambiar el tema del iPhone.
- [ ] Tocar el botón (mediano) cicla el modo y lo recuerda tras reiniciar.
- [ ] Con `Parameter = oscuro` el widget queda oscuro aunque se toque el botón.
- [ ] Chip de G22 legible (texto oscuro sobre naranja).
- [ ] Sin buses, muestra el mensaje de la API.
- [ ] Pequeño: toque completo cambia el tema.

## Decisiones

- **Sí:** ícono táctil con URL a Scriptable. Un botón interactivo real no existe en widgets de Scriptable.
- **Sí:** modo `auto` como estado por defecto (`Color.dynamic`).
- **Sí:** Parameter del widget como alternativa estable; permite un widget claro y otro oscuro a la vez.
- **Sí:** texto del chip por contraste calculado, no fijo. Blanco sobre `#F58220` daba ~2.6:1.
- **Sí:** DIN Alternate por su parecido con señalética vial.
- **No:** crema + serif ni acento verde sobre negro: valores por defecto genéricos.
- **No:** leer el color de cada línea de `/routes/{id}`. Una llamada extra por servicio en cada refresco.

## Riesgos

| Riesgo                                                      | Mitigación                                                                  |
| ----------------------------------------------------------- | --------------------------------------------------------------------------- |
| iOS no redibuja el widget al instante tras tocar el botón   | El cambio aplica en el siguiente refresco; Parameter da control inmediato.  |
| Botón solo en mediano/grande                                | En pequeño el toque completo cambia el tema.                                |
| Fuente DIN Alternate ausente                                | Fallback a fuente del sistema pesada.                                       |
| Formato de `tiempo_llegada` sin verificar                   | Sigue pendiente (SPEC 02). `timeLabel()` muestra el texto crudo si no hay número. |

## Qué **no** está en esta spec

- Acceso remoto.
- Filtros por línea o sentido.
- Colores desde la API.
