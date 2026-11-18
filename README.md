# red-widget

Widget de iOS con los próximos buses de un paradero de Santiago (PG1407), sobre una instancia propia de [RedTransporteAPI](https://github.com/iiroak/RedTransporteAPI).

Proyecto spec-driven (skill `/spec`). Toda decisión e iteración queda en `specs/` y `docs/`.

## Arquitectura

```
iPhone (Scriptable)
   │  Authorization: Bearer <token widget>
   ├─ en casa: http://192.168.1.250:8090          (SPEC 02, hoy)
   └─ fuera:   https://bus.<dominio>  (cloudflared) (SPEC 03, pendiente)
        ▼
Raspberry Pi: contenedor redtransporte-api (:8090 → :8000)
        ▼
GTFS (DTPM) + predicciones iBus / RED web
```

## Estado

| Spec | Título                                | Estado      |
| ---- | ------------------------------------- | ----------- |
| 01   | `specs/01-backend-raspberry.md`       | Implementado |
| 02   | `specs/02-widget-scriptable-paradero.md` | Implementado |
| 03   | `specs/03-acceso-remoto-cloudflare.md` | Borrador    |
| 04   | `specs/04-estilo-widget-tema.md`      | En revisión |

## Agregar al inicio (iPhone)

Ejecutar el script en la app solo muestra una preview. Para verlo en la pantalla principal:

1. Mantén presionado un espacio vacío del inicio → **+** → **Scriptable** → tamaño → **Agregar widget**.
2. Toca el widget → **Script** = `widget.js`.
3. Tema: botón ◐ del widget (mediano/grande) o `Parameter` = `claro` / `oscuro` / `auto`.

Otros documentos: `docs/bitacora.md` (qué se hizo y qué falló), `docs/backlog.md` (ideas para futuras specs).

## Archivos

- `stack.yml`: stack de Portainer tal como está desplegado.
- `widget.js`: script de Scriptable.
- `scripts/reset-token.js`: reinicia el token en Keychain (fix de 401).
- `.env.example`: variable del stack (`MASTER_TOKEN`).

## Operación (reemplaza los placeholders; nunca versionar tokens reales)

```bash
# salud
curl http://192.168.1.250:8090/health

# crear token de cliente (master token)
curl -X POST http://192.168.1.250:8090/admin/tokens \
  -H "Authorization: Bearer <MASTER_TOKEN>" -H "Content-Type: application/json" \
  -d '{"name":"widget-ios","requests_per_minute":30,"allow_gtfs":true,"allow_ibus":true,"allow_red_web":true,"allow_raptor":false}'

# predicciones del paradero
curl -H "Authorization: Bearer <TOKEN_WIDGET>" http://192.168.1.250:8090/stops/PG1407/predictions

# info de una línea y sus paraderos
curl -H "Authorization: Bearer <TOKEN_WIDGET>" http://192.168.1.250:8090/routes/G22
```

Notas:

- El master token solo sirve para `/admin/*` y `POST /gtfs/update`. La lectura usa tokens de API.
- Códigos de paradero de buses empiezan con `PG`/`PA`.
- Swagger: `http://192.168.1.250:8090/docs`.

## Cómo agregar una feature

1. `/spec <descripción>` → crea `specs/NN-slug.md` en `Borrador`.
2. Revisar, pasar a `Aprobado`.
3. `/spec-impl NN-slug`.
4. Anotar problemas en `docs/bitacora.md` y marcar la spec `Implementado`.
