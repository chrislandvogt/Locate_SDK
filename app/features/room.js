// "From the room": what the workshop asked for, and what didn't make it into this build.
export function mount({ addPanel, config, el }) {
  const r = config.room || {};
  const labels = { planning: "Planners and analysts", community: "The community", field: "Crews in the field" };
  const total = Object.values(r.focus || {}).reduce((a, b) => a + b, 0);

  addPanel({
    id: "room", icon: "users", heading: "From the room", description: r.responses ? `${r.responses} answers at the workshop` : "",
    render: (p) => {
      const body = el("div", { class: "panel-body" });
      const persona = config.persona;
      if (persona?.who) {
        body.append(
          el("h3", { class: "section" }, "Built for"),
          el("div", { class: "persona" },
            el("p", { class: "persona-who" }, persona.who),
            persona.context && el("p", {}, persona.context),
            persona.job && el("p", {}, persona.job))
        );
      }
      if (total) {
        body.append(
          el("h3", { class: "section" }, "Who it's for"),
          el("div", { class: "focus-bar" }, ...Object.keys(labels).map((k) => el("span", { class: k, style: `flex-grow:${r.focus[k] || 0}` }))),
          el("ul", { class: "focus-key" }, ...Object.keys(labels).map((k) => el("li", {}, el("span", { class: `dot ${k}` }), `${labels[k]} `, el("b", {}, r.focus[k] || 0))))
        );
      }
      if (r.questions?.length) {
        body.append(el("h3", { class: "section" }, "Questions you asked"), el("ul", { class: "quotes" }, ...r.questions.map((q) => el("li", {}, q))));
      }
      if (r.notInThisBuild?.length) {
        body.append(el("h3", { class: "section" }, "Not in this build"), el("ul", { class: "plain" }, ...r.notInThisBuild.map((q) => el("li", {}, q))));
      }
      if (!body.childElementCount) body.append(el("p", { class: "muted" }, "Answers from the workshop appear here after the build."));
      p.append(body);
    },
  });
}
