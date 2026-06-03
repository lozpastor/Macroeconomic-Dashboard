"use client";

import { create } from "zustand";
import type { Continent, GdpMetricKey } from "./demo-data";

type MacroState = {
  metric: GdpMetricKey;
  /** ISO3 of the country the map is zoomed into, or null for the world view. */
  focusedCountry: string | null;
  /** Active continent filter, or null for "Mundo". */
  continent: Continent | null;
  setMetric: (metric: GdpMetricKey) => void;
  focusCountry: (iso3: string | null) => void;
  setContinent: (continent: Continent | null) => void;
  reset: () => void;
};

export const useMacroStore = create<MacroState>((set) => ({
  metric: "gdpGrowth",
  focusedCountry: null,
  continent: null,
  setMetric: (metric) => set({ metric }),
  focusCountry: (iso3) =>
    set((state) => ({ focusedCountry: state.focusedCountry === iso3 ? null : iso3 })),
  setContinent: (continent) =>
    set((state) => ({
      continent: state.continent === continent ? null : continent,
      focusedCountry: null
    })),
  reset: () => set({ focusedCountry: null, continent: null })
}));
