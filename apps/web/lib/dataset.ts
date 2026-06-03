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
  series: Record<MetricKey, MetricSeries>;
};

export type DataSource = { name: string; url: string; detail: string };

export type Dataset = {
  updatedAt: string;
  periods: Record<Frequency, string[]>;
  sources: DataSource[];
  countries: CountryRow[];
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
