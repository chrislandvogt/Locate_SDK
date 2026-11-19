// Copy to runtime-config.js for local testing (gitignored). In production the Pages workflow writes
// this file from GitHub Actions secrets. Never commit real values.
window.RUNTIME_CONFIG = {
  // Optional. A referrer-restricted ArcGIS key with basemap access only. Without it, keyless Esri tiles are used.
  arcgisApiKey: "",
  foundry: {
    url: "", // full chat-completions URL
    key: "", // CAPPED workshop key; rotate after the session
    model: "",
    auth: "api-key", // or "bearer"
    label: "Sol 6.1",
  },
};
