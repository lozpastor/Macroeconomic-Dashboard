// Multi-source ETL for the macro dashboard (all 6 categories).
// Sources:
//   - REST Countries  -> country metadata (name, ISO codes, continent, coordinates, currency).
//   - World Bank      -> annual GDP growth, GDP per capita, public debt %GDP, deficit %GDP, trade balance %GDP.
//   - OECD SDMX       -> quarterly/monthly: GDP, industrial production, retail, CPI, core CPI,
//                        unemployment, consumer confidence, long-term interest rates.
//   - FRED (fredgraph) -> monthly: Fed funds rate.
//   - ECB Data Portal -> daily: ECB main refinancing rate.
//   - Frankfurter     -> daily: ECB reference FX rates (per-country exchange rate + currency conversion).
//   - UN Comtrade     -> annual: exports/imports by HS category for major economies.
//   - Yahoo Finance   -> daily: Brent, WTI, US 10y yield, and major stock indices.
// Output: apps/web/public/data/gdp-dataset.json

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT = resolve(__dirname, "../apps/web/public/data/gdp-dataset.json");
const METADATA_FILE = resolve(__dirname, "country-metadata.json");

const START_YEAR = 2005;
const END_YEAR = new Date().getFullYear();
const CONTINENTS = ["Africa", "North America", "South America", "Asia", "Europe", "Oceania"];

const round2 = (v) => Math.round(v * 100) / 100;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Major stock indices (Yahoo symbol + identifying country flag, "EU" = pan-European).
const INDICES = [
  { key: "sp500", short: "S&P 500", label: "S&P 500", symbol: "^GSPC", flag: "US" },
  { key: "nasdaq", short: "Nasdaq 100", label: "Nasdaq 100", symbol: "^NDX", flag: "US" },
  { key: "dowjones", short: "Dow Jones", label: "Dow Jones Industrial", symbol: "^DJI", flag: "US" },
  { key: "stoxx50", short: "Euro Stoxx 50", label: "Euro Stoxx 50", symbol: "^STOXX50E", flag: "EU" },
  { key: "ftse100", short: "FTSE 100", label: "FTSE 100 (Reino Unido)", symbol: "^FTSE", flag: "GB" },
  { key: "dax", short: "DAX", label: "DAX (Alemania)", symbol: "^GDAXI", flag: "DE" },
  { key: "cac40", short: "CAC 40", label: "CAC 40 (Francia)", symbol: "^FCHI", flag: "FR" },
  { key: "ibex35", short: "IBEX 35", label: "IBEX 35 (Espana)", symbol: "^IBEX", flag: "ES" },
  { key: "ftsemib", short: "FTSE MIB", label: "FTSE MIB (Italia)", symbol: "FTSEMIB.MI", flag: "IT" },
  { key: "nikkei", short: "Nikkei 225", label: "Nikkei 225 (Japon)", symbol: "^N225", flag: "JP" },
  { key: "hangseng", short: "Hang Seng", label: "Hang Seng (Hong Kong)", symbol: "^HSI", flag: "HK" },
  { key: "shanghai", short: "Shanghai", label: "Shanghai Composite (China)", symbol: "000001.SS", flag: "CN" },
  { key: "sensex", short: "Sensex", label: "BSE Sensex (India)", symbol: "^BSESN", flag: "IN" },
  { key: "bovespa", short: "Bovespa", label: "Bovespa (Brasil)", symbol: "^BVSP", flag: "BR" },
  { key: "tsx", short: "S&P/TSX", label: "S&P/TSX (Canada)", symbol: "^GSPTSE", flag: "CA" },
  { key: "asx200", short: "ASX 200", label: "S&P/ASX 200 (Australia)", symbol: "^AXJO", flag: "AU" },
  { key: "kospi", short: "KOSPI", label: "KOSPI (Corea del Sur)", symbol: "^KS11", flag: "KR" }
];

// Countries for which we fetch trade-by-category data from UN Comtrade (major traders).
const TRADE_COUNTRIES = [
  "USA", "CHN", "DEU", "JPN", "GBR", "FRA", "ITA", "CAN", "KOR", "ESP",
  "MEX", "IND", "NLD", "CHE", "BEL", "BRA", "AUS", "TUR", "POL", "SWE",
  "AUT", "IDN", "THA", "NOR", "IRL", "DNK", "SGP", "MYS", "ZAF", "VNM",
  "ARG", "CHL", "COL", "PRT", "CZE", "FIN", "GRC", "HUN", "ROU", "NZL",
  "EGY", "ISR", "PER", "PHL", "ARE"
];

// HS 2-digit chapter -> friendly trade category. Keys are the main categories shown.
const HS_CATEGORIES = [
  { key: "food", label: "Alimentos y bebidas", chapters: range(1, 24) },
  { key: "fuels", label: "Combustibles y energia", chapters: [27] },
  { key: "minerals", label: "Minerales y metales", chapters: [...range(25, 26), ...range(72, 83)] },
  { key: "chemicals", label: "Quimicos y farmacia", chapters: range(28, 38) },
  { key: "plastics", label: "Plasticos y caucho", chapters: range(39, 40) },
  { key: "wood", label: "Madera, papel y derivados", chapters: range(44, 49) },
  { key: "textiles", label: "Textiles y calzado", chapters: range(50, 67) },
  { key: "preciousMetals", label: "Metales preciosos y joyeria", chapters: [71] },
  { key: "machinery", label: "Maquinaria y electronica", chapters: range(84, 85) },
  { key: "transport", label: "Material de transporte", chapters: range(86, 89) },
  { key: "instruments", label: "Instrumentos y optica", chapters: range(90, 92) },
  { key: "other", label: "Otros", chapters: [...range(41, 43), ...range(68, 70), ...range(93, 99)] }
];

function range(a, b) {
  const out = [];
  for (let i = a; i <= b; i += 1) out.push(i);
  return out;
}

const CHAPTER_TO_CATEGORY = (() => {
  const map = {};
  for (const cat of HS_CATEGORIES) {
    for (const ch of cat.chapters) map[String(ch).padStart(2, "0")] = cat.key;
  }
  return map;
})();

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

async function getJson(url, label, headers) {
  let lastError;
  for (let attempt = 1; attempt <= 8; attempt += 1) {
    try {
      const res = await fetch(url, { headers: { Accept: "application/json", ...headers } });
      if (!res.ok) {
        // On rate limiting, honour Retry-After (or back off) and retry a few times.
        if (res.status === 429 && attempt < 8) {
          const retryAfter = Number(res.headers.get("retry-after"));
          const waitMs = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : attempt * 6000;
          await sleep(waitMs);
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

async function getText(url, label, headers) {
  let lastError;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const res = await fetch(url, { headers: headers ?? {} });
      if (!res.ok) throw new Error(`${label}: HTTP ${res.status}`);
      return await res.text();
    } catch (err) {
      lastError = err;
      if (attempt < 4) await sleep(attempt * 4000);
    }
  }
  throw lastError;
}

function tryParse(fn, label) {
  return fn().catch((err) => {
    console.warn(`WARN: ${label} failed (${err.message}). Skipping.`);
    return null;
  });
}

async function loadExistingDataset() {
  try {
    return JSON.parse(await readFile(OUTPUT, "utf8"));
  } catch {
    return null;
  }
}

function existingCountryMap(dataset, metric, freq) {
  const map = new Map();
  for (const country of dataset?.countries ?? []) {
    const history = country.series?.[metric]?.[freq];
    if (history && Object.keys(history).length > 0) map.set(country.iso3, history);
  }
  return map;
}

function existingGlobalMap(history) {
  const map = new Map();
  map.set("_global", history ?? {});
  return map;
}

function existingFxMap(dataset) {
  const map = new Map();
  for (const [currency, history] of Object.entries(dataset?.global?.fx ?? {})) {
    map.set(currency, history);
  }
  return map.size ? map : null;
}

function existingTradeMap(dataset) {
  const map = new Map();
  for (const country of dataset?.countries ?? []) {
    if (country.trade) map.set(country.iso3, country.trade);
  }
  return map;
}

// ---------------------------------------------------------------------------
// REST Countries (metadata)
// ---------------------------------------------------------------------------

// Country metadata is essentially static (names, ISO codes, continents,
// coordinates, currencies). REST Countries' bulk `all` endpoint has been
// deprecated and now returns an error body, so we try it for freshness but fall
// back to the committed static file. This keeps the ETL from aborting on
// metadata — previously a deprecation here silently stalled the whole refresh.
async function loadStaticMetadata() {
  const list = JSON.parse(await readFile(METADATA_FILE, "utf8"));
  const byIso3 = new Map();
  for (const c of list) {
    if (!c.iso3 || !c.iso2 || !c.continent) continue;
    byIso3.set(c.iso3, {
      iso3: c.iso3,
      iso2: c.iso2,
      name: c.name ?? c.iso3,
      continent: c.continent,
      region: c.region ?? c.continent,
      center: Array.isArray(c.center) ? c.center : null,
      currency: c.currency ?? null
    });
  }
  return byIso3;
}

async function fetchMetadata() {
  try {
    const data = await getJson(
      "https://restcountries.com/v3.1/all?fields=name,cca2,cca3,latlng,continents,region,currencies",
      "REST Countries"
    );
    if (!Array.isArray(data)) throw new Error("non-array payload (endpoint deprecated?)");
    const byIso3 = new Map();
    for (const c of data) {
      const iso3 = c.cca3;
      const iso2 = c.cca2;
      const continent = c.continents?.[0];
      if (!iso3 || !iso2 || !continent || !CONTINENTS.includes(continent)) continue;
      const [lat, lng] = c.latlng ?? [];
      const currency = c.currencies ? Object.keys(c.currencies)[0] ?? null : null;
      byIso3.set(iso3, {
        iso3,
        iso2,
        name: c.name?.common ?? iso3,
        continent,
        region: c.region ?? continent,
        center: Number.isFinite(lng) && Number.isFinite(lat) ? [lng, lat] : null,
        currency
      });
    }
    if (byIso3.size < 50) throw new Error(`only ${byIso3.size} countries parsed`);
    return byIso3;
  } catch (err) {
    console.warn(`WARN: REST Countries unavailable (${err.message}); using static country metadata.`);
    return loadStaticMetadata();
  }
}

// ---------------------------------------------------------------------------
// Frankfurter (ECB reference FX rates, daily) — per-currency series vs USD.
// Used for the per-country exchange-rate indicator and to convert trade values.
// ---------------------------------------------------------------------------

async function fetchFrankfurter() {
  const start = `${END_YEAR - 5}-01-01`;
  const payload = await getJson(
    `https://api.frankfurter.dev/v1/${start}..?base=USD`,
    "Frankfurter FX"
  );
  const rates = payload.rates ?? {};
  // currency -> { date: units per 1 USD }
  const byCurrency = new Map();
  byCurrency.set("USD", {});
  for (const [date, perDay] of Object.entries(rates)) {
    byCurrency.get("USD")[date] = 1;
    for (const [cur, val] of Object.entries(perDay)) {
      if (val == null) continue;
      if (!byCurrency.has(cur)) byCurrency.set(cur, {});
      byCurrency.get(cur)[date] = Math.round(val * 1e6) / 1e6;
    }
  }
  return byCurrency;
}

// ---------------------------------------------------------------------------
// World Bank
// ---------------------------------------------------------------------------

async function fetchWorldBank(code, label) {
  const url = `https://api.worldbank.org/v2/country/all/indicator/${code}?format=json&per_page=30000&date=${START_YEAR}:${END_YEAR}`;
  const payload = await getJson(url, label ?? `WB ${code}`);
  const rows = Array.isArray(payload) ? payload[1] : null;
  if (!rows) throw new Error(`WB ${code}: unexpected payload`);
  const byIso3 = new Map();
  for (const r of rows) {
    const iso3 = r.countryiso3code;
    if (!iso3 || r.value == null) continue;
    if (!byIso3.has(iso3)) byIso3.set(iso3, {});
    byIso3.get(iso3)[r.date] = round2(r.value);
  }
  return byIso3;
}

// ---------------------------------------------------------------------------
// OECD SDMX
// ---------------------------------------------------------------------------

const OECD_HEADERS = {
  Accept: "application/vnd.sdmx.data+json; charset=utf-8",
  "Accept-Language": "en"
};

function parseOecdSdmx(payload, label) {
  const structure = payload.data?.structures?.[0];
  const dataset = payload.data?.dataSets?.[0];
  if (!structure || !dataset) throw new Error(`OECD ${label}: unexpected payload`);
  const dims = structure.dimensions.observation;
  const ids = dims.map((d) => d.id);
  const vals = dims.map((d) => d.values);
  const areaPos = ids.indexOf("REF_AREA");
  const timePos = ids.indexOf("TIME_PERIOD");
  const byIso3 = new Map();
  for (const [key, obs] of Object.entries(dataset.observations ?? {})) {
    const ix = key.split(":").map(Number);
    const iso3 = vals[areaPos]?.[ix[areaPos]]?.id;
    const period = vals[timePos]?.[ix[timePos]]?.id;
    const value = obs?.[0];
    if (!iso3 || !period || value == null) continue;
    if (!byIso3.has(iso3)) byIso3.set(iso3, {});
    byIso3.get(iso3)[period] = round2(value);
  }
  return byIso3;
}

async function fetchOecd(url, label) {
  const payload = await getJson(url, `OECD ${label}`, OECD_HEADERS);
  return parseOecdSdmx(payload, label);
}

// OECD KEI (Key Economic Indicators) — used for Cat 1 data (GDP Q, industrial, retail)
const OECD_KEI = "https://sdmx.oecd.org/public/rest/data/OECD.SDD.STES,DSD_KEI@DF_KEI,";

async function fetchOecdKei(seriesKey, label) {
  const url = `${OECD_KEI}/${seriesKey}?startPeriod=${START_YEAR}-01&dimensionAtObservation=AllDimensions`;
  return fetchOecd(url, label);
}

// OECD Prices (CPI)
async function fetchOecdCpi(expenditure, label) {
  // DF_PRICES_ALL key: REF_AREA.FREQ.METHODOLOGY.MEASURE.UNIT_MEASURE.EXPENDITURE.TRANSFORMATION.TIME_FORMAT
  const url = `https://sdmx.oecd.org/public/rest/data/OECD.SDD.TPS,DSD_PRICES@DF_PRICES_ALL,1.0/.M.N.CPI..${expenditure}.N.GY?startPeriod=${START_YEAR}-01&dimensionAtObservation=AllDimensions`;
  return fetchOecd(url, label);
}

// OECD Unemployment (monthly harmonised rate, % of labour force)
async function fetchOecdUnemployment() {
  // DF_IALFS_UNE_M key: REF_AREA.MEASURE.UNIT_MEASURE.TRANSFORMATION.ADJUSTMENT.SEX.AGE.ACTIVITY.FREQ
  const url = `https://sdmx.oecd.org/public/rest/data/OECD.SDD.TPS,DSD_LFS@DF_IALFS_UNE_M,1.0/.UNE_LF_M.PT_LF_SUB._Z.Y._T.Y_GE15._Z.M?startPeriod=${START_YEAR}-01&dimensionAtObservation=AllDimensions`;
  return fetchOecd(url, "Unemployment");
}

// OECD Consumer Confidence (CLI dataset, amplitude-adjusted index)
async function fetchOecdCci() {
  // DF_CLI key: REF_AREA.FREQ.MEASURE.UNIT_MEASURE.ACTIVITY.ADJUSTMENT.TRANSFORMATION.TIME_HORIZ.METHODOLOGY
  const url = `https://sdmx.oecd.org/public/rest/data/OECD.SDD.STES,DSD_STES@DF_CLI,4.1/.M.CCICP.IX._Z.AA.IX._Z.H?startPeriod=${START_YEAR}-01&dimensionAtObservation=AllDimensions`;
  return fetchOecd(url, "Consumer Confidence");
}

// OECD Long-term interest rates (10y government bonds, monthly) via KEI MEASURE=IRLT
async function fetchOecdLongTermRates() {
  const url = `${OECD_KEI}/.M.IRLT....?startPeriod=${START_YEAR}-01&dimensionAtObservation=AllDimensions`;
  return fetchOecd(url, "Long-term rates");
}

// ---------------------------------------------------------------------------
// FRED (fredgraph CSV — works reliably for small monthly series)
// ---------------------------------------------------------------------------

async function fetchFredMonthly(seriesId, label) {
  const csv = await getText(
    `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${seriesId}`,
    label ?? `FRED ${seriesId}`
  );
  const map = new Map();
  map.set("_global", {});
  for (const line of csv.split("\n").slice(1)) {
    const [date, val] = line.split(",");
    if (!date || !val || val === "." || val.trim() === "") continue;
    const num = parseFloat(val);
    if (Number.isNaN(num)) continue;
    const [y, m] = date.split("-");
    if (Number(y) < START_YEAR) continue;
    const period = `${y}-${m}`;
    map.get("_global")[period] = round2(num);
  }
  return map;
}

// ---------------------------------------------------------------------------
// ECB Data Portal (CSV)
// ---------------------------------------------------------------------------

async function fetchEcbRate() {
  // Daily MRR series; aggregate to monthly (last observation of each month).
  const csv = await getText(
    "https://data-api.ecb.europa.eu/service/data/FM/D.U2.EUR.4F.KR.MRR_FR.LEV?format=csvdata",
    "ECB MRR"
  );
  const map = new Map();
  map.set("_global", {});
  const lines = csv.split("\n");
  const header = lines[0]?.split(",") ?? [];
  const tpIdx = header.indexOf("TIME_PERIOD");
  const ovIdx = header.indexOf("OBS_VALUE");
  if (tpIdx < 0 || ovIdx < 0) return map;
  const daily = [];
  for (const line of lines.slice(1)) {
    const cols = line.split(",");
    const period = cols[tpIdx];
    const val = parseFloat(cols[ovIdx]);
    if (!period || Number.isNaN(val)) continue;
    daily.push([period, round2(val)]);
  }
  daily.sort((a, b) => (a[0] < b[0] ? -1 : 1));
  // Carry forward last known daily value to the end of each month.
  const monthly = map.get("_global");
  for (const [date, val] of daily) {
    const month = date.slice(0, 7);
    if (month.slice(0, 4) >= String(START_YEAR)) monthly[month] = val;
  }
  return map;
}

// ---------------------------------------------------------------------------
// Yahoo Finance (daily chart data)
// ---------------------------------------------------------------------------

async function fetchYahooDaily(symbol, label, decimals = 2) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=20y&interval=1d`;
  const payload = await getJson(url, label ?? `Yahoo ${symbol}`, {
    "User-Agent": "Mozilla/5.0"
  });
  const result = payload.chart?.result?.[0];
  if (!result) throw new Error(`Yahoo ${symbol}: no result`);
  const timestamps = result.timestamp ?? [];
  const closes = result.indicators?.quote?.[0]?.close ?? [];
  const factor = 10 ** decimals;
  const map = new Map();
  map.set("_global", {});
  for (let i = 0; i < timestamps.length; i++) {
    const val = closes[i];
    if (val == null) continue;
    const d = new Date(timestamps[i] * 1000);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    const period = `${y}-${m}-${day}`;
    map.get("_global")[period] = Math.round(val * factor) / factor;
  }
  return map;
}

// ---------------------------------------------------------------------------
// UN Comtrade (annual trade by HS chapter -> friendly categories)
// ---------------------------------------------------------------------------

const COMTRADE_BASE = "https://comtradeapi.un.org/public/v1/preview/C/A/HS";

async function fetchComtradeReporters() {
  const payload = await getJson(
    "https://comtradeapi.un.org/files/v1/app/reference/Reporters.json",
    "Comtrade reporters"
  );
  const list = payload.results ?? payload;
  const iso3ToCode = new Map();
  for (const r of list) {
    const iso3 = r.reporterCodeIsoAlpha3;
    // Keep the first (current) entry; later ones are historical aggregates
    // (e.g. "USA and Puerto Rico (...1980)") that return no recent data.
    if (iso3 && r.reporterCode != null && !iso3ToCode.has(iso3)) iso3ToCode.set(iso3, r.reporterCode);
  }
  return iso3ToCode;
}

// One flow (X=exports, M=imports) of a reporter for a year, aggregated to categories.
async function fetchComtradeFlow(reporterCode, year, flow) {
  const url =
    `${COMTRADE_BASE}?reporterCode=${reporterCode}&period=${year}` +
    `&flowCode=${flow}&cmdCode=AG2&partnerCode=0&partner2Code=0&motCode=0&customsCode=C00`;
  const payload = await getJson(url, `Comtrade ${reporterCode}/${year}/${flow}`);
  const rows = payload.data ?? [];
  const byCategory = {};
  let total = 0;
  for (const r of rows) {
    const value = r.primaryValue;
    if (value == null) continue;
    const cat = CHAPTER_TO_CATEGORY[r.cmdCode];
    if (!cat) continue;
    byCategory[cat] = (byCategory[cat] ?? 0) + value;
    total += value;
  }
  return { total: Math.round(total), categories: byCategory, rows: rows.length };
}

// Returns { year, exports:{total,categories}, imports:{total,categories} } or null.
async function fetchTradeForCountry(reporterCode) {
  for (const year of [END_YEAR - 1, END_YEAR - 2, END_YEAR - 3]) {
    const exports = await fetchComtradeFlow(reporterCode, year, "X").catch(() => null);
    await sleep(1200);
    if (!exports || exports.rows === 0) continue;
    const imports = await fetchComtradeFlow(reporterCode, year, "M").catch(() => null);
    await sleep(1200);
    const round = (obj) => {
      const out = {};
      for (const [k, v] of Object.entries(obj)) out[k] = Math.round(v);
      return out;
    };
    return {
      year,
      exports: { total: exports.total, categories: round(exports.categories) },
      imports: imports
        ? { total: imports.total, categories: round(imports.categories) }
        : { total: 0, categories: {} }
    };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Period helpers
// ---------------------------------------------------------------------------

function periodSorter(freq) {
  if (freq === "A") return (a, b) => Number(a) - Number(b);
  if (freq === "Q") {
    return (a, b) => {
      const [ay, aq] = a.split("-Q").map(Number);
      const [by, bq] = b.split("-Q").map(Number);
      return ay - by || aq - bq;
    };
  }
  // M and D: "YYYY-MM" or "YYYY-MM-DD"
  return (a, b) => (a < b ? -1 : a > b ? 1 : 0);
}

function collectPeriods(maps, freq) {
  const set = new Set();
  for (const m of maps) {
    if (!m) continue;
    for (const history of m.values()) {
      for (const p of Object.keys(history)) set.add(p);
    }
  }
  return [...set].sort(periodSorter(freq));
}

// For daily data, limit to recent N years to keep dataset size reasonable.
function limitDaily(map, yearsBack) {
  if (!map) return map;
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - yearsBack);
  const cutStr = cutoff.toISOString().slice(0, 10);
  for (const [key, history] of map.entries()) {
    const filtered = {};
    for (const [period, val] of Object.entries(history)) {
      if (period >= cutStr) filtered[period] = val;
    }
    map.set(key, filtered);
  }
  return map;
}

// For monthly data from FRED that has "_global" key, just return the global series directly
function globalSeries(map) {
  return map?.get("_global") ?? {};
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const existing = await loadExistingDataset();
  console.log("Fetching metadata + World Bank...");

  // Parallel: metadata + FX + all World Bank indicators
  const [metadata, fxByCurrencyRaw, gdpARaw, perCapitaARaw, debtARaw, deficitARaw, tradeBalWbARaw] = await Promise.all([
    fetchMetadata(),
    tryParse(() => fetchFrankfurter(), "Frankfurter FX"),
    tryParse(() => fetchWorldBank("NY.GDP.MKTP.KD.ZG", "WB GDP growth"), "WB GDP growth"),
    tryParse(() => fetchWorldBank("NY.GDP.PCAP.CD", "WB GDP per capita"), "WB GDP per capita"),
    tryParse(() => fetchWorldBank("GC.DOD.TOTL.GD.ZS", "WB public debt"), "WB public debt"),
    tryParse(() => fetchWorldBank("GC.NLD.TOTL.GD.ZS", "WB deficit"), "WB deficit"),
    tryParse(() => fetchWorldBank("NE.RSB.GNFS.ZS", "WB trade balance"), "WB trade balance")
  ]);
  const fxByCurrency = fxByCurrencyRaw ?? existingFxMap(existing);
  const gdpA = gdpARaw ?? existingCountryMap(existing, "gdp", "A");
  const perCapitaA = perCapitaARaw ?? existingCountryMap(existing, "gdpPerCapita", "A");
  const debtA = debtARaw ?? existingCountryMap(existing, "publicDebt", "A");
  const deficitA = deficitARaw ?? existingCountryMap(existing, "deficit", "A");
  const tradeBalWbA = tradeBalWbARaw ?? existingCountryMap(existing, "tradeBalance", "A");

  console.log("Fetching OECD data (serialized)...");

  // OECD requests are serialized with 3s gaps to respect rate limits
  const gdpQ = (await tryParse(() => fetchOecdKei(".Q.B1GQ_Q.GR..Y.GY", "GDP quarterly"), "OECD GDP Q")) ?? existingCountryMap(existing, "gdp", "Q");
  await sleep(3000);
  const industrialM = (await tryParse(() => fetchOecdKei(".M.PRVM.GR.BTE.Y.GY", "Industrial production"), "OECD Industrial")) ?? existingCountryMap(existing, "industrial", "M");
  await sleep(3000);
  const retailM = (await tryParse(() => fetchOecdKei(".M.TOVM.GR.G47.Y.GY", "Retail trade"), "OECD Retail")) ?? existingCountryMap(existing, "retail", "M");
  await sleep(3000);

  // Cat 2: Inflation
  const cpiM = (await tryParse(() => fetchOecdCpi("_T", "CPI headline"), "OECD CPI")) ?? existingCountryMap(existing, "cpi", "M");
  await sleep(3000);
  const cpiCoreM = (await tryParse(() => fetchOecdCpi("_TXCP01_NRG", "CPI core"), "OECD CPI core")) ?? existingCountryMap(existing, "cpiCore", "M");
  await sleep(3000);

  // Cat 3: Labour market
  const unemploymentM = (await tryParse(() => fetchOecdUnemployment(), "OECD Unemployment")) ?? existingCountryMap(existing, "unemployment", "M");
  await sleep(3000);
  const cciM = (await tryParse(() => fetchOecdCci(), "OECD CCI")) ?? existingCountryMap(existing, "cci", "M");
  await sleep(3000);

  // Cat 4: Long-term rates (for bond yields and risk premium)
  const longTermRatesM = (await tryParse(() => fetchOecdLongTermRates(), "OECD Long-term rates")) ?? existingCountryMap(existing, "bondYield", "M");

  console.log("Fetching FRED data...");

  // FRED monthly (small, reliable via fredgraph): Fed funds rate
  const fedFundsRaw = (await tryParse(() => fetchFredMonthly("FEDFUNDS", "FRED Fed Funds"), "FRED FEDFUNDS")) ?? existingGlobalMap(existing?.global?.fedRate?.M);

  console.log("Fetching ECB rate...");
  const ecbRateRaw = (await tryParse(() => fetchEcbRate(), "ECB MRR")) ?? existingGlobalMap(existing?.global?.ecbRate?.M);

  console.log("Fetching Yahoo Finance daily data (oil, bonds, stock indices)...");

  // Yahoo: oil, US 10y yield + all stock indices (parallel — different endpoints)
  const [brentDRaw, wtiDRaw, us10yDRaw] = await Promise.all([
    tryParse(() => fetchYahooDaily("BZ=F", "Brent crude"), "Yahoo Brent"),
    tryParse(() => fetchYahooDaily("CL=F", "WTI crude"), "Yahoo WTI"),
    tryParse(() => fetchYahooDaily("^TNX", "US 10y yield"), "Yahoo TNX")
  ]);
  const brentD = brentDRaw ?? existingGlobalMap(existing?.global?.bpiOil?.brent?.D);
  const wtiD = wtiDRaw ?? existingGlobalMap(existing?.global?.bpiOil?.wti?.D);
  const us10yD = us10yDRaw ?? existingGlobalMap(existing?.global?.us10y?.D);
  const indexMapsRaw = await Promise.all(
    INDICES.map((ix) => tryParse(() => fetchYahooDaily(ix.symbol, ix.label, 2), `Yahoo ${ix.short}`))
  );
  const indexMaps = indexMapsRaw.map((map, i) => map ?? existingGlobalMap(existing?.global?.indices?.[INDICES[i].key]?.D));

  // Limit daily data to last 5 years to keep dataset manageable
  for (const m of [brentD, wtiD, us10yD, ...indexMaps]) {
    if (m) limitDaily(m, 5);
  }

  console.log("Fetching UN Comtrade trade-by-category (serialized)...");
  const reporters = await tryParse(() => fetchComtradeReporters(), "Comtrade reporters");
  const tradeByIso3 = existingTradeMap(existing);
  if (reporters) {
    for (const iso3 of TRADE_COUNTRIES) {
      const code = reporters.get(iso3);
      if (code == null) continue;
      const trade = await fetchTradeForCountry(code).catch((err) => {
        console.warn(`WARN: Comtrade ${iso3} failed (${err.message}).`);
        return null;
      });
      if (trade) tradeByIso3.set(iso3, trade);
    }
  }
  console.log(`Comtrade: trade data for ${tradeByIso3.size}/${TRADE_COUNTRIES.length} countries.`);

  // ---------------------------------------------------------------------------
  // Compute derived metrics
  // ---------------------------------------------------------------------------

  // Prima de riesgo: spread of each country's 10y rate vs Germany, monthly
  const riskPremiumM = new Map();
  if (longTermRatesM) {
    const deuRates = longTermRatesM.get("DEU") ?? {};
    for (const [iso3, history] of longTermRatesM.entries()) {
      if (iso3 === "DEU") continue;
      const spread = {};
      for (const [period, val] of Object.entries(history)) {
        const deuVal = deuRates[period];
        if (deuVal != null) spread[period] = round2(val - deuVal);
      }
      if (Object.keys(spread).length > 0) riskPremiumM.set(iso3, spread);
    }
  }

  // Fed and ECB policy rates are stored separately as fedRate / ecbRate global metrics.
  const fedSeries = globalSeries(fedFundsRaw);
  const ecbSeries = globalSeries(ecbRateRaw);

  // FX: per-currency daily series vs USD (units of currency per 1 USD).
  const fx = {};
  if (fxByCurrency) {
    for (const [cur, history] of fxByCurrency.entries()) {
      if (Object.keys(history).length > 0) fx[cur] = history;
    }
  }

  // ---------------------------------------------------------------------------
  // Assemble country data
  // ---------------------------------------------------------------------------

  console.log("Assembling dataset...");

  const countries = [];
  for (const [iso3, meta] of metadata) {
    const series = {
      // Cat 1: Crecimiento
      gdp: { A: gdpA.get(iso3) ?? {}, Q: gdpQ?.get(iso3) ?? {} },
      gdpPerCapita: { A: perCapitaA.get(iso3) ?? {} },
      industrial: { M: industrialM?.get(iso3) ?? {} },
      retail: { M: retailM?.get(iso3) ?? {} },
      // Cat 2: Inflación
      cpi: { M: cpiM?.get(iso3) ?? {} },
      cpiCore: { M: cpiCoreM?.get(iso3) ?? {} },
      // Cat 3: Mercado laboral
      unemployment: { M: unemploymentM?.get(iso3) ?? {} },
      cci: { M: cciM?.get(iso3) ?? {} },
      // Cat 4: Política monetaria
      bondYield: { M: longTermRatesM?.get(iso3) ?? {} },
      riskPremium: { M: riskPremiumM.get(iso3) ?? {} },
      // Cat 5: Comercio
      tradeBalance: { A: tradeBalWbA.get(iso3) ?? {} },
      exchangeRate: { D: {} }, // computed at runtime from global.fx and country currency
      // Cat 6: Sostenibilidad fiscal
      publicDebt: { A: debtA.get(iso3) ?? {} },
      deficit: { A: deficitA.get(iso3) ?? {} },
      countryRisk: { M: riskPremiumM.get(iso3) ?? {} }
    };
    const hasData = Object.values(series).some((byFreq) =>
      Object.values(byFreq).some((h) => Object.keys(h).length > 0)
    );
    const trade = tradeByIso3.get(iso3) ?? null;
    if (!hasData && !trade) continue;
    countries.push({ ...meta, series, trade });
  }
  countries.sort((a, b) => a.name.localeCompare(b.name));

  // ---------------------------------------------------------------------------
  // Global series (not per-country)
  // ---------------------------------------------------------------------------

  const indices = {};
  INDICES.forEach((ix, i) => {
    indices[ix.key] = { D: globalSeries(indexMaps[i]) };
  });

  const globalIndicators = {
    bpiOil: {
      brent: { D: globalSeries(brentD) },
      wti: { D: globalSeries(wtiD) }
    },
    fedRate: { M: fedSeries },
    ecbRate: { M: ecbSeries },
    us10y: { D: globalSeries(us10yD) },
    fx,
    indices,
    tradeCategories: HS_CATEGORIES.map((c) => ({ key: c.key, label: c.label }))
  };

  // ---------------------------------------------------------------------------
  // Periods
  // ---------------------------------------------------------------------------

  const fxMaps = Object.values(fx).map((h) => new Map([["_g", h]]));
  const periods = {
    A: collectPeriods([gdpA, perCapitaA, debtA, deficitA, tradeBalWbA], "A"),
    Q: collectPeriods([gdpQ], "Q"),
    M: collectPeriods([industrialM, retailM, cpiM, cpiCoreM, unemploymentM, cciM, longTermRatesM, fedFundsRaw, ecbRateRaw], "M"),
    D: collectPeriods([brentD, wtiD, us10yD, ...indexMaps, ...fxMaps], "D")
  };

  // ---------------------------------------------------------------------------
  // Sources
  // ---------------------------------------------------------------------------

  const sources = [
    {
      name: "World Bank Open Data",
      url: "https://data.worldbank.org",
      detail: "PIB anual, PIB per capita, deuda publica %PIB, deficit %PIB, balanza comercial %PIB. Cobertura global."
    },
    {
      name: "OECD (SDMX)",
      url: "https://sdmx.oecd.org",
      detail: "PIB trimestral, produccion industrial, ventas, IPC, IPC subyacente, desempleo, confianza del consumidor, rendimiento bonos a largo plazo. Principales economias."
    },
    {
      name: "FRED (St. Louis Fed)",
      url: "https://fred.stlouisfed.org",
      detail: "Tipo de interes federal (Fed Funds). Mensual."
    },
    {
      name: "ECB Data Portal",
      url: "https://data.ecb.europa.eu",
      detail: "Tipo de interes principal BCE (MRR). Mensual."
    },
    {
      name: "Frankfurter (BCE)",
      url: "https://frankfurter.dev",
      detail: "Tipos de cambio de referencia del BCE (diarios) para el indicador de tipo de cambio por pais y la conversion de divisas."
    },
    {
      name: "UN Comtrade",
      url: "https://comtradeplus.un.org",
      detail: "Exportaciones e importaciones por categoria de producto (HS), anual. Principales economias."
    },
    {
      name: "Yahoo Finance",
      url: "https://finance.yahoo.com",
      detail: "Datos diarios: petroleo Brent/WTI, rendimiento bono 10a EE.UU. e indices bursatiles (S&P 500, Euro Stoxx 50, Nikkei, etc.)."
    },
    {
      name: "REST Countries",
      url: "https://restcountries.com",
      detail: "Metadatos de paises: nombre, codigos ISO, continente, coordenadas, moneda."
    }
  ];

  const dataset = {
    updatedAt: new Date().toISOString().slice(0, 10),
    periods,
    sources,
    countries,
    global: globalIndicators
  };

  await mkdir(dirname(OUTPUT), { recursive: true });
  await writeFile(OUTPUT, JSON.stringify(dataset));
  console.log(
    `Wrote ${countries.length} countries to ${OUTPUT}. ` +
    `Periods A:${periods.A.length} Q:${periods.Q.length} M:${periods.M.length} D:${periods.D.length}. ` +
    `Latest Q:${periods.Q.at(-1)} M:${periods.M.at(-1)} D:${periods.D.at(-1)}. ` +
    `Global keys: ${Object.keys(globalIndicators).join(", ")}.`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
