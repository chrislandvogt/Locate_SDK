// Filter one layer by the values of one field. Config: { layer, field, label, zoom: true }
export async function mount({ addPanel, layers, view, el, notify }, opts) {
  const layer = layers.get(opts.layer);
  if (!layer) throw new Error(`filter: layer "${opts.layer}" is not in config.layers`);
  await layer.load();
  const field = layer.fields.find((f) => f.name.toLowerCase() === String(opts.field).toLowerCase());
  if (!field) throw new Error(`filter: field "${opts.field}" not found on ${layer.title}`);

  const baseWhere = layer.definitionExpression || "1=1";
  const combo = el("calcite-combobox", { label: opts.label || field.alias, placeholder: `Choose ${String(opts.label || field.alias).toLowerCase()}`, "selection-mode": "multiple", scale: "m" });
  const count = el("p", { class: "muted" });
  const clear = el("calcite-button", { appearance: "outline", width: "full", "icon-start": "reset" }, "Clear filter");

  addPanel({
    id: "filter", icon: "filter", heading: "Filter", description: layer.title,
    render: (p) => p.append(el("div", { class: "panel-body" }, el("calcite-label", {}, opts.label || field.alias, combo), count, clear)),
  });

  // Distinct values (capped so a huge layer can't stall the demo).
  const res = await layer.queryFeatures({ where: baseWhere, outFields: [field.name], returnDistinctValues: true, returnGeometry: false, orderByFields: [field.name], num: 500 });
  const values = res.features.map((f) => f.attributes[field.name]).filter((v) => v != null && v !== "");
  combo.append(...values.map((v) => el("calcite-combobox-item", { value: String(v), heading: String(v) })));

  const quote = (v) => (field.type === "string" ? `'${String(v).replace(/'/g, "''")}'` : Number(v));
  async function apply() {
    // selectedItems is undefined until the combobox renders (e.g. panel still closed on a phone).
    const picked = [...(combo.selectedItems || [])].map((i) => i.value);
    layer.definitionExpression = picked.length ? `(${baseWhere}) AND ${field.name} IN (${picked.map(quote).join(",")})` : baseWhere === "1=1" ? null : baseWhere;
    const n = await layer.queryFeatureCount({ where: layer.definitionExpression || "1=1" }).catch(() => null);
    count.textContent = n == null ? "" : `${n.toLocaleString("en-AU")} showing`;
    if (picked.length && opts.zoom !== false) {
      const { extent } = await layer.queryExtent({ where: layer.definitionExpression }).catch(() => ({}));
      if (extent) view.goTo(extent.expand(1.2)).catch(() => {});
    }
  }
  combo.addEventListener("calciteComboboxChange", apply);
  clear.addEventListener("click", () => { for (const i of combo.selectedItems || []) i.selected = false; apply(); });
  apply().catch((e) => notify("Filter failed", e.message));
}
