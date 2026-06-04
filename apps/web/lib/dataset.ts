"use client";

import { useEffect, useState } from "react";
import type { Continent, Frequency, MetricKey } from "./demo-data";

export type MetricSeries = Partial<Record<Frequency, Record<string, number>>>;

export type CountryRow = {
  iso3: string;
  iso2: string;
  name: string;
  continent: Continent;
  region: string;
  center: [number, number] | null;
  series: Partial<Record<MetricKey, MetricSeries>>;
};

export type DataSource = { name: string; url: string; detail: string };

export type GlobalIndicators = {
  bpiOil: { brent: { D: Record<string, number> }; wti: { D: Record<string, number> } };
  payrolls: { M: Record<string, number> };
  fedRate: { M: Record<string, number> };
  ecbRate: { M: Record<string, number> };
  us10y: { D: Record<string, number> };
  eurusd: { D: Record<string, number> };
  sp500: { D: Record<string, number> };
  stoxx50: { D: Record<string, number> };
};

export type Dataset = {
  updatedAt: string;
  periods: Record<Frequency, string[]>;
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

export function useDataset(): DatasetState {
  const [state, setState] = useState<DatasetState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    fetch("data/gdp-dataset.json")
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
