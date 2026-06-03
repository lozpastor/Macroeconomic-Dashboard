// Static configuration for the macro dashboard. Country data is fetched at runtime (see lib/dataset.ts).

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

export type Frequency = "A" | "Q" | "M";

export const frequencyLabels: Record<Frequency, { short: string; adjective: string }> = {
  A: { short: "Anual", adjective: "anual" },
  Q: { short: "Trimestral", adjective: "trimestral" },
  M: { short: "Mensual", adjective: "mensual" }
};

export type MetricKey = "gdp" | "gdpPerCapita" | "industrial" | "retail";

export type MetricConfig = {
  key: MetricKey;
  short: string;
  label: string;
  unit: string;
  decimals: number;
  kind: "growth" | "level";
  freqs: Frequency[];
};

export type TabConfig = {
  key: "gdp" | "industrial" | "retail";
  label: string;
  metrics: MetricConfig[];
};

/** Indicator tabs (Categoria 1: Crecimiento). Each tab owns one or more sub-metrics. */
export const tabs: TabConfig[] = [
  {
    key: "gdp",
    label: "Producto Interior Bruto",
    metrics: [
      { key: "gdp", short: "Crecimiento", label: "Crecimiento del PIB", unit: "%", decimals: 1, kind: "growth", freqs: ["A", "Q"] },
      { key: "gdpPerCapita", short: "Per capita", label: "PIB per capita", unit: "USD", decimals: 0, kind: "level", freqs: ["A"] }
    ]
  },
  {
    key: "industrial",
    label: "Produccion industrial",
    metrics: [
      { key: "industrial", short: "Produccion", label: "Produccion industrial", unit: "%", decimals: 1, kind: "growth", freqs: ["M"] }
    ]
  },
  {
    key: "retail",
    label: "Ventas al por menor",
    metrics: [
      { key: "retail", short: "Ventas", label: "Ventas al por menor", unit: "%", decimals: 1, kind: "growth", freqs: ["M"] }
    ]
  }
];

const allMetrics = tabs.flatMap((tab) => tab.metrics);

export function metricConfig(metric: MetricKey): MetricConfig {
  return allMetrics.find((item) => item.key === metric) ?? allMetrics[0];
}

export function tabForMetric(metric: MetricKey): TabConfig {
  return tabs.find((tab) => tab.metrics.some((item) => item.key === metric)) ?? tabs[0];
}

export const MAX_COMPARE = 8;
