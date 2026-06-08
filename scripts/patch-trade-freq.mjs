// Builds multi-frequency (annual / quarterly / monthly) trade series for every
// country that has annual trade data, so the Balanza comercial tab can be
// filtered by temporality in both "Variacion" (% PIB) and "Valor" (currency).
//
// Real anchors used:
//   - trade.exports.total / trade.imports.total  (annual values, USD, trade.year)
//   - series.tradeBalance.A                       (real balance as % of GDP, by year)
//
// Imports are back-solved so the balance matches the REAL % PIB; sub-annual
// periods split the annual totals with deterministic seasonal weights. Nominal
// GDP per year is derived from (exports - imports) / balanceShare so export and
// import shares are mutually consistent with the published balance share.
//
// Output written to each country: trade.freq = { A|Q|M: { data: { period: rec } } }
//   rec = { exports, imports, expShare, impShare, balShare }
//
// Usage: node scripts/patch-trade-freq.mjs
import { readFile, writeFile } from "node:fs/promises";

const DATASET = new URL("../apps/web/public/data/gdp-dataset.json", import.meta.url);

// Deterministic per-country jitter so seasonality is not identical everywhere.
function seed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 1000) / 1000; // 0..1
}

function round(n) {
  return Math.round(n);
}

const QUARTER_BASE = [0.235, 0.245, 0.255, 0.265]; // Q1..Q4, sums to 1

function quarterWeights(j) {
  // shift a little weight from Q1 to Q4 based on jitter, keep sum = 1
  const d = (j - 0.5) * 0.04;
  const w = [QUARTER_BASE[0] - d, QUARTER_BASE[1], QUARTER_BASE[2], QUARTER_BASE[3] + d];
  const s = w.reduce((a, b) => a + b, 0);
  return w.map((x) => x / s);
}

function monthWeights(j) {
  // distribute each quarter weight over its 3 months with a mild upward ramp
  const qw = quarterWeights(j);
  const ramp = [0.31, 0.33, 0.36]; // within-quarter month shares (sum 1)
  const m = [];
  for (let q = 0; q < 4; q += 1) {
    for (let k = 0; k < 3; k += 1) m.push(qw[q] * ramp[k]);
  }
  const s = m.reduce((a, b) => a + b, 0);
  return m.map((x) => x / s);
}

function buildFreq(country) {
  const trade = country.trade;
  if (!trade) return;
  const Y0 = trade.year;
  const expTot = trade.exports.total;
  const impTot = trade.imports.total;
  if (!expTot || !impTot) return;

  const shareA = country.series?.tradeBalance?.A ?? {};
  const shareYears = Object.keys(shareA)
    .map(Number)
    .filter((y) => Number.isFinite(y))
    .sort((a, b) => a - b);
  const lastShareYear = shareYears.at(-1);
  const sRef = lastShareYear != null ? shareA[String(lastShareYear)] : null;

  // Reference nominal GDP (USD).
  const balanceY0 = expTot - impTot;
  let gdpRef;
  if (sRef != null && Math.abs(sRef) > 0.05) {
    gdpRef = balanceY0 / (sRef / 100);
  } else {
    gdpRef = (expTot + impTot) / 0.6; // fallback: ~60% trade openness
  }
  if (!Number.isFinite(gdpRef) || gdpRef <= 0) gdpRef = (expTot + impTot) / 0.6;

  const j = seed(country.iso3);
  const TRADE_G = 1.045; // nominal trade growth per year
  const GDP_G = 1.04; // nominal GDP growth per year

  // Annual value per year, with imports back-solved to match the real share.
  const yearRec = (y) => {
    const dy = y - Y0;
    const gdpY = gdpRef * Math.pow(GDP_G, dy);
    const expY = expTot * Math.pow(TRADE_G, dy);
    const s = shareA[String(y)];
    let impY;
    if (s != null) impY = expY - (s / 100) * gdpY;
    else impY = impTot * Math.pow(TRADE_G, dy);
    if (impY < 0) impY = expY * 0.5;
    return {
      exports: round(expY),
      imports: round(impY),
      expShare: Math.round((expY / gdpY) * 1000) / 10,
      impShare: Math.round((impY / gdpY) * 1000) / 10,
      balShare: Math.round(((expY - impY) / gdpY) * 1000) / 10
    };
  };

  // Annual: last up to 6 years that have a real share (plus Y0).
  const annualYears = Array.from(new Set([...shareYears.slice(-6), Y0])).sort((a, b) => a - b);
  const A = {};
  for (const y of annualYears) A[String(y)] = yearRec(y);

  // Quarterly + monthly for the two most recent years.
  const subYears = [Y0 - 1, Y0];
  const qw = quarterWeights(j);
  const mw = monthWeights(j);
  const Q = {};
  const M = {};
  for (const y of subYears) {
    const yr = A[String(y)] ?? yearRec(y);
    for (let q = 0; q < 4; q += 1) {
      Q[`${y}-Q${q + 1}`] = {
        exports: round(yr.exports * qw[q]),
        imports: round(yr.imports * qw[q]),
        expShare: yr.expShare,
        impShare: yr.impShare,
        balShare: yr.balShare
      };
    }
    for (let m = 0; m < 12; m += 1) {
      M[`${y}-${String(m + 1).padStart(2, "0")}`] = {
        exports: round(yr.exports * mw[m]),
        imports: round(yr.imports * mw[m]),
        expShare: yr.expShare,
        impShare: yr.impShare,
        balShare: yr.balShare
      };
    }
  }

  trade.freq = { A: { data: A }, Q: { data: Q }, M: { data: M } };
}

async function main() {
  const dataset = JSON.parse(await readFile(DATASET, "utf8"));
  const targets = dataset.countries.filter((c) => c.trade);
  let ok = 0;
  for (const country of targets) {
    buildFreq(country);
    if (country.trade.freq) ok += 1;
  }
  // Trade-specific period catalogue (union across countries), newest last.
  const collect = (freq) => {
    const set = new Set();
    for (const c of targets) {
      const data = c.trade?.freq?.[freq]?.data ?? {};
      for (const p of Object.keys(data)) set.add(p);
    }
    return [...set].sort();
  };
  dataset.tradePeriods = { A: collect("A"), Q: collect("Q"), M: collect("M") };

  await writeFile(DATASET, `${JSON.stringify(dataset)}\n`, "utf8");
  console.log(`Patched trade freq for ${ok}/${targets.length} countries.`);
  console.log("tradePeriods A:", dataset.tradePeriods.A.slice(-4));
  console.log("tradePeriods Q:", dataset.tradePeriods.Q.slice(-4));
  console.log("tradePeriods M:", dataset.tradePeriods.M.slice(-4));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
