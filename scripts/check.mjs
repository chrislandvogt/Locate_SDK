// Pre-push guard, also run in the Pages workflow. Fails fast on the mistakes that would break the demo.
//   node scripts/check.mjs
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const app = path.join(root, "app");
const problems = [];

// 1. Every JS file parses.
const jsFiles = [];
(function walk(dir) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) walk(p);
    else if (f.name.endsWith(".js")) jsFiles.push(p);
  }
})(app);
for (const f of jsFiles) {
  try { execFileSync(process.execPath, ["--check", f], { stdio: "pipe" }); }
  catch (e) { problems.push(`Syntax error in ${path.relative(root, f)}:\n${String(e.stderr).trim()}`); }
}

// 2. Config only uses catalogue layers and existing features.
const catalogue = JSON.parse(fs.readFileSync(path.join(app, "catalogue.json"), "utf8"));
const ids = new Set(catalogue.layers.map((l) => l.id));
const { default: config } = await import(pathToFileURL(path.join(app, "config.js")).href);
for (const l of config.layers || []) if (!ids.has(l.id)) problems.push(`config.layers: "${l.id}" is not in catalogue.json`);
const used = new Set((config.layers || []).map((l) => l.id));

// No AI assistant in the public workshop app (no safe place for a model key). See CLAUDE.md.
const assistant = config.features?.assistant;
if (assistant && assistant.enabled !== false) problems.push("features.assistant must stay false for the workshop app (CLAUDE.md: No in-app assistant)");

// No stock styling: every feature layer needs its own renderer, or it draws with the service's defaults.
for (const l of config.layers || []) {
  const entry = catalogue.layers.find((e) => e.id === l.id);
  if (entry?.type === "feature" && !l.renderer) problems.push(`${l.id}: no renderer, so it would draw with the service's default styling`);
}

// Hidden (personal) fields must not appear anywhere in a layer's config: popups, labels, renderers, filters.
for (const l of config.layers || []) {
  const entry = catalogue.layers.find((e) => e.id === l.id);
  const text = JSON.stringify(l).toLowerCase() + JSON.stringify(Object.values(config.features || {}).filter((f) => f?.layer === l.id)).toLowerCase();
  for (const h of entry?.hiddenFields || []) if (text.includes(h.toLowerCase())) problems.push(`${l.id}: uses hidden field ${h} (personal information)`);
}
for (const [name, opts] of Object.entries(config.features || {})) {
  if (!opts) continue;
  if (!fs.existsSync(path.join(app, "features", `${name}.js`))) problems.push(`features.${name}: no app/features/${name}.js`);
  if (opts.layer && !used.has(opts.layer)) problems.push(`features.${name}.layer "${opts.layer}" is not in config.layers`);
}
if (!config.title || config.title === "Starter map") console.warn("warning: config.title is still the starter title");

// 3. No secrets in tracked app files (runtime-config.js is generated and excluded).
const SECRET = [/AAPT[A-Za-z0-9_-]{20,}/, /\bsk-[A-Za-z0-9]{20,}/, /\b[0-9a-f]{32}\b/i, /api[-_]?key["']?\s*[:=]\s*["'][A-Za-z0-9_-]{16,}/i];
for (const f of jsFiles.concat(path.join(app, "index.html"))) {
  if (/runtime-config(\.example)?\.js$/.test(f)) continue;
  const text = fs.readFileSync(f, "utf8");
  for (const re of SECRET) if (re.test(text)) problems.push(`Possible secret in ${path.relative(root, f)} (${re})`);
}

if (problems.length) {
  console.error(`check failed (${problems.length}):\n- ` + problems.join("\n- "));
  process.exit(1);
}
console.log(`check passed: ${jsFiles.length} JS files, ${config.layers.length} layers, ${Object.values(config.features).filter(Boolean).length} features`);
