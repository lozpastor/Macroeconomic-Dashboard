"use client";

import { useEffect, useState } from "react";
import type { Continent, GdpMetricKey } from "./demo-data";

export type MetricPoint = { year: number; value: number } | null;

export type CountryRow = {
  iso3: string;
  iso2: string;
  name: string;
  continent: Continent;
  region: string;
  center: [number, number] | null;
  latest: Record<GdpMetricKey, MetricPoint>;
  history: Record<GdpMetricKey, Record<string, number>>;
};

export type DataSource = { name: string; url: string; detail: string };

export type Dataset = {
  updatedAt: string;
  range: { start: number; end: number };
  sources: DataSource[];
  countries: CountryRow[];
};

export type DatasetState =
  | { status: "loading" }
  | { status: "error"; error: string }
  | { status: "ready"; data: Dataset };

export function latestValue(country: CountryRow, metric: GdpMetricKey): number | null {
  return country.latest[metric]?.value ?? null;
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
