"use client";

import { create } from "zustand";
import { MAX_COMPARE, type Continent, type GdpMetricKey } from "./demo-data";

type MacroState = {
  metric: GdpMetricKey;
  /** ISO3 codes selected for comparison (multi-select). */
  selected: string[];
  /** ISO3 the map is zoomed into, or null for the world/region view. */
  focusedCountry: string | null;
  /** Active continent filter, or null for "Mundo". */
  continent: Continent | null;
  /** Free-text country search. */
  search: string;
  setMetric: (metric: GdpMetricKey) => void;
  toggleCountry: (iso3: string) => void;
  setContinent: (continent: Continent | null) => void;
  setSearch: (search: string) => void;
  reset: () => void;
};

export const useMacroStore = create<MacroState>((set) => ({
  metric: "gdpGrowth",
  selected: [],
  focusedCountry: null,
  continent: null,
  search: "",
  setMetric: (metric) => set({ metric }),
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
  reset: () => set({ focusedCountry: null, continent: null, search: "" })
}));
