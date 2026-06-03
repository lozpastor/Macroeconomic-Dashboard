"use client";

import { create } from "zustand";
import type { IndicatorKey } from "./demo-data";

type MacroState = {
  indicator: IndicatorKey;
  year: number;
  selectedCountries: string[];
  darkMode: boolean;
  setIndicator: (indicator: IndicatorKey) => void;
  setYear: (year: number) => void;
  toggleCountry: (iso3: string) => void;
  toggleTheme: () => void;
};

export const useMacroStore = create<MacroState>((set) => ({
  indicator: "gdpGrowth",
  year: 2023,
  selectedCountries: ["USA", "CHN", "IND", "DEU"],
  darkMode: true,
  setIndicator: (indicator) => set({ indicator }),
  setYear: (year) => set({ year }),
  toggleCountry: (iso3) =>
    set((state) => ({
      selectedCountries: state.selectedCountries.includes(iso3)
        ? state.selectedCountries.filter((country) => country !== iso3)
        : state.selectedCountries.length < 10
          ? [...state.selectedCountries, iso3]
          : state.selectedCountries
    })),
  toggleTheme: () => set((state) => ({ darkMode: !state.darkMode }))
}));
