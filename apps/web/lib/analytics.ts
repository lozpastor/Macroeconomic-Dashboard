import { metricConfig, type Frequency, type MetricKey } from "./demo-data";
import { valueAt, type CountryRow } from "./dataset";

const numberFormatters: Record<number, Intl.NumberFormat> = {};

function formatter(decimals: number) {
  numberFormatters[decimals] ??= new Intl.NumberFormat("es-ES", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
  return numberFormatters[decimals];
}

export function metricMeta(metric: MetricKey) {
  return metricConfig(metric);
}

/** Formats a metric value according to its kind (growth % vs. absolute level). */
export function formatValue(value: number | null | undefined, metric: MetricKey) {
  if (value == null || Number.isNaN(value)) return "s/d";
  const meta = metricConfig(metric);
  if (meta.kind === "level") {
    const compact = new Intl.NumberFormat("es-ES", { notation: "compact", maximumFractionDigits: 1 }).format(value);
    return `$${compact}`;
  }
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatter(meta.decimals).format(value)}%`;
}

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** Human-friendly period label (e.g. "2024", "2026 T1", "abr 2026"). */
export function formatPeriod(period: string, freq: Frequency) {
  if (freq === "Q") {
    const [year, quarter] = period.split("-Q");
    return `${year} T${quarter}`;
  }
  if (freq === "M") {
    const [year, month] = period.split("-");
    return `${MONTHS[Number(month) - 1] ?? month} ${year}`;
  }
  return period;
}

function definedValues(rows: CountryRow[], metric: MetricKey, freq: Frequency, period: string | null): number[] {
  return rows.map((country) => valueAt(country, metric, freq, period)).filter((value): value is number => value != null);
}

export function averageAt(rows: CountryRow[], metric: MetricKey, freq: Frequency, period: string | null): number | null {
  const values = definedValues(rows, metric, freq, period);
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function rankAt(rows: CountryRow[], metric: MetricKey, freq: Frequency, period: string | null): CountryRow[] {
  return [...rows]
    .filter((country) => valueAt(country, metric, freq, period) != null)
    .sort((a, b) => (valueAt(b, metric, freq, period) ?? 0) - (valueAt(a, metric, freq, period) ?? 0));
}

export function extremesAt(
  rows: CountryRow[],
  metric: MetricKey,
  freq: Frequency,
  period: string | null
): { top: CountryRow | null; bottom: CountryRow | null } {
  const ranked = rankAt(rows, metric, freq, period);
  return { top: ranked[0] ?? null, bottom: ranked[ranked.length - 1] ?? null };
}
