// Address and place search, limited to Australia.
export function mount({ mapEl, el }, opts) {
  const search = el("arcgis-search", { slot: "top-right", "popup-disabled": false });
  mapEl.append(search);
  search.componentOnReady?.().then(() => {
    // Keep results in Australia.
    for (const src of search.allSources ?? []) if ("countryCode" in src) src.countryCode = "AUS";
    if (opts.placeholder) search.allPlaceholder = opts.placeholder;
  });
}
