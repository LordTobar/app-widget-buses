// Widget Scriptable: próximos buses de un paradero (RedTransporteAPI)
// Pegar en Scriptable. Al ejecutarlo en la app la 1ª vez pide el token (queda en Keychain).

// ===== CONFIG =====
const BASE_URL = "http://192.168.1.250:8090"; // LAN; cambiar por https://bus.TUDOMINIO.cl al configurar cloudflared
const STOP_CODE = "PG1407";
const REFRESH_MIN = 5;
// ==================

const KEY_TOKEN = "redtransporte_token";
const CACHE_FILE = "redtransporte_cache.json";

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
  try {
    const fm = FileManager.local();
    return JSON.parse(fm.readString(cachePath()));
  } catch (e) { return null; }
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

// Aplana servicios[].buses[] -> filas ordenadas por minutos
function flatten(data) {
  const rows = [];
  for (const s of data.servicios || []) {
    for (const b of s.buses || []) {
      const txt = (b.tiempo_llegada || "").trim();
      const m = txt.match(/\d+/);
      rows.push({
        servicio: s.servicio,
        texto: txt || "?",
        mins: /llegando|menos/i.test(txt) && !m ? 0 : (m ? parseInt(m[0], 10) : 999),
        dist: b.distancia,
      });
    }
  }
  rows.sort((a, b) => a.mins - b.mins);
  return rows;
}

function maxRows() {
  switch (config.widgetFamily) {
    case "small": return 3;
    case "large": return 10;
    default: return 4; // medium y ejecución en app
  }
}

function build(data, offline, errMsg) {
  const w = new ListWidget();
  w.backgroundColor = new Color("#14181f");
  w.setPadding(12, 14, 12, 14);

  const nombre = data && data.paradero && (data.paradero.nombre || data.paradero.name || data.paradero.stop_name);
  const title = w.addText(nombre ? `${STOP_CODE} · ${nombre}` : STOP_CODE);
  title.font = Font.boldSystemFont(12);
  title.textColor = new Color("#9aa4b2");
  title.lineLimit = 1;
  w.addSpacer(6);

  if (!data) {
    const t = w.addText(errMsg || "Sin datos");
    t.font = Font.systemFont(12);
    t.textColor = Color.red();
    return w;
  }

  const rows = flatten(data).slice(0, maxRows());
  if (rows.length === 0) {
    const t = w.addText("Sin buses próximos");
    t.font = Font.systemFont(13);
    t.textColor = Color.white();
  }
  for (const r of rows) {
    const line = w.addStack();
    line.centerAlignContent();
    const s = line.addText(r.servicio);
    s.font = Font.boldMonospacedSystemFont(15);
    s.textColor = new Color("#4cc2ff");
    line.addSpacer();
    const t = line.addText(r.texto);
    t.font = Font.mediumSystemFont(13);
    t.textColor = r.mins <= 3 ? new Color("#ffb454") : Color.white();
    t.lineLimit = 1;
    t.minimumScaleFactor = 0.6;
    w.addSpacer(3);
  }

  w.addSpacer();
  const df = new DateFormatter();
  df.dateFormat = "HH:mm";
  const f = w.addText((offline ? "sin conexión · " : "act. ") + df.string(new Date(data._ts || Date.now())));
  f.font = Font.systemFont(9);
  f.textColor = offline ? new Color("#ffb454") : new Color("#6b7686");

  w.refreshAfterDate = new Date(Date.now() + REFRESH_MIN * 60 * 1000);
  return w;
}

let widget;
try {
  const token = await getToken();
  const data = await fetchPredictions(token);
  data._ts = Date.now();
  saveCache(data);
  widget = build(data, false);
} catch (e) {
  const cached = loadCache();
  widget = cached ? build(cached, true) : build(null, true, `Error: ${e.message}`);
}

if (config.runsInWidget) {
  Script.setWidget(widget);
} else {
  await widget.presentMedium();
}
Script.complete();
