import type { CountryRow } from "./dataset";
import type { Frequency, MetricKey } from "./demo-data";

export const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

export const deviationPalette = { low: "#b5654f", middle: "#bbc0b6", high: "#28564b" };

export function deviationScale(values: number[]) {
  const sorted = values.filter(finite).sort((a, b) => a - b);
  const quantile = (q: number) => {
    if (!sorted.length) return 0;
    const index = (sorted.length - 1) * q;
    const lower = Math.floor(index);
    return sorted[lower] + (sorted[Math.ceil(index)] - sorted[lower]) * (index - lower);
  };
  const median = quantile(0.5);
  // IQR keeps a few extreme observations from washing out the whole scale.
  const span = (quantile(0.75) - quantile(0.25)) * 1.5 || Math.max(Math.abs((sorted[0] ?? median) - median), Math.abs((sorted.at(-1) ?? median) - median)) || 1;
  return { median, score: (value: number) => finite(value) ? Math.max(-1, Math.min(1, (value - median) / span)) : 0 };
}

export function deviationColor(score: number) {
  const end = score < 0 ? deviationPalette.low : deviationPalette.high;
  const weight = Math.pow(Math.min(1, Math.abs(score)), 0.8);
  const mix = [1, 3, 5].map((offset) => {
    const a = parseInt(deviationPalette.middle.slice(offset, offset + 2), 16);
    const b = parseInt(end.slice(offset, offset + 2), 16);
    return Math.round(a + (b - a) * weight).toString(16).padStart(2, "0");
  });
  return `#${mix.join("")}`;
}

export function previousPeriod(period: string, frequency: Frequency): string | null {
  if (frequency === "A" && /^\d{4}$/.test(period)) return String(Number(period) - 1);
  const quarter = /^(\d{4})-Q([1-4])$/.exec(period);
  if (frequency === "Q" && quarter) return Number(quarter[2]) === 1 ? `${Number(quarter[1]) - 1}-Q4` : `${quarter[1]}-Q${Number(quarter[2]) - 1}`;
  const month = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(period);
  if (frequency === "M" && month) return Number(month[2]) === 1 ? `${Number(month[1]) - 1}-12` : `${month[1]}-${String(Number(month[2]) - 1).padStart(2, "0")}`;
  return null;
}

export function matchedPairs(rows: CountryRow[], x: MetricKey, y: MetricKey, frequency: Frequency, period: string) {
  return rows.flatMap((country) => {
    const a = country.series[x]?.[frequency]?.[period];
    const b = country.series[y]?.[frequency]?.[period];
    return finite(a) && finite(b) ? [{ country: country.name, iso3: country.iso3, x: a, y: b }] : [];
  });
}

export function periodChanges(rows: CountryRow[], metric: MetricKey, frequency: Frequency, period: string) {
  const previous = previousPeriod(period, frequency);
  if (!previous) return [];
  return rows.flatMap((country) => {
    const series = country.series[metric]?.[frequency];
    const current = series?.[period];
    const before = series?.[previous];
    return finite(current) && finite(before) ? [{ country: country.name, iso3: country.iso3, current, before, change: current - before }] : [];
  }).sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
}

export function matchedSpread(a: Record<string, number>, b: Record<string, number>) {
  return Object.keys(a).sort().flatMap((period) => finite(a[period]) && finite(b[period]) ? [{ period, value: a[period] - b[period] }] : []);
}

export function analysisPair(metric: MetricKey, frequency: Frequency): [MetricKey, MetricKey] | null {
  if ((metric === "gdp" || metric === "gdpPerCapita") && frequency === "A") return ["gdpPerCapita", "gdp"];
  if (metric === "cpi" || metric === "cpiCore") return ["cpiCore", "cpi"];
  if (metric === "unemployment" || metric === "cci") return ["cci", "unemployment"];
  if (metric === "publicDebt" || metric === "deficit") return ["publicDebt", "deficit"];
  return null;
}

export const momentumMetrics: MetricKey[] = ["gdp", "industrial", "retail", "unemployment", "cci", "bondYield", "riskPremium", "countryRisk"];
