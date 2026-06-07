// Adds quarterly trade totals (exports/imports) to each country in the existing
// dataset, fetched from UN Comtrade monthly TOTAL values aggregated to quarters.
// Keeps the existing annual category breakdown untouched.
//
// Usage: node scripts/patch-trade-quarters.mjs
import { readFile, writeFile } from "node:fs/promises";

const DATASET = new URL("../apps/web/public/data/gdp-dataset.json", import.meta.url);
const COMTRADE_MONTHLY = "https://comtradeapi.un.org/public/v1/preview/C/M/HS";
const REPORTERS_URL = "https://comtradeapi.un.org/files/v1/app/reference/Reporters.json";
const END_YEAR = new Date().getFullYear();
const YEARS = [END_YEAR, END_YEAR - 1, END_YEAR - 2]; // newest first

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(url, label) {
  let lastError;
  for (let attempt = 1; attempt <= 8; attempt += 1) {
    try {
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (!res.ok) {
        if (res.status === 429 && attempt < 8) {
          const ra = Number(res.headers.get("retry-after"));
          await sleep(Number.isFinite(ra) && ra > 0 ? ra * 1000 : attempt * 6000);
          continue;
        }
        throw new Error(`${label}: HTTP ${res.status}`);
      }
      return await res.json();
    } catch (err) {
      lastError = err;
      if (attempt < 8) await sleep(attempt * 4000);
    }
  }
  throw lastError;
}

async function fetchReporters() {
  const payload = await getJson(REPORTERS_URL, "Comtrade reporters");
  const list = payload.results ?? payload;
  const map = new Map();
  for (const r of list) {
    const iso3 = r.reporterCodeIsoAlpha3;
    if (iso3 && r.reporterCode != null && !map.has(iso3)) map.set(iso3, r.reporterCode);
  }
  return map;
}

// Monthly totals for a flow over a year -> { "YYYY-MM": value }.
async function fetchMonthly(reporterCode, year, flow) {
  const period = Array.from({ length: 12 }, (_, i) => `${year}${String(i + 1).padStart(2, "0")}`).join(",");
  const url =
    `${COMTRADE_MONTHLY}?reporterCode=${reporterCode}&period=${period}` +
    `&flowCode=${flow}&cmdCode=TOTAL&partnerCode=0&partner2Code=0&motCode=0&customsCode=C00`;
  const payload = await getJson(url, `Comtrade M ${reporterCode}/${year}/${flow}`);
  const rows = payload.data ?? [];
  const out = {};
  for (const r of rows) {
    if (r.primaryValue == null || !r.period) continue;
    const month = `${String(r.period).slice(0, 4)}-${String(r.period).slice(4, 6)}`;
    out[month] = r.primaryValue;
  }
  return out;
}

// Aggregate monthly map -> quarterly array [{period:"YYYY-Qn", exports, imports}].
function toQuarters(expMonthly, impMonthly) {
  const q = new Map(); // period -> { exports, imports, eMonths, iMonths }
  const add = (monthly, key, countKey) => {
    for (const [month, val] of Object.entries(monthly)) {
      const [y, m] = month.split("-").map(Number);
      const period = `${y}-Q${Math.floor((m - 1) / 3) + 1}`;
      const cur = q.get(period) ?? { exports: 0, imports: 0, eMonths: 0, iMonths: 0 };
      cur[key] += val;
      cur[countKey] += 1;
      q.set(period, cur);
    }
  };
  add(expMonthly, "exports", "eMonths");
  add(impMonthly, "imports", "iMonths");
  // Keep only complete quarters (3 months reported on both flows present).
  return [...q.entries()]
    .filter(([, v]) => v.eMonths === 3 && v.iMonths === 3)
    .map(([period, v]) => ({ period, exports: Math.round(v.exports), imports: Math.round(v.imports) }))
    .sort((a, b) => {
      const [ay, aq] = a.period.split("-Q").map(Number);
      const [by, bq] = b.period.split("-Q").map(Number);
      return ay - by || aq - bq;
    });
}

async function fetchQuarters(reporterCode) {
  const expMonthly = {};
  const impMonthly = {};
  for (const year of YEARS) {
    const e = await fetchMonthly(reporterCode, year, "X").catch(() => ({}));
    await sleep(900);
    const i = await fetchMonthly(reporterCode, year, "M").catch(() => ({}));
    await sleep(900);
    Object.assign(expMonthly, e);
    Object.assign(impMonthly, i);
  }
  const quarters = toQuarters(expMonthly, impMonthly);
  return quarters.slice(-10); // last 10 complete quarters
}

async function main() {
  const dataset = JSON.parse(await readFile(DATASET, "utf8"));
  const reporters = await fetchReporters();
  const targets = dataset.countries.filter((c) => c.trade);
  console.log(`Fetching quarterly totals for ${targets.length} countries...`);

  let ok = 0;
  for (const country of targets) {
    const code = reporters.get(country.iso3);
    if (code == null) {
      console.warn(`  ${country.iso3}: no reporter code`);
      continue;
    }
    try {
      const quarters = await fetchQuarters(code);
      if (quarters.length) {
        country.trade.quarters = quarters;
        ok += 1;
        const last = quarters[quarters.length - 1];
        console.log(`  ${country.iso3}: ${quarters.length}q, last ${last.period} X=${last.exports} M=${last.imports}`);
      } else {
        console.warn(`  ${country.iso3}: no complete quarters`);
      }
    } catch (err) {
      console.warn(`  ${country.iso3}: failed (${err.message})`);
    }
  }

  await writeFile(DATASET, `${JSON.stringify(dataset)}\n`);
  console.log(`Done. Added quarterly data to ${ok}/${targets.length} countries.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
