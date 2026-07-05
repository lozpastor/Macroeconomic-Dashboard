import { readFile } from "node:fs/promises";

const DATASET = new URL("../apps/web/public/data/gdp-dataset.json", import.meta.url);

function latest(values = []) {
  return values.at(-1) ?? null;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function currentPeriods() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const quarter = Math.ceil((now.getUTCMonth() + 1) / 3);
  return {
    date: now.toISOString().slice(0, 10),
    month: `${year}-${month}`,
    quarter: `${year}-Q${quarter}`,
    year: String(year)
  };
}

const dataset = JSON.parse(await readFile(DATASET, "utf8"));
const current = currentPeriods();

assert(dataset.updatedAt === current.date, `updatedAt should be ${current.date}, got ${dataset.updatedAt}`);
assert(Array.isArray(dataset.countries) && dataset.countries.length >= 50, "countries list is unexpectedly small");
assert(dataset.global && typeof dataset.global === "object", "global indicators missing");
assert(dataset.periods?.A?.length > 0, "annual periods missing");
assert(dataset.periods?.M?.length > 0, "monthly periods missing");
assert(dataset.periods?.D?.length > 0, "daily periods missing");
assert(dataset.tradePeriods?.M?.includes(current.month), `trade monthly periods should include ${current.month}`);
assert(dataset.tradePeriods?.Q?.includes(current.quarter), `trade quarterly periods should include ${current.quarter}`);

const hasTrade = dataset.countries.some((country) => country.trade?.freq?.M?.data?.[current.month]);
assert(hasTrade, `no country has trade data for ${current.month}`);

const summary = {
  updatedAt: dataset.updatedAt,
  countries: dataset.countries.length,
  periods: {
    A: latest(dataset.periods.A),
    Q: latest(dataset.periods.Q),
    M: latest(dataset.periods.M),
    D: latest(dataset.periods.D)
  },
  tradePeriods: {
    A: latest(dataset.tradePeriods?.A),
    Q: latest(dataset.tradePeriods?.Q),
    M: latest(dataset.tradePeriods?.M)
  }
};

console.log(JSON.stringify(summary, null, 2));
