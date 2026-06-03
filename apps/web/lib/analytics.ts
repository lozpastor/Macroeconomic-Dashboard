import { gdpMetrics, type GdpMetricKey } from "./demo-data";
import { latestValue, type CountryRow } from "./dataset";

const numberFormatters: Record<number, Intl.NumberFormat> = {};

function formatter(decimals: number) {
  numberFormatters[decimals] ??= new Intl.NumberFormat("es-ES", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
  return numberFormatters[decimals];
}

export function metricMeta(metric: GdpMetricKey) {
  return gdpMetrics.find((item) => item.key === metric) ?? gdpMetrics[0];
}

/** Formats a PIB value according to the active sub-metric (growth vs. per capita). */
export function formatGdp(value: number | null | undefined, metric: GdpMetricKey) {
  if (value == null || Number.isNaN(value)) return "s/d";
  if (metric === "gdpPerCapita") {
    const compact = new Intl.NumberFormat("es-ES", { notation: "compact", maximumFractionDigits: 1 }).format(value);
    return `$${compact}`;
  }
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatter(metricMeta(metric).decimals).format(value)}%`;
}

function definedValues(rows: CountryRow[], metric: GdpMetricKey): number[] {
  return rows.map((country) => latestValue(country, metric)).filter((value): value is number => value != null);
}

export function averageGdp(rows: CountryRow[], metric: GdpMetricKey): number | null {
  const values = definedValues(rows, metric);
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function rankCountries(rows: CountryRow[], metric: GdpMetricKey): CountryRow[] {
  return [...rows]
    .filter((country) => latestValue(country, metric) != null)
    .sort((a, b) => (latestValue(b, metric) ?? 0) - (latestValue(a, metric) ?? 0));
}

export function extremes(rows: CountryRow[], metric: GdpMetricKey): { top: CountryRow | null; bottom: CountryRow | null } {
  const ranked = rankCountries(rows, metric);
  return { top: ranked[0] ?? null, bottom: ranked[ranked.length - 1] ?? null };
}
