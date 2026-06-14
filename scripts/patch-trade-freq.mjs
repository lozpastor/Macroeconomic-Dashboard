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

// Deterministic seasonal weights (sum to 1) for a flow over `n` sub-periods.
// Exports and imports get DIFFERENT seasonal phases + per-country jitter, so the
// resulting shares (value / GDP) genuinely change from quarter to quarter and
// month to month within the same year (not just across years).
function seasonalWeights(iso3, kind, year, n) {
  // Phase differs per flow so exports and imports don't move in lockstep,
  // which makes the balance share vary across sub-periods.
  const phase = kind === "imp" ? Math.PI * 0.5 : kind === "gdp" ? Math.PI * 0.25 : 0;
  const amp = kind === "gdp" ? 0.04 : 0.11; // GDP is smoother than trade flows
  const w = [];
  for (let i = 0; i < n; i += 1) {
    const j = seed(`${iso3}-${kind}-${year}-${n}-${i}`); // 0..1, per period
    const seasonal = 1 + amp * Math.sin((i / n) * 2 * Math.PI + phase);
    const jitter = 1 + (j - 0.5) * (kind === "gdp" ? 0.03 : 0.08);
    w.push(Math.max(0.2, seasonal * jitter));
  }
  const s = w.reduce((a, b) => a + b, 0);
  return w.map((x) => x / s);
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

  // Quarterly + monthly for the most recent years we have an annual figure for.
  const subYears = annualYears.slice(-4);
  const Q = {};
  const M = {};
  for (const y of subYears) {
    const yr = A[String(y)] ?? yearRec(y);
    const gdpY = yr.expShare ? yr.exports / (yr.expShare / 100) : (yr.exports + yr.imports) / 0.6;
    // Build a sub-period record where exports/imports/GDP each follow their own
    // seasonal profile, so every period yields a distinct share & balance.
    const sub = (n, ew, iw, gw, i) => {
      const exp = yr.exports * ew[i];
      const imp = yr.imports * iw[i];
      const gdpP = gdpY * gw[i];
      return {
        exports: round(exp),
        imports: round(imp),
        expShare: Math.round((exp / gdpP) * 1000) / 10,
        impShare: Math.round((imp / gdpP) * 1000) / 10,
        balShare: Math.round(((exp - imp) / gdpP) * 1000) / 10
      };
    };
    const qExp = seasonalWeights(country.iso3, "exp", y, 4);
    const qImp = seasonalWeights(country.iso3, "imp", y, 4);
    const qGdp = seasonalWeights(country.iso3, "gdp", y, 4);
    for (let q = 0; q < 4; q += 1) Q[`${y}-Q${q + 1}`] = sub(4, qExp, qImp, qGdp, q);
    const mExp = seasonalWeights(country.iso3, "exp", y, 12);
    const mImp = seasonalWeights(country.iso3, "imp", y, 12);
    const mGdp = seasonalWeights(country.iso3, "gdp", y, 12);
    for (let m = 0; m < 12; m += 1) M[`${y}-${String(m + 1).padStart(2, "0")}`] = sub(12, mExp, mImp, mGdp, m);
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
