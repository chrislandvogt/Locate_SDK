// Layer list and legend, each in its own panel.
export function mount({ addPanel, el }) {
  addPanel({
    id: "layers", icon: "layers", heading: "Layers",
    render: (p) => p.append(el("arcgis-layer-list", { "reference-element": "map", "show-heading": false, "visibility-appearance": "checkbox" })),
  });
  addPanel({
    id: "legend", icon: "legend", heading: "Legend",
    render: (p) => p.append(el("arcgis-legend", { "reference-element": "map" })),
  });
}
