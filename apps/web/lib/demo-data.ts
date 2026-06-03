// Static configuration for the PIB dashboard. Country data is fetched at runtime (see lib/dataset.ts).

export type GdpMetricKey = "gdpGrowth" | "gdpPerCapita";

export type Continent =
  | "Africa"
  | "North America"
  | "South America"
  | "Asia"
  | "Europe"
  | "Oceania";

/** Continents used for the regional filter and map recentering. */
export const continents: Array<{ key: Continent; label: string; center: [number, number]; zoom: number }> = [
  { key: "Africa", label: "Africa", center: [20, 3], zoom: 2.2 },
  { key: "North America", label: "Norteamerica", center: [-100, 45], zoom: 2.1 },
  { key: "South America", label: "Sudamerica", center: [-60, -20], zoom: 2.1 },
  { key: "Asia", label: "Asia", center: [95, 35], zoom: 1.9 },
  { key: "Europe", label: "Europa", center: [15, 52], zoom: 3 },
  { key: "Oceania", label: "Oceania", center: [150, -25], zoom: 2.4 }
];

/** PIB (GDP) sub-metrics surfaced in the dashboard. */
export const gdpMetrics: Array<{ key: GdpMetricKey; label: string; short: string; unit: string; decimals: number }> = [
  { key: "gdpGrowth", label: "Crecimiento del PIB", short: "Crecimiento", unit: "% anual", decimals: 1 },
  { key: "gdpPerCapita", label: "PIB per capita", short: "Per capita", unit: "USD", decimals: 0 }
];

export const MAX_COMPARE = 8;
