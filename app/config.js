// App configuration. THIS is the file the live build edits, together with features/*.js.
// Every layer id must exist in catalogue.json. See ../CLAUDE.md for the rules, especially "Design".

export default {
  title: "Melbourne growth and roads",
  subtitle: "Population growth 2024-25",

  persona: {
    who: "A council GIS and planning officer in Melbourne",
    context: "On a phone or tablet, at the desk and out with the field team",
    job: "See where population is growing fastest and which main roads carry it",
    success: "Can name the three fastest-growing areas near them, and the busy road serving each, in five minutes",
  },

  theme: "light",
  basemap: "gray",
  basemapLabels: false, // our council and area labels name the places

  // Greater Melbourne, including the western, northern and south-eastern growth areas.
  extent: [144.5, -38.2, 145.5, -37.5],

  layers: [
    {
      id: "abs-sa2-population-2025",
      title: "Population growth 2024-25 (ABS)",
      // Tiny areas (under 100 people) swing wildly in percentage terms: leave them out.
      where: "gccsa_name_2021 = 'Greater Melbourne' AND erp_2025 >= 100",
      minScale: 0,
      opacity: 0.45,
      blendMode: "multiply",
      renderer: {
        type: "class-breaks",
        field: "erp_change_per_cent_2024_25",
        legendOptions: { title: "Population change in a year" },
        classBreakInfos: [
          { minValue: -100, maxValue: 0, label: "Lost people", symbol: { type: "simple-fill", color: "#eef3fb", outline: { color: [255, 255, 255, 0.6], width: 0.4 } } },
          { minValue: 0, maxValue: 1, label: "Up to 1%", symbol: { type: "simple-fill", color: "#c6d7f0", outline: { color: [255, 255, 255, 0.6], width: 0.4 } } },
          { minValue: 1, maxValue: 2, label: "1 to 2%", symbol: { type: "simple-fill", color: "#8fb1e3", outline: { color: [255, 255, 255, 0.6], width: 0.4 } } },
          { minValue: 2, maxValue: 4, label: "2 to 4%", symbol: { type: "simple-fill", color: "#4a7fd1", outline: { color: [255, 255, 255, 0.6], width: 0.4 } } },
          { minValue: 4, maxValue: 1000, label: "4% or more", symbol: { type: "simple-fill", color: "#0052c2", outline: { color: [255, 255, 255, 0.6], width: 0.4 } } },
        ],
      },
      labels: {
        expression: `return $feature.sa2_name_2021;`,
        size: 9,
        tone: "secondary",
        minScale: 120000,
      },
      popup: {
        title: `return $feature.sa2_name_2021;`,
        arcade: `
          var name = $feature.sa2_name_2021;
          var pct = $feature.erp_change_per_cent_2024_25;
          var pop = $feature.erp_2025;
          var chg = $feature.erp_change_number_2024_25;
          if (IsEmpty(pct) || IsEmpty(pop)) {
            return { type: "text", text: "<p>No population estimate for " + name + ".</p>" };
          }
          // Greater Melbourne overall growth 2024-25: (5,435,590 - 5,330,560) / 5,330,560 = 2.0%,
          // from sums of erp_2025 and erp_2024 over the 361 Greater Melbourne areas in this layer.
          var melb = 1.97;
          var popText = Text(Round(pop, 0), "#,##0");
          var verb = IIf(pct >= 0, "grew by ", "shrank by ");
          var pctText = Text(Round(Abs(pct), 1), "#,##0.0") + "%";
          var chgText = "";
          if (!IsEmpty(chg)) {
            chgText = " (" + IIf(chg >= 0, "+", "-") + Text(Round(Abs(chg), 0), "#,##0") + " people)";
          }
          var cmp = "";
          if (pct >= melb * 1.5) {
            cmp = "That's " + Text(Round(pct / melb, 1), "#,##0.0") + " times the Greater Melbourne rate of 2.0%.";
          } else if (pct >= melb * 0.67) {
            cmp = "That's close to the Greater Melbourne rate of 2.0%.";
          } else {
            cmp = "That's below the Greater Melbourne rate of 2.0%.";
          }
          return { type: "text", text: "<p>" + name + " " + verb + "<b>" + pctText + "</b> in 2024-25 to " +
            popText + " people" + chgText + ". " + cmp + "</p>" };`,
        fields: [
          { name: "pop_density_2025_people_per_km2", label: "People per km²", places: 0 },
          { name: "sa3_name_2021", label: "Region" },
        ],
      },
    },
    {
      id: "vic-traffic-volume",
      title: "Main roads by daily traffic (DTP, 2019)",
      minScale: 600000,
      renderer: {
        type: "simple",
        symbol: { type: "simple-line", color: [64, 64, 64, 0.8], width: 1 },
        visualVariables: [{
          type: "size",
          field: "Average_Annual_Daily_Traffic_V",
          legendOptions: { title: "Vehicles a day" },
          stops: [
            { value: 5000, size: 0.5, label: "5,000" },
            { value: 20000, size: 1.25, label: "20,000" },
            { value: 50000, size: 2.5, label: "50,000" },
            { value: 100000, size: 4, label: "100,000" },
          ],
        }],
      },
      labels: {
        expression: `var n = $feature.Road_Name; return IIf(IsEmpty(n), "", Proper(n));`,
        size: 9,
        tone: "secondary",
        minScale: 60000,
      },
      popup: {
        title: `var n = $feature.Road_Name; return IIf(IsEmpty(n), "Road section", Proper(n));`,
        arcade: `
          var v = $feature.Average_Annual_Daily_Traffic_V;
          var h = $feature.Percentage_of_Heavy_Vehicles;
          if (IsEmpty(v)) {
            return { type: "text", text: "<p>No traffic count for this section.</p>" };
          }
          var d = $feature.Travel_Direction;
          var dir = IIf(IsEmpty(d), "", " " + Lower(d));
          var s = "<p>About <b>" + Text(Round(v, 0), "#,##0") + " vehicles a day</b> travelled" + dir + " on this section in 2019";
          // Percentage_of_Heavy_Vehicles is stored as a fraction (0.14 = 14%).
          if (!IsEmpty(h)) { s += ", " + Text(Round(h * 100, 0), "#,##0") + "% of them heavy vehicles"; }
          // Mean of the 14,662 road sections in this layer: 8,506 vehicles a day.
          if (v >= 8506 * 2) { s += ". That's more than twice the average main-road section"; }
          return { type: "text", text: s + ".</p>" };`,
      },
    },
    {
      id: "vic-lga",
      title: "Council areas",
      where: "lga_name NOT LIKE '%(UNINC)'",
      renderer: {
        type: "simple",
        symbol: { type: "simple-fill", color: [0, 0, 0, 0], outline: { color: [80, 80, 80, 0.7], width: 0.9 } },
      },
      labels: {
        expression: `return Proper($feature.lga_name);`,
        size: 11,
        weight: "bold",
        minScale: 400000,
      },
      popup: {
        title: `return Proper($feature.lga_name);`,
        arcade: `return { type: "text", text: "<p>" + Proper($feature.lga_name) + " council area. Tap a coloured area inside it for population growth.</p>" };`,
      },
    },
  ],

  features: {
    layers: true,
    locate: true, // "near me": GPS
    search: true,
    filter: { layer: "abs-sa2-population-2025", field: "sa3_name_2021", label: "Region" },
    room: true,
    assistant: {
      enabled: true,
      modes: ["filter", "explain"],
      suggestions: [
        "Show areas that grew 4% or more",
        "Which areas lost people?",
        "Show roads with over 80,000 vehicles a day",
      ],
    },
    share: true,
  },

  room: {
    responses: 5,
    focus: { field: 1, community: 1, planning: 2 },
    questions: ["Where are the current property hotspots?"],
    notInThisBuild: [
      "Closest route and travel paths: no routing service in the catalogue",
      "Housing and property data: not in the catalogue, so population growth stands in",
      "Loading your own asset locations: needs sign-in and an editable layer",
      "Running geoprocessing from chat: the chat filters and explains only",
    ],
  },
};
