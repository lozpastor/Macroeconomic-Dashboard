import { countries, gdpMetrics, type CountryPoint, type GdpMetricKey } from "./demo-data";

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
export function formatGdp(value: number, metric: GdpMetricKey) {
  const meta = metricMeta(metric);
  if (metric === "gdpPerCapita") {
    const compact = new Intl.NumberFormat("es-ES", { notation: "compact", maximumFractionDigits: 1 }).format(value);
    return `$${compact}`;
  }
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatter(meta.decimals).format(value)}%`;
}

export function averageGdp(rows: CountryPoint[], metric: GdpMetricKey) {
  if (!rows.length) return 0;
  return rows.reduce((sum, country) => sum + country.latest[metric], 0) / rows.length;
}

export function extremes(rows: CountryPoint[], metric: GdpMetricKey) {
  const sorted = [...rows].sort((a, b) => b.latest[metric] - a.latest[metric]);
  return { top: sorted[0], bottom: sorted[sorted.length - 1] };
}

export function rankCountries(rows: CountryPoint[], metric: GdpMetricKey) {
  return [...rows].sort((a, b) => b.latest[metric] - a.latest[metric]);
}

export { countries };
