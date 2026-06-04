// Static configuration for the macro dashboard (6 categories, ~19 indicators).

export type Continent =
  | "Africa"
  | "North America"
  | "South America"
  | "Asia"
  | "Europe"
  | "Oceania";

export const continents: Array<{ key: Continent; label: string; center: [number, number]; zoom: number }> = [
  { key: "Africa", label: "Africa", center: [20, 3], zoom: 2.2 },
  { key: "North America", label: "Norteamerica", center: [-100, 45], zoom: 2.1 },
  { key: "South America", label: "Sudamerica", center: [-60, -20], zoom: 2.1 },
  { key: "Asia", label: "Asia", center: [95, 35], zoom: 1.9 },
  { key: "Europe", label: "Europa", center: [15, 52], zoom: 3 },
  { key: "Oceania", label: "Oceania", center: [150, -25], zoom: 2.4 }
];

export type Frequency = "A" | "Q" | "M" | "D";

export const frequencyLabels: Record<Frequency, { short: string; adjective: string }> = {
  A: { short: "Anual", adjective: "anual" },
  Q: { short: "Trimestral", adjective: "trimestral" },
  M: { short: "Mensual", adjective: "mensual" },
  D: { short: "Diario", adjective: "diario" }
};

export type MetricKey =
  | "gdp" | "gdpPerCapita" | "industrial" | "retail"
  | "cpi" | "cpiCore" | "oilBrent" | "oilWti"
  | "unemployment" | "payrolls" | "cci"
  | "fedRate" | "ecbRate" | "bondYield" | "riskPremium"
  | "eurusd" | "tradeBalance" | "sp500" | "stoxx50"
  | "publicDebt" | "deficit" | "countryRisk";

export type MetricScope = "country" | "global" | "globalMulti";

export type MetricConfig = {
  key: MetricKey;
  short: string;
  label: string;
  unit: string;
  decimals: number;
  kind: "growth" | "level" | "rate" | "index" | "spread" | "currency" | "price";
  freqs: Frequency[];
  scope: MetricScope;
  globalKeys?: string[];
};

export type TabConfig = {
  key: string;
  label: string;
  metrics: MetricConfig[];
};

export type CategoryConfig = {
  key: string;
  label: string;
  tabs: TabConfig[];
};

export const categories: CategoryConfig[] = [
  {
    key: "growth",
    label: "Crecimiento",
    tabs: [
      {
        key: "gdp",
        label: "Producto Interior Bruto",
        metrics: [
          { key: "gdp", short: "Crecimiento", label: "Crecimiento del PIB", unit: "%", decimals: 1, kind: "growth", freqs: ["A", "Q"], scope: "country" },
          { key: "gdpPerCapita", short: "Per capita", label: "PIB per capita", unit: "USD", decimals: 0, kind: "level", freqs: ["A"], scope: "country" }
        ]
      },
      {
        key: "industrial",
        label: "Produccion industrial",
        metrics: [
          { key: "industrial", short: "Produccion", label: "Produccion industrial", unit: "%", decimals: 1, kind: "growth", freqs: ["M"], scope: "country" }
        ]
      },
      {
        key: "retail",
        label: "Ventas al por menor",
        metrics: [
          { key: "retail", short: "Ventas", label: "Ventas al por menor", unit: "%", decimals: 1, kind: "growth", freqs: ["M"], scope: "country" }
        ]
      }
    ]
  },
  {
    key: "inflation",
    label: "Inflacion y Precios",
    tabs: [
      {
        key: "cpi",
        label: "IPC General",
        metrics: [
          { key: "cpi", short: "IPC", label: "IPC general (var. interanual)", unit: "%", decimals: 1, kind: "growth", freqs: ["M"], scope: "country" }
        ]
      },
      {
        key: "cpiCore",
        label: "IPC Subyacente",
        metrics: [
          { key: "cpiCore", short: "Subyacente", label: "IPC subyacente (sin alimentos ni energia)", unit: "%", decimals: 1, kind: "growth", freqs: ["M"], scope: "country" }
        ]
      },
      {
        key: "oil",
        label: "Petroleo",
        metrics: [
          { key: "oilBrent", short: "Brent", label: "Petroleo Brent", unit: "USD/barril", decimals: 2, kind: "price", freqs: ["D"], scope: "global", globalKeys: ["bpiOil.brent"] },
          { key: "oilWti", short: "WTI", label: "Petroleo WTI", unit: "USD/barril", decimals: 2, kind: "price", freqs: ["D"], scope: "global", globalKeys: ["bpiOil.wti"] }
        ]
      }
    ]
  },
  {
    key: "labour",
    label: "Mercado Laboral",
    tabs: [
      {
        key: "unemployment",
        label: "Tasa de desempleo",
        metrics: [
          { key: "unemployment", short: "Desempleo", label: "Tasa de desempleo armonizada", unit: "%", decimals: 1, kind: "rate", freqs: ["M"], scope: "country" }
        ]
      },
      {
        key: "payrolls",
        label: "Empleo EE.UU.",
        metrics: [
          { key: "payrolls", short: "Nominas", label: "Creacion de empleo no agricola (EE.UU.)", unit: "miles", decimals: 0, kind: "level", freqs: ["M"], scope: "global", globalKeys: ["payrolls"] }
        ]
      },
      {
        key: "cci",
        label: "Confianza del consumidor",
        metrics: [
          { key: "cci", short: "Confianza", label: "Indice de confianza del consumidor", unit: "indice", decimals: 1, kind: "index", freqs: ["M"], scope: "country" }
        ]
      }
    ]
  },
  {
    key: "monetary",
    label: "Politica Monetaria",
    tabs: [
      {
        key: "interestRates",
        label: "Tipos de interes",
        metrics: [
          { key: "fedRate", short: "Fed Funds", label: "Tipo Fed Funds (EE.UU.)", unit: "%", decimals: 2, kind: "rate", freqs: ["M"], scope: "global", globalKeys: ["fedRate"] },
          { key: "ecbRate", short: "BCE MRR", label: "Tipo principal BCE", unit: "%", decimals: 2, kind: "rate", freqs: ["M"], scope: "global", globalKeys: ["ecbRate"] }
        ]
      },
      {
        key: "bonds",
        label: "Bonos 10 anos",
        metrics: [
          { key: "bondYield", short: "Rendimiento", label: "Rendimiento bonos 10 anos", unit: "%", decimals: 2, kind: "rate", freqs: ["M"], scope: "country" }
        ]
      },
      {
        key: "riskPremium",
        label: "Prima de riesgo",
        metrics: [
          { key: "riskPremium", short: "Prima", label: "Prima de riesgo vs Alemania", unit: "pb", decimals: 0, kind: "spread", freqs: ["M"], scope: "country" }
        ]
      }
    ]
  },
  {
    key: "trade",
    label: "Comercio y Mercados",
    tabs: [
      {
        key: "eurusd",
        label: "Tipo de cambio",
        metrics: [
          { key: "eurusd", short: "EUR/USD", label: "Tipo de cambio EUR/USD", unit: "", decimals: 4, kind: "currency", freqs: ["D"], scope: "global", globalKeys: ["eurusd"] }
        ]
      },
      {
        key: "tradeBalance",
        label: "Balanza comercial",
        metrics: [
          { key: "tradeBalance", short: "Balanza", label: "Balanza comercial (% del PIB)", unit: "%PIB", decimals: 1, kind: "growth", freqs: ["A"], scope: "country" }
        ]
      },
      {
        key: "indices",
        label: "Indices bursatiles",
        metrics: [
          { key: "sp500", short: "S&P 500", label: "S&P 500", unit: "puntos", decimals: 0, kind: "index", freqs: ["D"], scope: "global", globalKeys: ["sp500"] },
          { key: "stoxx50", short: "Euro Stoxx 50", label: "Euro Stoxx 50", unit: "puntos", decimals: 0, kind: "index", freqs: ["D"], scope: "global", globalKeys: ["stoxx50"] }
        ]
      }
    ]
  },
  {
    key: "fiscal",
    label: "Sostenibilidad Fiscal",
    tabs: [
      {
        key: "publicDebt",
        label: "Deuda publica",
        metrics: [
          { key: "publicDebt", short: "Deuda", label: "Deuda publica (% del PIB)", unit: "%", decimals: 1, kind: "level", freqs: ["A"], scope: "country" }
        ]
      },
      {
        key: "deficit",
        label: "Deficit publico",
        metrics: [
          { key: "deficit", short: "Deficit", label: "Deficit publico (% del PIB)", unit: "%", decimals: 1, kind: "growth", freqs: ["A"], scope: "country" }
        ]
      },
      {
        key: "countryRisk",
        label: "Riesgo pais",
        metrics: [
          { key: "countryRisk", short: "Riesgo", label: "Riesgo pais (prima vs Alemania)", unit: "pb", decimals: 0, kind: "spread", freqs: ["M"], scope: "country" }
        ]
      }
    ]
  }
];

// Flatten helpers
const allTabs = categories.flatMap((c) => c.tabs);
const allMetrics = allTabs.flatMap((t) => t.metrics);

export function metricConfig(metric: MetricKey): MetricConfig {
  return allMetrics.find((m) => m.key === metric) ?? allMetrics[0];
}

export function tabForMetric(metric: MetricKey): TabConfig {
  return allTabs.find((t) => t.metrics.some((m) => m.key === metric)) ?? allTabs[0];
}

export function categoryForMetric(metric: MetricKey): CategoryConfig {
  return categories.find((c) => c.tabs.some((t) => t.metrics.some((m) => m.key === metric))) ?? categories[0];
}

export const MAX_COMPARE = 8;
