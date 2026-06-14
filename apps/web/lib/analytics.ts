import { metricConfig, type Frequency, type MetricKey } from "./demo-data";
import { valueAt, type CountryRow } from "./dataset";
import { MONEY_SUFFIX, MONTHS, getLang, noData, numberLocale } from "./i18n";

const numberFormatters: Record<string, Intl.NumberFormat> = {};

function formatter(decimals: number) {
  const lang = getLang();
  const key = `${lang}-${decimals}`;
  numberFormatters[key] ??= new Intl.NumberFormat(numberLocale(lang), {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
  return numberFormatters[key];
}

export function metricMeta(metric: MetricKey) {
  return metricConfig(metric);
}

/** Formats a metric value according to its kind. */
export function formatValue(value: number | null | undefined, metric: MetricKey) {
  if (value == null || Number.isNaN(value)) return noData();
  const meta = metricConfig(metric);
  switch (meta.kind) {
    case "level": {
      if (meta.unit === "USD") {
        const compact = new Intl.NumberFormat(numberLocale(getLang()), { notation: "compact", maximumFractionDigits: 1 }).format(value);
        return `$${compact}`;
      }
      return formatter(meta.decimals).format(value);
    }
    case "growth":
    case "rate": {
      const sign = value > 0 ? "+" : "";
      return `${sign}${formatter(meta.decimals).format(value)}%`;
    }
    case "spread": {
      const bps = Math.round(value * 100);
      const sign = bps > 0 ? "+" : "";
      return `${sign}${bps} pb`;
    }
    case "currency":
      return formatter(meta.decimals).format(value);
    case "price":
      return `$${formatter(meta.decimals).format(value)}`;
    case "index":
      return new Intl.NumberFormat(numberLocale(getLang()), { maximumFractionDigits: meta.decimals }).format(value);
    default:
      return formatter(meta.decimals).format(value);
  }
}

/** Compact money formatting for large trade values, e.g. "420,2 mil M EUR". */
export function formatMoney(value: number | null | undefined, currency: string) {
  if (value == null || Number.isNaN(value)) return noData();
  const sfx = MONEY_SUFFIX[getLang()];
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  let num: string;
  let suffix: string;
  if (abs >= 1e12) {
    num = formatter(2).format(abs / 1e12);
    suffix = sfx.t; // 10^12
  } else if (abs >= 1e9) {
    num = formatter(1).format(abs / 1e9);
    suffix = sfx.b;
  } else if (abs >= 1e6) {
    num = formatter(1).format(abs / 1e6);
    suffix = sfx.m;
  } else {
    num = formatter(0).format(abs);
    suffix = "";
  }
  return `${sign}${num}${suffix} ${currency}`;
}

/** Human-friendly period label (e.g. "2024", "2026 T1", "abr 2026", "03 jun 2026"). */
export function formatPeriod(period: string, freq: Frequency) {
  const lang = getLang();
  const months = MONTHS[lang];
  if (freq === "Q") {
    const [year, quarter] = period.split("-Q");
    if (lang === "en") return `${year} Q${quarter}`;
    if (lang === "zh") return `${year}年第${quarter}季度`;
    return `${year} T${quarter}`;
  }
  if (freq === "M") {
    const [year, month] = period.split("-");
    const m = months[Number(month) - 1] ?? month;
    return lang === "zh" ? `${year}年${m}` : `${m} ${year}`;
  }
  if (freq === "D") {
    const parts = period.split("-");
    if (parts.length === 3) {
      const [year, month, day] = parts;
      const m = months[Number(month) - 1] ?? month;
      return lang === "zh" ? `${year}年${m}${Number(day)}日` : `${Number(day)} ${m} ${year}`;
    }
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

// --- Resolver-based variants (used by the trade view, where the value depends
//     on mode/flow/freq/period rather than a single metric series). ---

type Resolver = (country: CountryRow) => number | null;

export function rankBy(rows: CountryRow[], resolve: Resolver): CountryRow[] {
  return [...rows]
    .filter((country) => resolve(country) != null)
    .sort((a, b) => (resolve(b) ?? 0) - (resolve(a) ?? 0));
}

export function averageBy(rows: CountryRow[], resolve: Resolver): number | null {
  const values = rows.map(resolve).filter((value): value is number => value != null);
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function extremesBy(rows: CountryRow[], resolve: Resolver): { top: CountryRow | null; bottom: CountryRow | null } {
  const ranked = rankBy(rows, resolve);
  return { top: ranked[0] ?? null, bottom: ranked[ranked.length - 1] ?? null };
}
