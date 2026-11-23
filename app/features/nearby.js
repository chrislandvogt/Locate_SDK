// "Nearby": finds places (cafes, pharmacies, petrol...) around the middle of the map, on the ArcGIS Places service.
// Needs the ArcGIS Location Platform key (runtime-config.js): without one it doesn't mount at all.
// Config: nearby: true | { searches: ["Cafe", "Pharmacy"], radius: 1500 }   (radius in metres, at most 10,000)
export async function mount({ addPanel, el, view, runtime, $arcgis }, opts) {
  if (!runtime.arcgisApiKey) return;
  const [places, PlacesQueryParameters, GraphicsLayer, Graphic] = await $arcgis.import([
    "@arcgis/core/rest/places.js", "@arcgis/core/rest/support/PlacesQueryParameters.js",
    "@arcgis/core/layers/GraphicsLayer.js", "@arcgis/core/Graphic.js",
  ]);
  const searches = opts.searches || ["Cafe", "Pharmacy", "Supermarket", "Petrol station"];
  const radius = Math.min(opts.radius || 1500, 10000);
  const layer = new GraphicsLayer({ title: "Nearby places", listMode: "hide" });
  view.map.add(layer);

  const km = (m) => (m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m / 10) * 10} m`);
  const input = el("calcite-input-text", { placeholder: "Search nearby, e.g. bakery", scale: "m", icon: "search" });
  const chips = el("calcite-chip-group", { label: "Quick searches", "selection-mode": "none", scale: "s" },
    ...searches.map((s) => el("calcite-chip", { value: s, scale: "s", appearance: "outline-fill", onclick: () => find(s) }, s)));
  const status = el("p", { class: "muted" }, `Searches within ${km(radius)} of the middle of the map.`);
  const list = el("calcite-list", { label: "Nearby places", "interaction-mode": "interactive", scale: "s" });
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") find(input.value); });

  addPanel({
    id: "nearby", icon: "pin-tear", heading: "Nearby",
    render: (p) => p.append(el("div", { class: "panel-body" }, input, chips, status, list)),
  });

  async function find(text) {
    text = String(text || "").trim();
    if (text.length < 3) return void (status.textContent = "Type at least three letters.");
    status.textContent = `Looking for "${text}"…`;
    list.replaceChildren();
    layer.removeAll();
    try {
      const centre = view.center.clone();
      const res = await places.queryPlacesNearPoint(new PlacesQueryParameters({ point: centre, radius, searchText: text, pageSize: 20 }));
      const found = res.results || [];
      status.textContent = found.length
        ? `${found.length} within ${km(radius)} of the middle of the map.`
        : `Nothing called "${text}" within ${km(radius)}. Move the map or try another word.`;
      for (const r of found) {
        const kind = r.categories?.[0]?.label || "Place";
        const g = new Graphic({
          geometry: r.location,
          attributes: { name: r.name, kind, distance: km(r.distance) },
          symbol: { type: "simple-marker", style: "circle", size: 9, color: "#0052c2", outline: { color: [255, 255, 255, 0.9], width: 1.25 } },
          popupTemplate: { title: "{name}", content: "{kind}, {distance} from the middle of the map." },
        });
        layer.add(g);
        const item = el("calcite-list-item", { label: r.name, description: `${kind} · ${km(r.distance)}` });
        item.addEventListener("calciteListItemSelect", () => {
          view.goTo({ target: r.location, zoom: Math.max(view.zoom, 16) }).catch(() => {});
          view.openPopup({ features: [g], location: r.location });
        });
        list.append(item);
      }
      if (found.length) view.goTo(layer.graphics.toArray(), { duration: 600 }).catch(() => {});
    } catch (err) {
      status.textContent = "The places search didn't work. Check the connection and try again.";
      console.warn("Places search failed", err);
    }
  }
}
