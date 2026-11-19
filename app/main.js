// Boots the app from config.js + catalogue.json, then mounts each enabled feature from features/.
// The live build should not need to change this file; change config.js or add a feature module.

import config from "./config.js";

const runtime = window.RUNTIME_CONFIG || {};
const $ = (id) => document.getElementById(id);
let theme = config.theme === "light" ? "light" : "dark";

while (!window.$arcgis) await new Promise((r) => setTimeout(r, 30));
const [EsriMap, Basemap, TileLayer, FeatureLayer, MapImageLayer, VectorTileLayer, Extent, esriConfig, reactiveUtils] =
  await $arcgis.import([
    "@arcgis/core/Map.js", "@arcgis/core/Basemap.js", "@arcgis/core/layers/TileLayer.js",
    "@arcgis/core/layers/FeatureLayer.js", "@arcgis/core/layers/MapImageLayer.js",
    "@arcgis/core/layers/VectorTileLayer.js", "@arcgis/core/geometry/Extent.js",
    "@arcgis/core/config.js", "@arcgis/core/core/reactiveUtils.js",
  ]);

if (runtime.arcgisApiKey) esriConfig.apiKey = runtime.arcgisApiKey;

// ---------- helpers shared with features ----------
function notify(title, message = "", kind = "warning") {
  const a = $("alert");
  a.kind = kind;
  $("alert-title").textContent = title;
  $("alert-message").textContent = message;
  a.open = true;
}

function el(tag, props = {}, ...children) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === "class") n.className = v;
    else if (k.startsWith("on") && typeof v === "function") n.addEventListener(k.slice(2), v);
    else if (typeof v === "boolean") n.toggleAttribute(k, v);
    else n.setAttribute(k, v);
  }
  for (const c of children.flat()) if (c != null && c !== false) n.append(c.nodeType ? c : document.createTextNode(String(c)));
  return n;
}

const panels = [];
/** Adds an action + panel to the start panel. render(panel) fills it. Returns the panel. */
function addPanel({ id, icon, heading, description, render }) {
  const bar = $("action-bar");
  const shellPanel = $("panel-start");
  const action = el("calcite-action", { "data-panel": id, icon, text: heading });
  const panel = el("calcite-panel", { "data-panel": id, heading, description, closable: true, hidden: true });
  panel.addEventListener("calcitePanelClose", () => openPanel(null));
  action.addEventListener("click", () => openPanel(panel.hidden ? id : null));
  bar.append(action);
  shellPanel.append(panel);
  panels.push({ id, action, panel });
  render?.(panel);
  return panel;
}
function openPanel(id) {
  for (const p of panels) {
    p.panel.hidden = p.id !== id;
    p.panel.closed = p.id !== id;
    p.action.active = p.id === id;
  }
  $("panel-start").collapsed = id == null;
}

// ---------- basemap ----------
const TILE = "https://services.arcgisonline.com/arcgis/rest/services";
function makeBasemap(kind, theme) {
  if (runtime.arcgisApiKey) {
    const style = { gray: theme === "dark" ? "arcgis/dark-gray" : "arcgis/light-gray", imagery: "arcgis/imagery", topo: "arcgis/topographic", streets: theme === "dark" ? "arcgis/streets-night" : "arcgis/streets" }[kind] || "arcgis/dark-gray";
    // Styles carry their own labels; the "-base" variants drop them where one exists.
    const base = config.basemapLabels === false && ["arcgis/dark-gray", "arcgis/light-gray"].includes(style) ? `${style}/base` : style;
    return new Basemap({ style: { id: base } });
  }
  // No key needed: Esri's tile services.
  const tiles = {
    gray: theme === "dark" ? ["Canvas/World_Dark_Gray_Base", "Canvas/World_Dark_Gray_Reference"] : ["Canvas/World_Light_Gray_Base", "Canvas/World_Light_Gray_Reference"],
    imagery: ["World_Imagery", "Reference/World_Boundaries_and_Places"],
    topo: ["World_Topo_Map"],
    streets: ["World_Street_Map"],
  }[kind] || ["Canvas/World_Dark_Gray_Base", "Canvas/World_Dark_Gray_Reference"];
  return new Basemap({
    baseLayers: [new TileLayer({ url: `${TILE}/${tiles[0]}/MapServer` })],
    // Basemap place names off when our own layers label places, so names aren't doubled.
    referenceLayers: tiles[1] && config.basemapLabels !== false ? [new TileLayer({ url: `${TILE}/${tiles[1]}/MapServer` })] : [],
  });
}

// ---------- layers from the catalogue ----------
const catalogue = await fetch("catalogue.json").then((r) => r.json());
const entries = new Map(catalogue.layers.map((l) => [l.id, l]));
const layers = new Map(); // config id → layer

// ---------- popups ----------
// cfg.popup = {
//   title:  Arcade returning a string, or a plain template like "{NAME}"
//   arcade: Arcade returning { type: "text", text: "<p>…</p>" }  (the sentence that answers the persona)
//   fields: [{ name, label, places }]  optional, at most 4 supporting facts
//   chart:  { type: "column-chart", title, fields: [...] }  only when comparing 3+ values
// }
const isArcade = (s) => typeof s === "string" && /\$feature|\breturn\b/.test(s);

function popupFor(entry, cfg) {
  const p = cfg.popup || {};
  const content = [];
  const expressionInfos = [];

  if (p.arcade) content.push({ type: "expression", expressionInfo: { expression: p.arcade } }); // returnType is always "dictionary"

  // Fields only if asked for, or as a fallback when nothing else is configured.
  const fields = p.fields || (p.arcade ? [] : entry.popupFields || []);
  if (fields.length) {
    content.push({
      type: "fields",
      fieldInfos: fields.map((f) => ({
        fieldName: f.name,
        label: f.label,
        format: f.places != null || f.number ? { digitSeparator: true, places: f.places ?? 0 } : undefined,
      })),
    });
  }
  if (p.chart?.fields?.length) {
    content.push({ type: "media", mediaInfos: [{ type: p.chart.type || "column-chart", title: p.chart.title || "", value: { fields: p.chart.fields } }] });
  }

  let title = `{${entry.displayField}}`;
  if (isArcade(p.title)) { expressionInfos.push({ name: "title", expression: p.title, returnType: "string" }); title = "{expression/title}"; }
  else if (p.title) title = p.title;

  return {
    title,
    content,
    expressionInfos,
    fieldInfos: fields.map((f) => ({ fieldName: f.name, label: f.label })),
    overwriteActions: true, // no stock "Zoom to"
    actions: config.features.assistant?.enabled && config.features.assistant.modes?.includes("explain")
      ? [{ id: "explain", title: "Explain this", icon: "speech-bubble" }] : [],
  };
}

// ---------- labels ----------
// cfg.labels = { expression (Arcade), size, weight: "normal"|"bold", tone: "primary"|"secondary",
//                placement, minScale, maxScale, where }   or an array of these for a hierarchy.
const LABEL_TONES = {
  dark: { primary: "#f5f5f5", secondary: "#cdd3d6", halo: [14, 17, 19, 0.85] },
  light: { primary: "#22272b", secondary: "#495054", halo: [255, 255, 255, 0.9] },
};
function labelingFor(cfg, geometryType, theme) {
  if (!cfg.labels) return null;
  const tones = LABEL_TONES[theme] || LABEL_TONES.dark;
  const defaultPlacement = { point: "above-center", polyline: "center-along", polygon: "always-horizontal" }[geometryType] || "always-horizontal";
  return [].concat(cfg.labels).map((l) => ({
    labelExpressionInfo: { expression: l.expression },
    labelPlacement: l.placement || defaultPlacement,
    minScale: l.minScale ?? 0,
    maxScale: l.maxScale ?? 0,
    where: l.where || null,
    deconflictionStrategy: "static",
    symbol: {
      type: "text",
      color: l.color || tones[l.tone || "primary"],
      haloColor: l.haloColor || tones.halo,
      haloSize: l.haloSize ?? 0.9,
      font: { family: "Avenir Next LT Pro", size: l.size ?? 10, weight: l.weight || "normal" },
    },
  }));
}

function makeLayer(cfg) {
  const entry = entries.get(cfg.id);
  if (!entry) { notify("Layer not in the catalogue", cfg.id); return null; }
  const common = {
    id: cfg.id, title: cfg.title || entry.title, visible: cfg.visible !== false, opacity: cfg.opacity ?? 1,
    minScale: cfg.minScale ?? entry.suggestedMinScale ?? 0,
  };
  if (entry.type === "tile") return new TileLayer({ url: entry.url, ...common });
  if (entry.type === "vector-tile") return new VectorTileLayer({ url: entry.url, ...common });
  if (entry.type === "map-image" && entry.geometryType == null) return new MapImageLayer({ url: entry.url, ...common });
  // The catalogue's own filter (e.g. schools out of a points-of-interest layer) always applies.
  const where = [entry.definitionExpression, cfg.where].filter(Boolean).map((w) => `(${w})`).join(" AND ") || null;
  const hidden = new Set((entry.hiddenFields || []).map((f) => f.toLowerCase()));
  const layer = new FeatureLayer({
    url: entry.url, ...common,
    // Hidden fields (personal information) are never requested, so they can't reach a popup or the assistant.
    outFields: hidden.size ? [] : ["*"],
    definitionExpression: where,
    popupTemplate: popupFor(entry, cfg),
    ...(cfg.renderer ? { renderer: cfg.renderer } : {}),
    ...(cfg.labels ? { labelingInfo: labelingFor(cfg, entry.geometryType, theme), labelsVisible: true } : {}),
    ...(cfg.effect ? { effect: cfg.effect } : {}), // e.g. "drop-shadow(0, 1px, 2px, #0008)" to lift a key layer
    ...(cfg.blendMode ? { blendMode: cfg.blendMode } : {}), // e.g. "multiply" on light basemaps
    ...(cfg.featureReduction ? { featureReduction: cfg.featureReduction } : {}),
    ...(cfg.orderBy ? { orderBy: cfg.orderBy } : {}),
  });
  if (hidden.size) {
    layer.when(() => { layer.outFields = layer.fields.map((f) => f.name).filter((n) => !hidden.has(n.toLowerCase())); });
  }
  layer.hiddenFields = hidden; // read by features (assistant) so they skip these too
  return layer;
}

for (const cfg of config.layers) {
  const layer = makeLayer(cfg);
  if (layer) layers.set(cfg.id, layer);
}

// ---------- map ----------
document.title = config.title;
$("app-title").heading = config.title;
$("app-title").description = config.subtitle || "";

const mapEl = $("map");
mapEl.map = new EsriMap({ basemap: makeBasemap(config.basemap, theme), layers: [...layers.values()] });
mapEl.append(el("arcgis-zoom", { slot: "top-left" }), el("arcgis-home", { slot: "top-left" }));

const hash = location.hash.match(/^#([-\d.]+),([-\d.]+),([\d.]+)$/);
await mapEl.viewOnReady();
const view = mapEl.view;
view.constraints = { rotationEnabled: false, minZoom: 3 };
if (hash) {
  await view.goTo({ center: [Number(hash[1]), Number(hash[2])], zoom: Number(hash[3]) }, { animate: false }).catch(() => {});
} else if (config.extent) {
  const [xmin, ymin, xmax, ymax] = config.extent;
  await view.goTo(new Extent({ xmin, ymin, xmax, ymax, spatialReference: { wkid: 4326 } }), { animate: false }).catch(() => {});
}

for (const layer of layers.values()) {
  layer.load?.().catch((err) => notify(`Couldn't load ${layer.title}`, err?.message || "", "danger"));
}

function setTheme(next) {
  theme = next;
  document.body.dataset.theme = theme;
  document.body.classList.toggle("calcite-mode-dark", theme === "dark");
  document.body.classList.toggle("calcite-mode-light", theme === "light");
  $("esri-theme").href = `https://js.arcgis.com/5.2/esri/themes/${theme}/main.css`;
  if (config.basemap === "gray" || config.basemap === "streets" || !config.basemap) mapEl.map.basemap = makeBasemap(config.basemap, theme);
  // Label colours and halos follow the theme.
  for (const cfg of config.layers) {
    const layer = layers.get(cfg.id);
    if (cfg.labels && layer?.type === "feature") layer.labelingInfo = labelingFor(cfg, entries.get(cfg.id)?.geometryType, theme);
  }
}
setTheme(theme);
$("theme-toggle").addEventListener("click", () => setTheme(theme === "dark" ? "light" : "dark"));

// ---------- features ----------
const ctx = { config, runtime, view, mapEl, layers, entries, catalogue, addPanel, openPanel, notify, el, reactiveUtils, $arcgis: window.$arcgis };
window.app = ctx; // handy in the console during the demo

for (const [name, opts] of Object.entries(config.features)) {
  if (!opts || (typeof opts === "object" && opts.enabled === false)) continue;
  try {
    const mod = await import(`./features/${name}.js`);
    await mod.mount(ctx, opts === true ? {} : opts);
  } catch (err) {
    console.error(`Feature "${name}" failed`, err);
    notify(`The ${name} feature didn't load`, err?.message || "", "danger");
  }
}
if (panels.length && matchMedia("(min-width: 900px)").matches) openPanel(panels[0].id);
else openPanel(null);
