// "Near me": zooms to the device location (the browser asks the user first).
export function mount({ mapEl, el }) {
  mapEl.append(el("arcgis-locate", { slot: "top-left" }));
}
