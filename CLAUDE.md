# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Qué es

Widget iOS (Scriptable, JS) con los próximos buses del paradero PG1407 (Santiago). Consume una instancia propia de [RedTransporteAPI](https://github.com/iiroak/RedTransporteAPI) en una Raspberry Pi. Sin build, lint ni tests: `widget.js` se pega/ejecuta en la app Scriptable del iPhone (no corre con Node; usa globals de Scriptable: `ListWidget`, `Keychain`, `Request`, `args`, `config`, `Script`).

## Flujo spec-driven

Todo cambio pasa por `specs/NN-slug.md` (`/spec` crea el borrador → `Aprobado` → `/spec-impl NN-slug`). Estados en tabla de `README.md`. Problemas y fixes se anotan en `docs/bitacora.md`; ideas futuras en `docs/backlog.md`. Al terminar, marcar la spec `Implementado` y actualizar la tabla del README.

## Arquitectura

- `widget.js` (único script del widget). Secciones: CONFIG (`BASE_URL`, `STOP_CODE`, `REFRESH_MIN`, colores de línea) → tema (`getMode`/`cycleMode`/`colors`) → red y caché → datos (`flatten`, orden por minutos) → UI (`build` elige layout por `config.widgetFamily`: small/medium/large) → main.
- Flujo main: `fetchPredictions` → guarda caché en `Documents/redtransporte_cache.json` → `build`. Si falla la red, usa caché (`offline=true`, footer lo indica); sin caché, muestra error.
- Estado persistente en Keychain: `redtransporte_token` (Bearer del widget, se pide por Alert la 1ª vez) y `redtransporte_theme` (`auto|claro|oscuro`).
- Tema: prioridad `Parameter` del widget > Keychain > `auto`. El botón ◐ (o tocar el widget en small) reejecuta el script vía `scriptable:///run/<script>?theme=cycle`. Modo `auto` usa `Color.dynamic`.
- Colores de línea: `LINE_COLORS` → base sin sufijo en minúscula (G22c hereda G22) → hash sobre `PALETTE`. `readable()` elige texto blanco/oscuro por contraste.
- API: `GET /stops/{code}/predictions` con `Authorization: Bearer`. Forma: `servicios[] → buses[] { tiempo_llegada (texto), distancia }`. El master token solo sirve para `/admin/*`; la lectura exige token de API.
- `stack.yml`: stack de Portainer tal como está desplegado (imagen se compila en la Pi, oficial es solo amd64; puerto `8090:8000`).
- `scripts/reset-token.js`: se ejecuta en Scriptable para reescribir el token en Keychain (fix de 401 por token mal pegado). Nunca versionar el valor real.

## Notas

- `BASE_URL` hoy es IP LAN (`http://192.168.1.250:8090`); fuera de casa no funciona hasta SPEC 03 (cloudflared).
- Sin servicio nocturno las predicciones llegan vacías: probar de día.
- No versionar tokens (`MASTER_TOKEN` va en `.env`, ver `.env.example`).
- Responder en español y conciso (instrucción global del usuario).
