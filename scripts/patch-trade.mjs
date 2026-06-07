// One-off helper: re-fetch UN Comtrade trade-by-category for specific countries
// and patch them into the existing dataset (used when the main ETL hit rate
// limits for a few reporters). Usage: node scripts/patch-trade.mjs USA IND BEL
import { readFile, writeFile } from "node:fs/promises";

const DATASET = new URL("../apps/web/public/data/gdp-dataset.json", import.meta.url);
const COMTRADE_BASE = "https://comtradeapi.un.org/public/v1/preview/C/A/HS";
const END_YEAR = new Date().getFullYear();

function range(a, b) {
  const out = [];
  for (let i = a; i <= b; i += 1) out.push(i);
  return out;
}

const HS_CATEGORIES = [
  { key: "food", chapters: range(1, 24) },
  { key: "fuels", chapters: [27] },
  { key: "minerals", chapters: [...range(25, 26), ...range(72, 83)] },
  { key: "chemicals", chapters: range(28, 38) },
  { key: "plastics", chapters: range(39, 40) },
  { key: "wood", chapters: range(44, 49) },
  { key: "textiles", chapters: range(50, 67) },
  { key: "preciousMetals", chapters: [71] },
  { key: "machinery", chapters: range(84, 85) },
  { key: "transport", chapters: range(86, 89) },
  { key: "instruments", chapters: range(90, 92) },
  { key: "other", chapters: [...range(41, 43), ...range(68, 70), ...range(93, 99)] }
];

const CHAPTER_TO_CATEGORY = (() => {
  const map = {};
  for (const cat of HS_CATEGORIES) for (const ch of cat.chapters) map[String(ch).padStart(2, "0")] = cat.key;
  return map;
})();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(url, label) {
  let lastError;
  for (let attempt = 1; attempt <= 10; attempt += 1) {
    try {
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (!res.ok) {
        if (res.status === 429 && attempt < 10) {
          const retryAfter = Number(res.headers.get("retry-after"));
          const waitMs = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : attempt * 8000;
          console.log(`  ${label}: 429, waiting ${waitMs}ms`);
          await sleep(waitMs);
          continue;
        }
        throw new Error(`${label}: HTTP ${res.status}`);
      }
      return await res.json();
    } catch (err) {
      lastError = err;
      if (attempt < 10) await sleep(attempt * 5000);
    }
  }
  throw lastError;
}

async function fetchReporters() {
  const payload = await getJson("https://comtradeapi.un.org/files/v1/app/reference/Reporters.json", "reporters");
  const list = payload.results ?? payload;
  const map = new Map();
  for (const r of list) {
    if (r.reporterCodeIsoAlpha3 && r.reporterCode != null && !map.has(r.reporterCodeIsoAlpha3)) {
      map.set(r.reporterCodeIsoAlpha3, r.reporterCode);
    }
  }
  return map;
}

async function fetchFlow(reporterCode, year, flow) {
  const url = `${COMTRADE_BASE}?reporterCode=${reporterCode}&period=${year}&flowCode=${flow}&cmdCode=AG2&partnerCode=0&partner2Code=0&motCode=0&customsCode=C00`;
  const payload = await getJson(url, `${reporterCode}/${year}/${flow}`);
  const rows = payload.data ?? [];
  const byCategory = {};
  let total = 0;
  for (const r of rows) {
    if (r.primaryValue == null) continue;
    const cat = CHAPTER_TO_CATEGORY[r.cmdCode];
    if (!cat) continue;
    byCategory[cat] = (byCategory[cat] ?? 0) + r.primaryValue;
    total += r.primaryValue;
  }
  return { total: Math.round(total), categories: byCategory, rows: rows.length };
}

async function fetchTrade(reporterCode) {
  for (const year of [END_YEAR - 1, END_YEAR - 2, END_YEAR - 3]) {
    const exports = await fetchFlow(reporterCode, year, "X").catch(() => null);
    await sleep(2000);
    if (!exports || exports.rows === 0) continue;
    const imports = await fetchFlow(reporterCode, year, "M").catch(() => null);
    await sleep(2000);
    const round = (obj) => Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, Math.round(v)]));
    return {
      year,
      exports: { total: exports.total, categories: round(exports.categories) },
      imports: imports ? { total: imports.total, categories: round(imports.categories) } : { total: 0, categories: {} }
    };
  }
  return null;
}

const targets = process.argv.slice(2);
if (targets.length === 0) {
  console.error("Usage: node scripts/patch-trade.mjs ISO3 [ISO3 ...]");
  process.exit(1);
}

const dataset = JSON.parse(await readFile(DATASET, "utf8"));
const reporters = await fetchReporters();
let patched = 0;
for (const iso3 of targets) {
  const code = reporters.get(iso3);
  if (code == null) {
    console.log(`${iso3}: no reporter code`);
    continue;
  }
  const trade = await fetchTrade(code).catch((e) => {
    console.log(`${iso3}: ${e.message}`);
    return null;
  });
  if (!trade) {
    console.log(`${iso3}: no trade data`);
    continue;
  }
  const country = dataset.countries.find((c) => c.iso3 === iso3);
  if (!country) {
    console.log(`${iso3}: not in dataset`);
    continue;
  }
  country.trade = trade;
  patched += 1;
  console.log(`${iso3}: OK ${trade.year} exports=${trade.exports.total} imports=${trade.imports.total}`);
}

if (patched > 0) {
  await writeFile(DATASET, `${JSON.stringify(dataset)}\n`);
  console.log(`Patched ${patched} countries into dataset.`);
}
