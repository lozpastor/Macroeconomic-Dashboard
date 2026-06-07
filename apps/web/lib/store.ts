"use client";

import { create } from "zustand";
import { MAX_COMPARE, categories, metricConfig, type Continent, type Frequency, type MetricKey } from "./demo-data";

type MacroState = {
  category: string;
  metric: MetricKey;
  frequency: Frequency;
  period: string | null;
  selected: string[];
  focusedCountry: string | null;
  continent: Continent | null;
  search: string;
  baseCurrency: string;
  tradeFlow: "exports" | "imports";
  tradeCategory: string | null;
  setCategory: (category: string) => void;
  setMetric: (metric: MetricKey) => void;
  setFrequency: (frequency: Frequency) => void;
  setPeriod: (period: string | null) => void;
  toggleCountry: (iso3: string) => void;
  setContinent: (continent: Continent | null) => void;
  setSearch: (search: string) => void;
  setBaseCurrency: (currency: string) => void;
  setTradeFlow: (flow: "exports" | "imports") => void;
  setTradeCategory: (category: string | null) => void;
  reset: () => void;
};

export const useMacroStore = create<MacroState>((set) => ({
  category: categories[0].key,
  metric: "gdp",
  frequency: "A",
  period: null,
  selected: [],
  focusedCountry: null,
  continent: null,
  search: "",
  baseCurrency: "EUR",
  tradeFlow: "exports",
  tradeCategory: null,
  setCategory: (category) =>
    set(() => {
      const cat = categories.find((c) => c.key === category) ?? categories[0];
      const firstMetric = cat.tabs[0]?.metrics[0];
      if (!firstMetric) return { category };
      const frequency = firstMetric.freqs[0];
      return { category, metric: firstMetric.key, frequency, period: null, selected: [], focusedCountry: null };
    }),
  setMetric: (metric) =>
    set((state) => {
      const freqs = metricConfig(metric).freqs;
      const frequency = freqs.includes(state.frequency) ? state.frequency : freqs[0];
      return { metric, frequency, period: null };
    }),
  setFrequency: (frequency) => set({ frequency, period: null }),
  setPeriod: (period) => set({ period }),
  toggleCountry: (iso3) =>
    set((state) => {
      const isSelected = state.selected.includes(iso3);
      if (isSelected) {
        const selected = state.selected.filter((code) => code !== iso3);
        return {
          selected,
          focusedCountry: state.focusedCountry === iso3 ? selected[selected.length - 1] ?? null : state.focusedCountry
        };
      }
      if (state.selected.length >= MAX_COMPARE) {
        return { focusedCountry: iso3 };
      }
      return { selected: [...state.selected, iso3], focusedCountry: iso3 };
    }),
  setContinent: (continent) =>
    set((state) => ({
      continent: state.continent === continent ? null : continent,
      focusedCountry: null
    })),
  setSearch: (search) => set({ search }),
  setBaseCurrency: (baseCurrency) => set({ baseCurrency }),
  setTradeFlow: (tradeFlow) => set({ tradeFlow }),
  setTradeCategory: (tradeCategory) => set({ tradeCategory }),
  reset: () => set({ focusedCountry: null, continent: null, search: "" })
}));
