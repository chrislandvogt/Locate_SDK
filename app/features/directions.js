// Directions between two or more places, on the ArcGIS routing service.
// Needs the ArcGIS Location Platform key (runtime-config.js): without one it doesn't mount at all.
// Config: directions: true | { maxStops: 5 }
export function mount({ addPanel, el, runtime }, opts) {
  if (!runtime.arcgisApiKey) return;
  addPanel({
    id: "directions", icon: "car", heading: "Directions",
    render: (p) => p.append(el("arcgis-directions", {
      "reference-element": "map",
      "use-default-route-layer": true, // draws the route on the map
      "max-stops": String(opts.maxStops || 5),
      unit: "metric",
      "hide-save-button": true, // saving needs a signed-in ArcGIS account
      "hide-save-as-button": true,
      "hide-print-button": true,
      "hide-layer-details": true,
    })),
  });
}
