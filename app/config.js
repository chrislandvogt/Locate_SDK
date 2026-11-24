// App configuration. Live build: Melbourne's inner west, where people live and what's nearby.
// Every layer id must exist in catalogue.json. See ../CLAUDE.md, especially "Design".

export default {
  title: "Inner west, up close",
  subtitle: "People, parks, places",

  persona: {
    who: "A council GIS analyst in Melbourne's inner west",
    context: "At a desk, checking a neighbourhood before a site visit",
    job: "See where people live, then the cafes, parks and stations nearby",
    success: "Can name the densest neighbourhood and its closest cafes and station in two minutes",
  },

  theme: "light",
  basemap: "gray",
  basemapLabels: false, // our area labels name the suburbs; basemap names would double them up

  extent: [144.84, -37.85, 144.99, -37.77], // Footscray to the CBD

  layers: [
    {
      id: "abs-sa2-population-2025",
      title: "People per km² (ABS 2025)",
      where: "gccsa_name_2021 = 'Greater Melbourne'",
      opacity: 0.55,
      blendMode: "multiply",
      renderer: {
        type: "class-breaks",
        field: "pop_density_2025_people_per_km2",
        classBreakInfos: [
          { minValue: 0, maxValue: 1000, label: "Under 1,000", symbol: { type: "simple-fill", color: "#e6eef9", outline: { color: [255, 255, 255, 0.8], width: 0.5 } } },
          { minValue: 1000, maxValue: 2500, label: "1,000 to 2,500", symbol: { type: "simple-fill", color: "#b3cbee", outline: { color: [255, 255, 255, 0.8], width: 0.5 } } },
          { minValue: 2500, maxValue: 4000, label: "2,500 to 4,000", symbol: { type: "simple-fill", color: "#6d9be0", outline: { color: [255, 255, 255, 0.8], width: 0.5 } } },
          { minValue: 4000, maxValue: 6000, label: "4,000 to 6,000", symbol: { type: "simple-fill", color: "#2f6fd0", outline: { color: [255, 255, 255, 0.8], width: 0.5 } } },
          { minValue: 6000, maxValue: 1000000, label: "Over 6,000", symbol: { type: "simple-fill", color: "#0052c2", outline: { color: [255, 255, 255, 0.8], width: 0.5 } } },
        ],
      },
      labels: {
        expression: `
          var n = $feature.sa2_name_2021;
          var i = Find(" (", n);
          return IIf(i > -1, Left(n, i), n);`,
        size: 10,
        minScale: 80000,
      },
      popup: {
        title: `$feature.sa2_name_2021`,
        arcade: `
          var name = $feature.sa2_name_2021;
          var pop = $feature.erp_2025;
          var dens = $feature.pop_density_2025_people_per_km2;
          var chg = $feature.erp_change_per_cent_2024_25;
          if (IsEmpty(pop) || IsEmpty(dens)) {
            return { type: "text", text: "<p>No population estimate for " + name + ".</p>" };
          }
          // Mean density of the 361 Greater Melbourne SA2s in this layer (outStatistics avg, 24 Nov 2026).
          var avg = 2692;
          var ratio = dens / avg;
          var cmp = IIf(ratio >= 1.1, Text(Round(ratio, 1), "#,##0.0") + " times the Greater Melbourne average",
                    IIf(ratio <= 0.9, "below the Greater Melbourne average of 2,692", "about the Greater Melbourne average"));
          var t = "<p>About " + Text(Round(pop, -1), "#,##0") + " people live in " + name + ", or <b>" +
                  Text(Round(dens, 0), "#,##0") + " per km²</b>: " + cmp + ".</p>";
          if (!IsEmpty(chg)) {
            t += "<p>" + IIf(chg >= 0, "Grew ", "Shrank ") + Text(Abs(Round(chg, 1)), "#,##0.0") + "% in 2024–25. Open Nearby to find cafes and places to eat here.</p>";
          }
          return { type: "text", text: t };`,
      },
    },
    {
      id: "vic-parks-reserves",
      title: "Parks and gardens (Vicmap)",
      minScale: 150000,
      opacity: 0.6,
      renderer: {
        type: "simple",
        label: "Park or garden",
        symbol: { type: "simple-fill", color: [92, 160, 92, 0.45], outline: { color: [60, 120, 60, 0.6], width: 0.5 } },
      },
      labels: {
        expression: `Proper($feature.name)`,
        size: 9,
        color: [45, 95, 45, 1],
        minScale: 20000,
      },
      popup: {
        title: `IIf(IsEmpty($feature.name), "Park", Proper($feature.name))`,
        arcade: `
          var n = IIf(IsEmpty($feature.name), "This park", Proper($feature.name));
          var t = $feature.feature_subtype;
          var p = $feature.parent_name;
          var s = n + " is a " + IIf(IsEmpty(t), "park", Lower(t));
          if (!IsEmpty(p)) { s += ", part of " + Proper(p); }
          return { type: "text", text: "<p>" + s + ".</p>" };`,
      },
    },
    {
      id: "vic-pt-stops",
      title: "Train stations (DTP)",
      where: "MODE = 'METRO TRAIN'",
      minScale: 150000,
      renderer: {
        type: "simple",
        label: "Metro train station",
        symbol: { type: "simple-marker", style: "square", size: 7, color: "#e57200", outline: { color: [255, 255, 255, 1], width: 1 } },
      },
      labels: {
        expression: `
          var n = Proper($feature.STOP_NAME);
          var i = Find(" Station", n);
          return IIf(i > -1, Left(n, i), n);`,
        size: 11,
        weight: "bold",
        placement: "above-center",
        minScale: 40000,
      },
      popup: {
        title: `
          var n = Proper($feature.STOP_NAME);
          var i = Find(" Station", n);
          return IIf(i > -1, Left(n, i), n) + " station";`,
        arcade: `
          var n = Proper($feature.STOP_NAME);
          var i = Find(" Station", n);
          n = IIf(i > -1, Left(n, i), n);
          return { type: "text", text: "<p>" + n + " is a metro train station. Use Nearby to see cafes within walking distance.</p>" };`,
      },
    },
  ],

  features: {
    nearby: { searches: ["Cafe", "Restaurant", "Pub", "Ice cream"], radius: 1500 },
    search: true,
    layers: true,
    filter: { layer: "abs-sa2-population-2025", field: "sa3_name_2021", label: "District" },
    room: true,
    assistant: {
      enabled: true,
      modes: ["filter", "explain"],
      suggestions: [
        "Show areas with more than 6,000 people per km²",
        "Which areas grew more than 5% in 2024–25?",
        "Show the Maribyrnong district",
      ],
    },
    share: true,
    locate: true,
    directions: false,
  },

  room: {
    responses: 37,
    focus: { field: 4, community: 0, planning: 30 },
    questions: [
      "Best cafes in the west",
      "Where are cafes around here?",
      "Highest density restaurant areas",
      "How many people live here?",
    ],
    notInThisBuild: [
      "Cafe ratings, reviews and prices: no ratings source in the catalogue",
      "Rainfall, wind and weather: no Bureau of Meteorology layer in the catalogue",
      "Evacuation centres and VicEmergency warnings: no public ArcGIS source",
      "Vineyards, penguins and seals: outside this persona's job",
    ],
  },
};
