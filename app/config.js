// App configuration. THIS is the file the live build edits, together with features/*.js.
// Every layer id must exist in catalogue.json. See ../CLAUDE.md for the rules, especially "Design".
//
// The values below are a WORKED EXAMPLE of the standard expected on stage: one persona, a quiet
// context layer, a clean Arcade label, and a popup that answers a question in a sentence.

export default {
  title: "Starter map",
  subtitle: "Scaffold before the live build",

  // Who this is for. Every choice below should make sense to this person (CLAUDE.md, step 2).
  persona: {
    who: "A council strategic planner",
    context: "At a desk, preparing a briefing for councillors",
    job: "Compare council areas across the state at a glance",
  },

  theme: "light", // "light" (plain white, the default) | "dark"
  basemap: "gray", // "gray" (follows theme) | "imagery" | "topo" | "streets"
  basemapLabels: false, // our council labels name the places; basemap names would double them up

  // Where the map opens: [xmin, ymin, xmax, ymax] in lon/lat.
  extent: [140.9, -39.2, 150.0, -33.9], // Victoria

  // Layers, drawn bottom to top. "id" refers to catalogue.json.
  layers: [
    {
      id: "abs-lga-2021",
      title: "Council areas",
      // Context layer: thin outline, no fill, so whatever goes on top can carry the colour.
      renderer: {
        type: "simple",
        symbol: { type: "simple-fill", color: [0, 0, 0, 0], outline: { color: [102, 102, 102, 0.6], width: 0.75 } },
      },
      // ABS also lists non-places ("No usual address", "Migratory - Offshore - Shipping", "Unincorporated Vic"): leave them out.
      where: "lga_name_2021 NOT LIKE 'No usual address%' AND lga_name_2021 NOT LIKE 'Migratory%' AND lga_name_2021 NOT LIKE 'Unincorporated%'",
      // "Bayside (NSW)" → "Bayside". Only once there's room to read it.
      labels: {
        expression: `
          var n = $feature.lga_name_2021;
          var i = Find(" (", n);
          return IIf(i > -1, Left(n, i), n);`,
        size: 10,
        minScale: 2500000,
      },
      popup: {
        title: `
          var n = $feature.lga_name_2021;
          var i = Find(" (", n);
          return IIf(i > -1, Left(n, i), n);`,
        // One sentence that answers "what is this place?", with the number that matters in bold.
        arcade: `
          var n = $feature.lga_name_2021;
          var i = Find(" (", n);
          var name = IIf(i > -1, Left(n, i), n);
          var area = $feature.area_albers_sqkm;
          var state = $feature.state_name_2021;
          if (IsEmpty(area)) {
            return { type: "text", text: "<p>" + name + " is a council area in " + state + ".</p>" };
          }
          var areaText = IIf(area >= 100, Text(Round(area, 0), "#,###"), Text(area, "#,##0.0"));
          // Comparisons help the planner: a familiar yardstick beats a raw number.
          var melbourne = 9993;  // Greater Melbourne, km² (ABS GCCSA 2021)
          var compare = IIf(area > melbourne,
            ", bigger than all of Greater Melbourne",
            IIf(area < 100, ", one of the smaller council areas", ""));
          return { type: "text", text: "<p>" + name + " is a council area in " + state + ", covering <b>" + areaText + " km²</b>" + compare + ".</p>" };`,
      },
    },
  ],

  // Features, in the order their panels appear. Each one is a module in features/.
  features: {
    layers: true, // layer list and legend
    search: true, // address and place search
    filter: { layer: "abs-lga-2021", field: "state_name_2021", label: "State" },
    room: true, // "From the room": what the audience asked for
    assistant: {
      enabled: true,
      modes: ["filter", "explain"],
      suggestions: ["Show council areas in Victoria", "Which councils are shires?"],
    },
    share: true, // copy a link to the current view
    locate: true, // "near me" button
  },

  // Shown in the "From the room" panel. Copied from input/submissions.json (approved answers only).
  room: {
    // Placeholder values so the scaffold shows every panel. Replaced by the live build.
    responses: 3,
    focus: { field: 1, community: 1, planning: 1 },
    questions: ["Which council areas are largest?"],
    notInThisBuild: ["Offline mode: needs a native app or service worker, too big for this session"],
  },
};
