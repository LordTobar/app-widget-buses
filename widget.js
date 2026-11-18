// Widget Scriptable: próximos buses de un paradero (RedTransporteAPI) — v2 (SPEC 04)
// Pegar en Scriptable. La 1ª vez pide el token (queda en Keychain).
// Tema: toca el botón ◐ (mediano/grande) o el widget completo (pequeño).
// Alternativa fija: Edit Widget > Parameter = "claro" | "oscuro" | "auto".

// ===== CONFIG =====
const BASE_URL = "http://192.168.1.250:8090"; // LAN; cambiar por https://bus.TUDOMINIO.cl en SPEC 03
const STOP_CODE = "PG1407";
const REFRESH_MIN = 5;
const LINE_COLORS = { G22: "#F58220" }; // color por línea (G22c hereda de G22); el resto sale de PALETTE
const PALETTE = ["#F58220", "#1F8FE0", "#12A37A", "#C0398B", "#7A5AF8", "#D64545"];
// ==================

const KEY_TOKEN = "redtransporte_token";
const KEY_THEME = "redtransporte_theme";
const CACHE_FILE = "redtransporte_cache.json";
const MODES = ["auto", "claro", "oscuro"];

const PAL = {
  claro: { bg: "#EAF0F7", surface: "#FFFFFF", text: "#0A1424", muted: "#4A5A73", hot: "#B45309" },
  oscuro: { bg: "#0B1220", surface: "#16223A", text: "#F4F7FB", muted: "#A9B6CC", hot: "#FFB020" },
};

// ---------- tema ----------
function getMode() {
  const p = (args.widgetParameter || "").toString().trim().toLowerCase();
  if (MODES.includes(p)) return p;
  try {
    if (Keychain.contains(KEY_THEME)) {
      const m = Keychain.get(KEY_THEME);
      if (MODES.includes(m)) return m;
    }
  } catch (e) {}
  return "auto";
}
function cycleMode() {
  const next = MODES[(MODES.indexOf(getMode()) + 1) % MODES.length];
  Keychain.set(KEY_THEME, next);
  return next;
}
function colors(mode) {
  const out = {};
  for (const k of Object.keys(PAL.claro)) {
    out[k] = mode === "auto"
      ? Color.dynamic(new Color(PAL.claro[k]), new Color(PAL.oscuro[k]))
      : new Color(PAL[mode][k]);
  }
  return out;
}
function toggleUrl() {
  return `scriptable:///run/${encodeURIComponent(Script.name())}?theme=cycle`;
}
function modeIcon(mode) {
  return mode === "claro" ? "sun.max.fill" : mode === "oscuro" ? "moon.fill" : "circle.lefthalf.filled";
}

// ---------- tipografía / color de línea ----------
function dinFont(size) {
  try { return new Font("DINAlternate-Bold", size); } catch (e) { return Font.heavySystemFont(size); }
}
function lineColor(s) {
  if (LINE_COLORS[s]) return LINE_COLORS[s];
  const base = s.replace(/[a-z]$/, "");
  if (LINE_COLORS[base]) return LINE_COLORS[base];
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
}
// texto del chip: el de mayor contraste (blanco o tinta) sobre el color de la línea
function readable(hex) {
  const h = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4]
    .map((i) => parseInt(h.substr(i, 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
  const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return 1.05 / (L + 0.05) > (L + 0.05) / 0.056 ? "#FFFFFF" : "#0A1424";
}

// ---------- red y caché ----------
async function getToken() {
  if (Keychain.contains(KEY_TOKEN)) return Keychain.get(KEY_TOKEN);
  const a = new Alert();
  a.title = "Token API";
  a.message = "Pega el token del widget";
  a.addSecureTextField("token");
  a.addAction("Guardar");
  await a.present();
  const t = a.textFieldValue(0).trim();
  Keychain.set(KEY_TOKEN, t);
  return t;
}
function cachePath() {
  const fm = FileManager.local();
  return fm.joinPath(fm.documentsDirectory(), CACHE_FILE);
}
function saveCache(obj) {
  try { FileManager.local().writeString(cachePath(), JSON.stringify(obj)); } catch (e) {}
}
function loadCache() {
  try { return JSON.parse(FileManager.local().readString(cachePath())); } catch (e) { return null; }
}
async function fetchPredictions(token) {
  const req = new Request(`${BASE_URL}/stops/${STOP_CODE}/predictions`);
  req.headers = { Authorization: `Bearer ${token}` };
  req.timeoutInterval = 15;
  const data = await req.loadJSON();
  const code = req.response ? req.response.statusCode : 0;
  if (code !== 200) throw new Error(`HTTP ${code}`);
  return data;
}

// ---------- datos ----------
function flatten(data) {
  const rows = [];
  for (const s of data.servicios || []) {
    for (const b of s.buses || []) {
      const txt = (b.tiempo_llegada || "").trim();
      const m = txt.match(/\d+/);
      rows.push({
        servicio: s.servicio,
        texto: txt || "?",
        mins: /llegando|menos/i.test(txt) && !m ? 0 : m ? parseInt(m[0], 10) : 999,
        dist: b.distancia,
      });
    }
  }
  rows.sort((a, b) => a.mins - b.mins);
  return rows;
}
function timeLabel(r) {
  if (r.mins === 999) return r.texto;
  return r.mins === 0 ? "Llegando" : `${r.mins} min`;
}
function niceName(data) {
  const raw = data && data.paradero && (data.paradero.nombre || data.paradero.name || data.paradero.stop_name);
  if (!raw) return STOP_CODE;
  return raw
    .replace(/\s*\/\s*ESQ\.?\s*/i, " / ")
    .toLowerCase()
    .replace(/(^|[\s/])(\S)/g, (_, a, b) => a + b.toUpperCase());
}
function emptyMessage(data) {
  const s = (data.servicios || []).find((x) => x.mensaje);
  return s ? s.mensaje : "Sin buses próximos";
}

// ---------- componentes ----------
function addChip(parent, servicio, size) {
  const bg = lineColor(servicio);
  const s = parent.addStack();
  s.setPadding(1, 7, 1, 7);
  s.cornerRadius = 6;
  s.backgroundColor = new Color(bg);
  const t = s.addText(servicio);
  t.font = dinFont(size);
  t.textColor = new Color(readable(bg));
  return s;
}

function addHeader(w, data, C, mode, family) {
  const h = w.addStack();
  h.centerAlignContent();
  const t = h.addText(niceName(data));
  t.font = Font.boldSystemFont(family === "small" ? 11 : 13);
  t.textColor = C.text;
  t.lineLimit = 1;
  t.minimumScaleFactor = 0.8;
  h.addSpacer();
  if (family !== "small") {
    const b = h.addStack();
    b.size = new Size(28, 28);
    b.cornerRadius = 14;
    b.backgroundColor = C.surface;
    b.centerAlignContent();
    b.url = toggleUrl();
    b.addSpacer();
    const img = b.addImage(SFSymbol.named(modeIcon(mode)).image);
    img.imageSize = new Size(15, 15);
    img.tintColor = C.text;
    b.addSpacer();
  }
}

function addHero(parent, r, C, data, scale) {
  const col = parent.addStack();
  col.layoutVertically();
  if (!r) {
    const t = col.addText("Sin buses");
    t.font = Font.heavySystemFont(20 * scale);
    t.textColor = C.text;
    const m = col.addText(emptyMessage(data));
    m.font = Font.semiboldSystemFont(11);
    m.textColor = C.muted;
    m.minimumScaleFactor = 0.8;
    return;
  }
  addChip(col, r.servicio, 15 * scale);
  col.addSpacer(2);
  const row = col.addStack();
  row.bottomAlignContent();
  const hot = r.mins <= 3;
  if (r.mins < 999 && r.mins > 0) {
    const n = row.addText(String(r.mins));
    n.font = dinFont(50 * scale);
    n.textColor = hot ? C.hot : C.text;
    const u = row.addText(" min");
    u.font = Font.boldSystemFont(14 * scale);
    u.textColor = C.muted;
  } else {
    const n = row.addText(timeLabel(r));
    n.font = dinFont(30 * scale);
    n.textColor = hot ? C.hot : C.text;
    n.minimumScaleFactor = 0.6;
    n.lineLimit = 1;
  }
}

function addRow(parent, r, C) {
  const row = parent.addStack();
  row.centerAlignContent();
  row.backgroundColor = C.surface;
  row.cornerRadius = 8;
  row.setPadding(4, 8, 4, 8);
  addChip(row, r.servicio, 13);
  row.addSpacer();
  const t = row.addText(timeLabel(r));
  t.font = dinFont(16);
  t.textColor = r.mins <= 3 ? C.hot : C.text;
  t.lineLimit = 1;
}

function addFooter(w, data, offline, C) {
  const df = new DateFormatter();
  df.dateFormat = "HH:mm";
  const f = w.addText((offline ? "Sin conexión · " : "Actualizado ") + df.string(new Date(data._ts || Date.now())));
  f.font = Font.semiboldSystemFont(10);
  f.textColor = offline ? C.hot : C.muted;
  f.rightAlignText();
}

function listRows(parent, rows, C, max) {
  rows.slice(0, max).forEach((r, i) => {
    if (i) parent.addSpacer(4);
    addRow(parent, r, C);
  });
}

// ---------- widget ----------
function build(data, offline, errMsg, mode) {
  const family = config.widgetFamily || "medium";
  const C = colors(mode);
  const w = new ListWidget();
  w.backgroundColor = C.bg;
  w.setPadding(12, 14, 10, 14);
  w.refreshAfterDate = new Date(Date.now() + REFRESH_MIN * 60 * 1000);

  if (!data) {
    const t = w.addText(STOP_CODE);
    t.font = Font.boldSystemFont(13);
    t.textColor = C.text;
    w.addSpacer(6);
    const e = w.addText(errMsg || "Sin datos");
    e.font = Font.semiboldSystemFont(13);
    e.textColor = C.hot;
    return w;
  }

  const rows = flatten(data);
  const first = rows[0];
  const rest = rows.slice(1);

  if (family === "small") w.url = toggleUrl();
  addHeader(w, data, C, mode, family);
  w.addSpacer(6);

  if (family === "medium") {
    const body = w.addStack();
    body.topAlignContent();
    const left = body.addStack();
    left.size = new Size(118, 0);
    addHero(left, first, C, data, 1);
    body.addSpacer(12);
    const right = body.addStack();
    right.layoutVertically();
    listRows(right, rest, C, 3);
  } else if (family === "small") {
    addHero(w, first, C, data, 0.9);
    w.addSpacer(6);
    listRows(w, rest, C, 1);
  } else {
    addHero(w, first, C, data, 1.3);
    w.addSpacer(10);
    listRows(w, rest, C, 8);
  }

  w.addSpacer();
  addFooter(w, data, offline, C);
  return w;
}

// ---------- main ----------
if (args.queryParameters && args.queryParameters.theme === "cycle") cycleMode();
const mode = getMode();

let widget;
try {
  const token = await getToken();
  const data = await fetchPredictions(token);
  data._ts = Date.now();
  saveCache(data);
  widget = build(data, false, null, mode);
} catch (e) {
  const cached = loadCache();
  widget = cached ? build(cached, true, null, mode) : build(null, true, `Error: ${e.message}`, mode);
}

if (config.runsInWidget) {
  Script.setWidget(widget);
} else {
  await widget.presentMedium();
}
Script.complete();
