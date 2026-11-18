# SPEC 05 — App móvil base: paraderos y favoritos

> **Estado:** Aprobado
> **Depende de:** — (reutiliza conocimiento de SPEC 02 y 04; no depende de la Pi)
> **Fecha:** 2026-11-18
> **Objetivo:** Crear una app Expo (iOS y Android) que permite buscar un paradero, ver sus próximos buses y guardarlo como favorito.

## Por qué existe esta spec

El widget Scriptable es personal y solo iOS. El usuario quiere una app para App Store y Play Store, juvenil, orientada a estudiantes y trabajadores, con favoritos y paraderos programados, y que pueda seguir creciendo. Esta spec es la base: proyecto, arquitectura, buscar, ver llegadas y favoritos. La programación y el resto se difieren.

## Hoja de ruta (specs planeadas, no se implementan aquí)

| Spec | Tema                                                        |
| ---- | ----------------------------------------------------------- |
| 05   | App base + favoritos (esta)                                 |
| 06   | Reglas de programación por hora/día/fecha + pantalla "Ahora" |
| 07   | Backend para público (identidad por dispositivo, límites)   |
| 08   | Widgets nativos iOS y Android                               |
| 09   | Notificaciones y perfiles Estudiante/Trabajo                |

## Alcance

**Dentro:**

- Proyecto Expo (TypeScript, Expo Router) en `app/` del repo, corriendo en iOS y Android (Expo Go / dev build).
- Capa `TransitSource` (interfaz) con un adaptador directo a la API de Red.
- Buscar paradero por código (`PG1407`) o nombre, y "cerca de mí" por GPS.
- Pantalla de paradero: lista de servicios y minutos de llegada, con refresco manual y automático.
- Favoritos: agregar/quitar, lista persistente, alias opcional (ej. "Casa", "U").
- Tema claro/oscuro/auto con identidad juvenil (nombre provisional "Paradero").
- Persistencia local con versión de esquema.
- Estados de carga, vacío (sin servicio) y error de red.

**Fuera de alcance (specs futuras):**

- Reglas de programación y pantalla "Ahora" (SPEC 06).
- Backend propio / acceso por Pi (SPEC 07; SPEC 03 sigue aparte).
- Widgets (SPEC 08), notificaciones y perfiles (SPEC 09).
- Cuentas, login y sincronización entre dispositivos.
- Mapa interactivo, rutas A→B, filtros por línea.
- Publicación en tiendas (cuentas de desarrollador, íconos, políticas).
- Nombre y marca definitivos.

## Modelo de datos

Sin cambios en el backend. Estado local nuevo (clave `app_state`, JSON en almacenamiento local):

```ts
type AppState = {
  schemaVersion: 1;
  favorites: Favorite[];
  theme: "auto" | "claro" | "oscuro"; // por defecto "auto"
};

type Favorite = {
  stopCode: string;   // "PG1407"
  stopName: string;   // nombre cacheado para mostrar sin red
  alias?: string;     // "Casa", "U"
  addedAt: string;    // ISO 8601
};
```

Capa de datos (`app/src/transit/`):

```ts
interface TransitSource {
  searchStops(query: string): Promise<Stop[]>;
  nearbyStops(lat: number, lon: number, radiusM?: number): Promise<Stop[]>;
  getArrivals(stopCode: string): Promise<Arrival[]>;
}

type Stop = { code: string; name: string; lat?: number; lon?: number };
type Arrival = {
  line: string;         // "G22"
  destination?: string;
  minutes: number | null; // null si el texto no trae número
  rawText: string;      // tiempo_llegada tal cual
  distanceM?: number;
};
```

Migración: al cargar, si `schemaVersion` falta o es menor, se migra; si es mayor o el JSON es inválido, se conserva copia en `app_state_backup` y se parte de estado vacío.

Estructura de carpetas propuesta: `app/` (Expo Router), `app/src/transit/` (interfaz + `redDirect.ts`), `app/src/state/` (store + persistencia), `app/src/theme/`, `app/src/ui/`.

## Plan de implementación

1. **Spike de la fuente de datos:** probar los endpoints de Red (búsqueda, cercanos, llegadas) con `curl` y documentar formas de respuesta en `docs/bitacora.md`. Si algún endpoint no sirve, usar listado local de paraderos como respaldo y ajustar el plan antes de seguir.
2. Crear proyecto Expo en `app/` (TypeScript, Expo Router); correrlo en un dispositivo con pantalla en blanco y título.
3. Implementar `TransitSource` e `redDirect.ts` con `getArrivals`; mostrarlo con `PG1407` fijo.
4. Pantalla de paradero con estados (carga/vacío/error), refresco manual y cada 30 s mientras está en primer plano.
5. `searchStops` y pantalla de búsqueda por código/nombre.
6. `nearbyStops` con permiso de ubicación y botón "Cerca de mí" (manejo de permiso denegado).
7. Store local + persistencia versionada; favoritos con alias; pestaña "Favoritos".
8. Tema auto/claro/oscuro y pulido visual juvenil (chips de línea, tipografía, espaciado).
9. Probar en iOS y Android; actualizar README (sección de la app), tabla de specs y `CLAUDE.md`.

Cada paso deja la app ejecutable.

## Criterios de aceptación

- [ ] La app arranca sin errores en un iPhone y en un Android reales (o emuladores).
- [ ] Buscar `PG1407` muestra el paradero y sus servicios con minutos (de día) o el estado "sin servicio".
- [ ] Buscar por nombre devuelve al menos un resultado seleccionable.
- [ ] "Cerca de mí" lista paraderos con permiso concedido; con permiso denegado muestra mensaje y la búsqueda manual sigue funcionando.
- [ ] Marcar favorito, cerrar la app por completo y reabrirla: el favorito sigue y puede tener alias.
- [ ] Sin red, un favorito sigue listado con su nombre y la pantalla de paradero muestra error claro, sin crash.
- [ ] Cambiar tema a oscuro/claro/auto se recuerda tras reiniciar; en `auto` sigue el sistema.
- [ ] Un `app_state` con `schemaVersion` desconocido no rompe la app y deja `app_state_backup`.
- [ ] Cambiar de fuente de datos solo requiere reemplazar el adaptador (la UI no importa `redDirect.ts` directamente).

## Decisiones

- **Sí:** Expo / React Native. Un código para ambas tiendas y el usuario ya trabaja en JS. Widgets nativos vendrán por módulos en SPEC 08.
- **Sí:** interfaz `TransitSource` + adaptador directo. La fuente directa es frágil y está pendiente de decidir; aislarla abarata el cambio a Pi o backend propio.
- **Sí:** almacenamiento local con `schemaVersion`. Sin cuentas ni backend evita login, privacidad y costos; la sincronización será otra spec.
- **Sí:** búsqueda por código, nombre y GPS. Cubre a quien conoce su paradero y a quien no.
- **Sí:** nombre provisional "Paradero"; el definitivo se decide antes de publicar.
- **Sí:** esta spec incluye solo favoritos; las reglas de programación son SPEC 06 para no mezclar dominios.
- **Sí:** pruebas con Expo Go en esta spec. Sin módulos nativos propios; el dev build se difiere a SPEC 08 (widgets).
- **Sí:** proyecto Expo en `app/` de este repo; `widget.js` sigue independiente.
- **No:** mapa interactivo (mucho trabajo, spec propia).
- **No:** usar la Pi/Cloudflare en la v1 (SPEC 03 sigue en borrador y la Pi no está pensada para público).
- **No:** reutilizar el estilo señalético del widget como identidad principal: se busca algo más juvenil (se conserva la idea de chip de color por línea).

## Riesgos

| Riesgo                                                                 | Mitigación                                                                                   |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| API directa de Red no oficial: puede cambiar, bloquear o exigir tokens | Paso 1 es un spike; interfaz `TransitSource`; SPEC 07 migrará a backend propio.              |
| Endpoints de búsqueda por nombre/cercanos inexistentes o distintos     | Spike antes de codificar; si faltan, usar listado local de paraderos como respaldo (nueva decisión). |
| Formato de `tiempo_llegada` sin verificar con buses reales             | `minutes: number \| null` + `rawText` siempre visible; probar de día.                       |
| Sin servicio nocturno las llegadas vienen vacías                       | Probar de día; estado vacío explícito.                                                       |
| Publicar una app con fuente no oficial puede violar términos           | Fuera de alcance publicar; revisar condiciones antes de SPEC 07/tiendas.                     |
| Permiso de ubicación denegado                                          | Búsqueda manual siempre disponible.                                                          |

## Qué **no** está en esta spec

- Programación de paraderos por hora o fecha.
- Backend, cuentas y sincronización.
- Widgets, notificaciones y perfiles.
- Mapa, rutas y filtros por línea.
- Publicación en App Store / Play Store.
