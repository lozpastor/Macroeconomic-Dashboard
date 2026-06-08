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
  | "unemployment" | "cci"
  | "fedRate" | "ecbRate" | "bondYield" | "riskPremium"
  | "exchangeRate" | "tradeBalance" | "indices"
  | "publicDebt" | "deficit" | "countryRisk";

export type MetricScope = "country" | "global" | "globalMulti";

// Special render modes for tabs that don't fit the default map/time-series layout.
export type TabView = "fx" | "indices" | "trade";

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
  view?: TabView;
  desc?: string;
};

// Stock indices shown in the "Indices bursatiles" tab (key matches global.indices.*).
export type IndexConfig = { key: string; short: string; label: string; flag: string };

export const stockIndices: IndexConfig[] = [
  { key: "sp500", short: "S&P 500", label: "S&P 500", flag: "US" },
  { key: "nasdaq", short: "Nasdaq 100", label: "Nasdaq 100", flag: "US" },
  { key: "dowjones", short: "Dow Jones", label: "Dow Jones Industrial", flag: "US" },
  { key: "stoxx50", short: "Euro Stoxx 50", label: "Euro Stoxx 50", flag: "EU" },
  { key: "ftse100", short: "FTSE 100", label: "FTSE 100 (Reino Unido)", flag: "GB" },
  { key: "dax", short: "DAX", label: "DAX (Alemania)", flag: "DE" },
  { key: "cac40", short: "CAC 40", label: "CAC 40 (Francia)", flag: "FR" },
  { key: "ibex35", short: "IBEX 35", label: "IBEX 35 (Espana)", flag: "ES" },
  { key: "ftsemib", short: "FTSE MIB", label: "FTSE MIB (Italia)", flag: "IT" },
  { key: "nikkei", short: "Nikkei 225", label: "Nikkei 225 (Japon)", flag: "JP" },
  { key: "hangseng", short: "Hang Seng", label: "Hang Seng (Hong Kong)", flag: "HK" },
  { key: "shanghai", short: "Shanghai", label: "Shanghai Composite (China)", flag: "CN" },
  { key: "sensex", short: "Sensex", label: "BSE Sensex (India)", flag: "IN" },
  { key: "bovespa", short: "Bovespa", label: "Bovespa (Brasil)", flag: "BR" },
  { key: "tsx", short: "S&P/TSX", label: "S&P/TSX (Canada)", flag: "CA" },
  { key: "asx200", short: "ASX 200", label: "S&P/ASX 200 (Australia)", flag: "AU" },
  { key: "kospi", short: "KOSPI", label: "KOSPI (Corea del Sur)", flag: "KR" }
];

// Quote currencies shown as cards in the exchange-rate tab (code, flag, country label).
export type CurrencyConfig = { code: string; flag: string; label: string };

export const fxCurrencies: CurrencyConfig[] = [
  { code: "USD", flag: "US", label: "EE.UU." },
  { code: "EUR", flag: "EU", label: "Eurozona" },
  { code: "JPY", flag: "JP", label: "Japon" },
  { code: "GBP", flag: "GB", label: "Reino Unido" },
  { code: "CNY", flag: "CN", label: "China" },
  { code: "CHF", flag: "CH", label: "Suiza" },
  { code: "CAD", flag: "CA", label: "Canada" },
  { code: "AUD", flag: "AU", label: "Australia" },
  { code: "INR", flag: "IN", label: "India" },
  { code: "BRL", flag: "BR", label: "Brasil" },
  { code: "KRW", flag: "KR", label: "Corea del Sur" },
  { code: "MXN", flag: "MX", label: "Mexico" },
  { code: "TRY", flag: "TR", label: "Turquia" },
  { code: "SEK", flag: "SE", label: "Suecia" },
  { code: "NOK", flag: "NO", label: "Noruega" },
  { code: "ZAR", flag: "ZA", label: "Sudafrica" },
  { code: "SGD", flag: "SG", label: "Singapur" },
  { code: "HKD", flag: "HK", label: "Hong Kong" },
  { code: "PLN", flag: "PL", label: "Polonia" },
  { code: "NZD", flag: "NZ", label: "Nueva Zelanda" }
];

// Selectable base currencies for the exchange-rate indicator (code -> flag iso2).
export const baseCurrencies: Array<{ code: string; flag: string; label: string }> = [
  { code: "EUR", flag: "EU", label: "Euro" },
  { code: "USD", flag: "US", label: "Dolar EE.UU." },
  { code: "GBP", flag: "GB", label: "Libra" },
  { code: "JPY", flag: "JP", label: "Yen" },
  { code: "CNY", flag: "CN", label: "Yuan" },
  { code: "CHF", flag: "CH", label: "Franco suizo" }
];

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
        desc: "Valor de todos los bienes y servicios producidos. Se muestra como crecimiento interanual (%) y PIB per capita (USD).",
        metrics: [
          { key: "gdp", short: "Crecimiento", label: "Crecimiento del PIB", unit: "%", decimals: 1, kind: "growth", freqs: ["A", "Q"], scope: "country" },
          { key: "gdpPerCapita", short: "Per capita", label: "PIB per capita", unit: "USD", decimals: 0, kind: "level", freqs: ["A"], scope: "country" }
        ]
      },
      {
        key: "industrial",
        label: "Produccion industrial",
        desc: "Variacion interanual de la produccion de fabricas, mineria y energia. Adelanta el ciclo economico.",
        metrics: [
          { key: "industrial", short: "Produccion", label: "Produccion industrial", unit: "%", decimals: 1, kind: "growth", freqs: ["M"], scope: "country" }
        ]
      },
      {
        key: "retail",
        label: "Ventas al por menor",
        desc: "Variacion interanual de las ventas minoristas. Refleja la fortaleza del consumo de los hogares.",
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
        desc: "Inflacion general: variacion interanual del nivel de precios al consumo. Objetivo habitual de los bancos centrales: ~2%.",
        metrics: [
          { key: "cpi", short: "IPC", label: "IPC general (var. interanual)", unit: "%", decimals: 1, kind: "growth", freqs: ["M"], scope: "country" }
        ]
      },
      {
        key: "cpiCore",
        label: "IPC Subyacente",
        desc: "Inflacion subyacente: excluye alimentos y energia (mas volatiles). Mide la tendencia de fondo de los precios.",
        metrics: [
          { key: "cpiCore", short: "Subyacente", label: "IPC subyacente (sin alimentos ni energia)", unit: "%", decimals: 1, kind: "growth", freqs: ["M"], scope: "country" }
        ]
      },
      {
        key: "oil",
        label: "Petroleo",
        desc: "Precio diario del crudo Brent (referencia europea) y WTI (referencia EE.UU.) en dolares por barril.",
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
        desc: "Porcentaje de la poblacion activa sin empleo y que busca trabajo. Tasa armonizada, comparable entre paises.",
        metrics: [
          { key: "unemployment", short: "Desempleo", label: "Tasa de desempleo armonizada", unit: "%", decimals: 1, kind: "rate", freqs: ["M"], scope: "country" }
        ]
      },
      {
        key: "cci",
        label: "Confianza del consumidor",
        desc: "Indice de sentimiento de los hogares sobre la economia. Por encima de 100 indica optimismo; por debajo, pesimismo.",
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
        desc: "Tipo de interes oficial de la Fed (EE.UU.) y del BCE (eurozona). Principal herramienta de politica monetaria.",
        metrics: [
          { key: "fedRate", short: "Fed Funds", label: "Tipo Fed Funds (EE.UU.)", unit: "%", decimals: 2, kind: "rate", freqs: ["M"], scope: "global", globalKeys: ["fedRate"] },
          { key: "ecbRate", short: "BCE MRR", label: "Tipo principal BCE", unit: "%", decimals: 2, kind: "rate", freqs: ["M"], scope: "global", globalKeys: ["ecbRate"] }
        ]
      },
      {
        key: "bonds",
        label: "Bonos 10 anos",
        desc: "Rendimiento de la deuda publica a 10 anos. Sube cuando los inversores exigen mas rentabilidad por prestar al Estado.",
        metrics: [
          { key: "bondYield", short: "Rendimiento", label: "Rendimiento bonos 10 anos", unit: "%", decimals: 2, kind: "rate", freqs: ["M"], scope: "country" }
        ]
      },
      {
        key: "riskPremium",
        label: "Prima de riesgo",
        desc: "Diferencial del bono a 10 anos frente a Alemania, en puntos basicos. Mide el riesgo percibido del pais.",
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
        key: "exchange",
        label: "Tipo de cambio",
        view: "fx",
        desc: "Cotizacion de cada divisa frente a la moneda base seleccionable (p.ej. USD/EUR). Tipos de referencia diarios del BCE.",
        metrics: [
          { key: "exchangeRate", short: "Tipo de cambio", label: "Tipo de cambio por pais", unit: "", decimals: 4, kind: "currency", freqs: ["D"], scope: "country" }
        ]
      },
      {
        key: "tradeBalance",
        label: "Balanza comercial",
        view: "trade",
        desc: "Diferencia entre exportaciones e importaciones. Se muestra en % del PIB y en valor por categoria de producto.",
        metrics: [
          { key: "tradeBalance", short: "Balanza", label: "Balanza comercial (% del PIB)", unit: "%PIB", decimals: 1, kind: "growth", freqs: ["A", "Q", "M"], scope: "country" }
        ]
      },
      {
        key: "indices",
        label: "Indices bursatiles",
        view: "indices",
        desc: "Principales indices bursatiles mundiales, con la bandera del pais o region. Cierre diario en puntos.",
        metrics: [
          { key: "indices", short: "Indices", label: "Indices bursatiles", unit: "puntos", decimals: 0, kind: "index", freqs: ["D"], scope: "global" }
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
        desc: "Deuda del conjunto de las administraciones publicas en % del PIB. Mide el endeudamiento del Estado.",
        metrics: [
          { key: "publicDebt", short: "Deuda", label: "Deuda publica (% del PIB)", unit: "%", decimals: 1, kind: "level", freqs: ["A"], scope: "country" }
        ]
      },
      {
        key: "deficit",
        label: "Deficit publico",
        desc: "Saldo de las cuentas publicas en % del PIB. Valores negativos indican deficit (se gasta mas de lo que se ingresa).",
        metrics: [
          { key: "deficit", short: "Deficit", label: "Deficit publico (% del PIB)", unit: "%", decimals: 1, kind: "growth", freqs: ["A"], scope: "country" }
        ]
      },
      {
        key: "countryRisk",
        label: "Riesgo pais",
        desc: "Prima de riesgo del pais (diferencial del bono a 10 anos frente a Alemania) en puntos basicos.",
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
