// Copies a link to the current view (centre and zoom in the URL hash).
export function mount({ view, el, notify }) {
  const header = document.querySelector(".header-end");
  const action = el("calcite-action", { id: "share-action", icon: "link", text: "Copy link to this view", scale: "m" });
  header.prepend(action, el("calcite-tooltip", { "reference-element": "share-action", placement: "bottom" }, "Copy link to this view"));
  action.addEventListener("click", async () => {
    const c = view.center;
    const url = `${location.origin}${location.pathname}#${c.longitude.toFixed(4)},${c.latitude.toFixed(4)},${Math.round(view.zoom * 10) / 10}`;
    try {
      await navigator.clipboard.writeText(url);
      notify("Link copied", "Anyone with the link opens the map here.", "success");
    } catch {
      history.replaceState(null, "", url);
      notify("Link is in the address bar", "Copy it from there.", "info");
    }
  });
}
