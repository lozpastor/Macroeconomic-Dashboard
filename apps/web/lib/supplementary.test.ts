import { describe, expect, it } from "vitest";
import { analysisPair, matchedPairs, matchedSpread, periodChanges, previousPeriod } from "./supplementary";
import type { CountryRow } from "./dataset";

const row = (series: CountryRow["series"]): CountryRow => ({ iso3: "TST", iso2: "TS", name: "Test", continent: "Europe", region: "", center: null, currency: null, trade: null, series });
describe("supplementary chart data", () => {
  it("rolls calendar periods back without skipping missing observations", () => {
    expect(previousPeriod("2025-Q1", "Q")).toBe("2024-Q4");
    expect(previousPeriod("2025-01", "M")).toBe("2024-12");
    expect(previousPeriod("2025", "A")).toBe("2024");
    expect(periodChanges([row({ gdp: { A: { "2023": 1, "2025": 3 } } })], "gdp", "A", "2025")).toEqual([]);
  });
  it("joins only matching period and frequency, preserving zero", () => {
    const rows = [row({ cpi: { M: { "2025-01": 0 } }, cpiCore: { M: { "2025-01": 2 } } }), row({ cpi: { M: { "2025-01": 3 } }, cpiCore: { M: { "2024-12": 2 } } })];
    expect(matchedPairs(rows, "cpiCore", "cpi", "M", "2025-01")).toHaveLength(1);
    expect(matchedPairs(rows, "cpiCore", "cpi", "M", "2025-01")[0].y).toBe(0);
    expect(matchedPairs(rows, "cpiCore", "cpi", "A", "2025")).toEqual([]);
    expect(analysisPair("gdp", "Q")).toBeNull();
  });
  it("computes differences in percentage points, not percent changes", () => {
    expect(periodChanges([row({ unemployment: { M: { "2024-12": 5, "2025-01": 4 } } })], "unemployment", "M", "2025-01")[0].change).toBe(-1);
  });
  it("aligns spreads by date and excludes invalid values", () => {
    expect(matchedSpread({ a: 4, b: 9, c: NaN, d: 0 }, { a: 1, c: 1, d: 0 })).toEqual([{ period: "a", value: 3 }, { period: "d", value: 0 }]);
  });
});
