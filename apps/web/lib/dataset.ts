"use client";

import { useEffect, useState } from "react";
import type { Continent, Frequency, MetricKey } from "./demo-data";
import { assetPath } from "./asset-path";

export type MetricSeries = Partial<Record<Frequency, Record<string, number>>>;

export type TradeFlow = { total: number; categories: Record<string, number> };
export type TradeQuarter = { period: string; exports: number; imports: number };
/** Per-period trade record: currency values and shares of GDP. */
export type TradePeriodRec = {
  exports: number;
  imports: number;
  expShare: number;
  impShare: number;
  balShare: number;
};
export type CountryTrade = {
  year: number;
  exports: TradeFlow;
  imports: TradeFlow;
  quarters?: TradeQuarter[];
  freq?: Partial<Record<Frequency, { data: Record<string, TradePeriodRec> }>>;
};

export type TradeMode = "share" | "value";
export type TradeFlowKey = "total" | "exports" | "imports";

export type CountryRow = {
  iso3: string;
  iso2: string;
  name: string;
  continent: Continent;
  region: string;
  center: [number, number] | null;
  currency: string | null;
  series: Partial<Record<MetricKey, MetricSeries>>;
  trade: CountryTrade | null;
};

export type DataSource = { name: string; url: string; detail: string };

export type GlobalIndicators = {
  bpiOil: { brent: { D: Record<string, number> }; wti: { D: Record<string, number> } };
  fedRate: { M: Record<string, number> };
  ecbRate: { M: Record<string, number> };
  us10y: { D: Record<string, number> };
  fx: Record<string, Record<string, number>>;
  indices: Record<string, { D: Record<string, number> }>;
  tradeCategories: Array<{ key: string; label: string }>;
};

export type Dataset = {
  updatedAt: string;
  periods: Record<Frequency, string[]>;
  tradePeriods?: Partial<Record<Frequency, string[]>>;
  sources: DataSource[];
  countries: CountryRow[];
  global: GlobalIndicators;
};

export type DatasetState =
  | { status: "loading" }
  | { status: "error"; error: string }
  | { status: "ready"; data: Dataset };

/** Value for a country at a specific metric/frequency/period, or null when missing. */
export function valueAt(country: CountryRow, metric: MetricKey, freq: Frequency, period: string | null): number | null {
  if (!period) return null;
  return country.series[metric]?.[freq]?.[period] ?? null;
}

/** Trade record for a country at a freq/period (annual fallback to the base year). */
export function tradeRecAt(
  country: CountryRow,
  freq: Frequency,
  period: string | null
): TradePeriodRec | null {
  const trade = country.trade;
  if (!trade) return null;
  const byFreq = trade.freq?.[freq]?.data;
  if (byFreq && period && byFreq[period]) return byFreq[period];
  // Fallback to the base annual figures when the requested period is missing.
  if (freq === "A") {
    const annual = trade.freq?.A?.data;
    if (annual && period && annual[period]) return annual[period];
  }
  return null;
}

/**
 * Resolves a single trade number honouring the active mode/flow/freq/period.
 * - mode "share": % of GDP for the chosen flow (balance for "total").
 * - mode "value": currency value (USD * factor) for the chosen flow.
 */
export function tradeValueAt(
  country: CountryRow,
  opts: { mode: TradeMode; flow: TradeFlowKey; freq: Frequency; period: string | null; factor: number }
): number | null {
  const rec = tradeRecAt(country, opts.freq, opts.period);
  if (!rec) return null;
  if (opts.mode === "share") {
    return opts.flow === "exports" ? rec.expShare : opts.flow === "imports" ? rec.impShare : rec.balShare;
  }
  const usd = opts.flow === "exports" ? rec.exports : opts.flow === "imports" ? rec.imports : rec.exports - rec.imports;
  return usd * opts.factor;
}

/** Value for a global (non-country) metric at a specific frequency/period. */
export function globalValueAt(
  global: GlobalIndicators | undefined,
  globalKey: string,
  freq: Frequency,
  period: string | null
): number | null {
  if (!global || !period) return null;
  const parts = globalKey.split(".");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let obj: any = global;
  for (const p of parts) {
    obj = obj?.[p];
  }
  return obj?.[freq]?.[period] ?? null;
}

/** Get the full time series for a global metric at a frequency. */
export function globalSeriesAt(
  global: GlobalIndicators | undefined,
  globalKey: string,
  freq: Frequency
): Record<string, number> {
  if (!global) return {};
  const parts = globalKey.split(".");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let obj: any = global;
  for (const p of parts) {
    obj = obj?.[p];
  }
  return obj?.[freq] ?? {};
}

/**
 * Exchange-rate series of `quote` currency expressed per 1 `base` currency.
 * fx[c][date] = units of c per 1 USD, so quote/base = fx[quote]/fx[base].
 * Example: fxRateSeries(g, "USD", "EUR") ~= the EUR/USD quote (USD per 1 EUR).
 */
export function fxRateSeries(
  global: GlobalIndicators | undefined,
  quote: string,
  base: string
): Record<string, number> {
  if (!global) return {};
  const q = global.fx?.[quote];
  const b = global.fx?.[base];
  if (!q || !b) return {};
  const out: Record<string, number> = {};
  for (const [date, qv] of Object.entries(q)) {
    const bv = b[date];
    if (bv == null || bv === 0) continue;
    out[date] = Math.round((qv / bv) * 1e6) / 1e6;
  }
  return out;
}

/** Latest value of a date-keyed series (by sorted date). */
export function latestOf(series: Record<string, number>): { date: string; value: number } | null {
  const dates = Object.keys(series);
  if (dates.length === 0) return null;
  dates.sort();
  const date = dates[dates.length - 1];
  return { date, value: series[date] };
}

/** Factor to convert a USD amount into `base` currency (units of base per 1 USD, latest). */
export function usdToBaseFactor(global: GlobalIndicators | undefined, base: string): number | null {
  if (!global?.fx?.[base]) return null;
  const latest = latestOf(global.fx[base]);
  return latest ? latest.value : null;
}

export function useDataset(): DatasetState {
  const [state, setState] = useState<DatasetState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    fetch(assetPath("/data/gdp-dataset.json"))
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((data: Dataset) => {
        if (!cancelled) setState({ status: "ready", data });
      })
      .catch((error: unknown) => {
        if (!cancelled) setState({ status: "error", error: error instanceof Error ? error.message : "Error" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
