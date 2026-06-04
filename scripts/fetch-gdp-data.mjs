// Multi-source ETL for the macro dashboard (all 6 categories).
// Sources:
//   - REST Countries  -> country metadata (name, ISO codes, continent, coordinates).
//   - World Bank      -> annual GDP growth, GDP per capita, public debt %GDP, deficit %GDP, trade balance %GDP.
//   - OECD SDMX       -> quarterly/monthly: GDP, industrial production, retail, CPI, core CPI,
//                        unemployment, consumer confidence, long-term interest rates, trade balance.
//   - FRED (fredgraph) -> monthly: US non-farm payrolls, Fed funds rate.
//   - ECB Data Portal -> daily: ECB main refinancing rate.
//   - Yahoo Finance   -> daily: Brent, WTI, S&P500, Euro Stoxx 50, EUR/USD, US 10y yield.
// Output: apps/web/public/data/gdp-dataset.json

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT = resolve(__dirname, "../apps/web/public/data/gdp-dataset.json");

const START_YEAR = 2005;
const END_YEAR = new Date().getFullYear();
const CONTINENTS = ["Africa", "North America", "South America", "Asia", "Europe", "Oceania"];

const round2 = (v) => Math.round(v * 100) / 100;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

// ---------------------------------------------------------------------------
// REST Countries (metadata)
// ---------------------------------------------------------------------------

async function fetchMetadata() {
  const data = await getJson(
    "https://restcountries.com/v3.1/all?fields=name,cca2,cca3,latlng,continents,region",
    "REST Countries"
  );
  const byIso3 = new Map();
  for (const c of data) {
    const iso3 = c.cca3;
    const iso2 = c.cca2;
    const continent = c.continents?.[0];
    if (!iso3 || !iso2 || !continent || !CONTINENTS.includes(continent)) continue;
    const [lat, lng] = c.latlng ?? [];
    byIso3.set(iso3, {
      iso3,
      iso2,
      name: c.name?.common ?? iso3,
      continent,
      region: c.region ?? continent,
      center: Number.isFinite(lng) && Number.isFinite(lat) ? [lng, lat] : null
    });
  }
  return byIso3;
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
  console.log("Fetching metadata + World Bank...");

  // Parallel: metadata + all World Bank indicators
  const [metadata, gdpA, perCapitaA, debtA, deficitA, tradeBalWbA] = await Promise.all([
    fetchMetadata(),
    fetchWorldBank("NY.GDP.MKTP.KD.ZG", "WB GDP growth"),
    fetchWorldBank("NY.GDP.PCAP.CD", "WB GDP per capita"),
    fetchWorldBank("GC.DOD.TOTL.GD.ZS", "WB public debt"),
    fetchWorldBank("GC.NLD.TOTL.GD.ZS", "WB deficit"),
    fetchWorldBank("NE.RSB.GNFS.ZS", "WB trade balance")
  ]);

  console.log("Fetching OECD data (serialized)...");

  // OECD requests are serialized with 3s gaps to respect rate limits
  const gdpQ = await tryParse(() => fetchOecdKei(".Q.B1GQ_Q.GR..Y.GY", "GDP quarterly"), "OECD GDP Q");
  await sleep(3000);
  const industrialM = await tryParse(() => fetchOecdKei(".M.PRVM.GR.BTE.Y.GY", "Industrial production"), "OECD Industrial");
  await sleep(3000);
  const retailM = await tryParse(() => fetchOecdKei(".M.TOVM.GR.G47.Y.GY", "Retail trade"), "OECD Retail");
  await sleep(3000);

  // Cat 2: Inflation
  const cpiM = await tryParse(() => fetchOecdCpi("_T", "CPI headline"), "OECD CPI");
  await sleep(3000);
  const cpiCoreM = await tryParse(() => fetchOecdCpi("_TXCP01_NRG", "CPI core"), "OECD CPI core");
  await sleep(3000);

  // Cat 3: Labour market
  const unemploymentM = await tryParse(() => fetchOecdUnemployment(), "OECD Unemployment");
  await sleep(3000);
  const cciM = await tryParse(() => fetchOecdCci(), "OECD CCI");
  await sleep(3000);

  // Cat 4: Long-term rates (for bond yields and risk premium)
  const longTermRatesM = await tryParse(() => fetchOecdLongTermRates(), "OECD Long-term rates");

  console.log("Fetching FRED data...");

  // FRED monthly (small, reliable via fredgraph): US non-farm payrolls, Fed funds rate
  const [payrollsRaw, fedFundsRaw] = await Promise.all([
    tryParse(() => fetchFredMonthly("PAYEMS", "FRED Payrolls"), "FRED PAYEMS"),
    tryParse(() => fetchFredMonthly("FEDFUNDS", "FRED Fed Funds"), "FRED FEDFUNDS")
  ]);

  console.log("Fetching ECB rate...");
  const ecbRateRaw = await tryParse(() => fetchEcbRate(), "ECB MRR");

  console.log("Fetching Yahoo Finance daily data...");

  // Yahoo: daily market data (parallel — different endpoints)
  const [brentD, wtiD, sp500D, stoxxD, eurusdD, us10yD] = await Promise.all([
    tryParse(() => fetchYahooDaily("BZ=F", "Brent crude"), "Yahoo Brent"),
    tryParse(() => fetchYahooDaily("CL=F", "WTI crude"), "Yahoo WTI"),
    tryParse(() => fetchYahooDaily("^GSPC", "S&P 500"), "Yahoo S&P500"),
    tryParse(() => fetchYahooDaily("^STOXX50E", "Euro Stoxx 50"), "Yahoo STOXX50"),
    tryParse(() => fetchYahooDaily("EURUSD=X", "EUR/USD", 4), "Yahoo EURUSD"),
    tryParse(() => fetchYahooDaily("^TNX", "US 10y yield"), "Yahoo TNX")
  ]);

  // Limit daily data to last 5 years to keep dataset manageable
  for (const m of [brentD, wtiD, sp500D, stoxxD, eurusdD, us10yD]) {
    if (m) limitDaily(m, 5);
  }

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

  // Payrolls: compute monthly change (thousands)
  const payrollsChangeSeries = {};
  const payrollsData = globalSeries(payrollsRaw);
  const payrollPeriods = Object.keys(payrollsData).sort();
  for (let i = 1; i < payrollPeriods.length; i++) {
    const curr = payrollsData[payrollPeriods[i]];
    const prev = payrollsData[payrollPeriods[i - 1]];
    if (curr != null && prev != null) {
      payrollsChangeSeries[payrollPeriods[i]] = round2(curr - prev);
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
      // Cat 6: Sostenibilidad fiscal
      publicDebt: { A: debtA.get(iso3) ?? {} },
      deficit: { A: deficitA.get(iso3) ?? {} },
      countryRisk: { M: riskPremiumM.get(iso3) ?? {} }
    };
    const hasData = Object.values(series).some((byFreq) =>
      Object.values(byFreq).some((h) => Object.keys(h).length > 0)
    );
    if (!hasData) continue;
    countries.push({ ...meta, series });
  }
  countries.sort((a, b) => a.name.localeCompare(b.name));

  // ---------------------------------------------------------------------------
  // Global series (not per-country)
  // ---------------------------------------------------------------------------

  const globalIndicators = {
    bpiOil: {
      brent: { D: globalSeries(brentD) },
      wti: { D: globalSeries(wtiD) }
    },
    payrolls: { M: payrollsChangeSeries },
    fedRate: { M: fedSeries },
    ecbRate: { M: ecbSeries },
    us10y: { D: globalSeries(us10yD) },
    eurusd: { D: globalSeries(eurusdD) },
    sp500: { D: globalSeries(sp500D) },
    stoxx50: { D: globalSeries(stoxxD) }
  };

  // ---------------------------------------------------------------------------
  // Periods
  // ---------------------------------------------------------------------------

  const periods = {
    A: collectPeriods([gdpA, perCapitaA, debtA, deficitA, tradeBalWbA], "A"),
    Q: collectPeriods([gdpQ], "Q"),
    M: collectPeriods([industrialM, retailM, cpiM, cpiCoreM, unemploymentM, cciM, longTermRatesM, payrollsRaw, fedFundsRaw, ecbRateRaw], "M"),
    D: collectPeriods([brentD, wtiD, sp500D, stoxxD, eurusdD, us10yD], "D")
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
      detail: "Nominas no agricolas EE.UU., tipo de interes federal (Fed Funds). Mensual."
    },
    {
      name: "ECB Data Portal",
      url: "https://data.ecb.europa.eu",
      detail: "Tipo de interes principal BCE (MRR). Mensual."
    },
    {
      name: "Yahoo Finance",
      url: "https://finance.yahoo.com",
      detail: "Datos diarios: petroleo Brent/WTI, S&P 500, Euro Stoxx 50, EUR/USD, rendimiento bono 10a EE.UU."
    },
    {
      name: "REST Countries",
      url: "https://restcountries.com",
      detail: "Metadatos de paises: nombre, codigos ISO, continente, coordenadas."
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
