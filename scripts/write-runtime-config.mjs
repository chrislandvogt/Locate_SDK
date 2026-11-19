// Writes app/runtime-config.js from environment variables (GitHub Actions secrets) at deploy time.
// Never prints values. Usage: node scripts/write-runtime-config.mjs app/runtime-config.js
import fs from "node:fs";

const out = process.argv[2] || "app/runtime-config.js";
const e = process.env;
const config = {
  arcgisApiKey: e.ARCGIS_API_KEY || "",
  foundry: {
    url: e.FOUNDRY_URL || "",
    key: e.FOUNDRY_KEY || "",
    model: e.FOUNDRY_MODEL || "",
    auth: e.FOUNDRY_AUTH || "api-key",
    label: e.FOUNDRY_LABEL || "Assistant",
  },
};
fs.writeFileSync(out, `window.RUNTIME_CONFIG = ${JSON.stringify(config)};\n`);
console.log(`Wrote ${out}: ArcGIS key ${config.arcgisApiKey ? "set" : "not set"}, Foundry ${config.foundry.url && config.foundry.key ? "set" : "not set"}`);
