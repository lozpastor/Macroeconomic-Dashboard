// Multi-source ETL for the macro dashboard (Categoria 1: Crecimiento).
// Sources:
//   - REST Countries (https://restcountries.com)            -> country metadata: name, ISO codes, continent, coordinates.
//   - World Bank Open Data (https://api.worldbank.org)        -> annual GDP growth + GDP per capita (global coverage).
//   - OECD SDMX (https://sdmx.oecd.org)                       -> quarterly GDP growth, monthly industrial production
//                                                               and retail trade growth (major economies, recent + high frequency).
// Output: apps/web/public/data/gdp-dataset.json (consumed at runtime by the web app).

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT = resolve(__dirname, "../apps/web/public/data/gdp-dataset.json");

const START_YEAR = 2005;
const END_YEAR = new Date().getFullYear();

const CONTINENTS = ["Africa", "North America", "South America", "Asia", "Europe", "Oceania"];

const WB = {
  gdp: "NY.GDP.MKTP.KD.ZG",
  gdpPerCapita: "NY.GDP.PCAP.CD"
};

const OECD_BASE = "https://sdmx.oecd.org/public/rest/data/OECD.SDD.STES,DSD_KEI@DF_KEI,";

// SDMX keys: REF_AREA.FREQ.MEASURE.UNIT_MEASURE.ACTIVITY.ADJUSTMENT.TRANSFORMATION (Y = seasonally+calendar adjusted, GY = growth over 1 year).
const OECD_SERIES = {
  gdpQuarterly: { key: ".Q.B1GQ_Q.GR..Y.GY", freq: "Q" },
  industrial: { key: ".M.PRVM.GR.BTE.Y.GY", freq: "M" },
  retail: { key: ".M.TOVM.GR.G47.Y.GY", freq: "M" }
};

function round2(value) {
  return Math.round(value * 100) / 100;
}

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

async function getJson(url, label, headers) {
  let lastError;
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    try {
      const response = await fetch(url, { headers: { Accept: "application/json", ...headers } });
      if (!response.ok) throw new Error(`${label} failed: HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt < 6) await sleep(attempt * 4000);
    }
  }
  throw lastError;
}

async function fetchMetadata() {
  const data = await getJson(
    "https://restcountries.com/v3.1/all?fields=name,cca2,cca3,latlng,continents,region",
    "REST Countries"
  );
  const byIso3 = new Map();
  for (const country of data) {
    const iso3 = country.cca3;
    const iso2 = country.cca2;
    const continent = country.continents?.[0];
    if (!iso3 || !iso2 || !continent || !CONTINENTS.includes(continent)) continue;
    const [lat, lng] = country.latlng ?? [];
    byIso3.set(iso3, {
      iso3,
      iso2,
      name: country.name?.common ?? iso3,
      continent,
      region: country.region ?? continent,
      center: Number.isFinite(lng) && Number.isFinite(lat) ? [lng, lat] : null
    });
  }
  return byIso3;
}

async function fetchWorldBank(code) {
  const url = `https://api.worldbank.org/v2/country/all/indicator/${code}?format=json&per_page=30000&date=${START_YEAR}:${END_YEAR}`;
  const payload = await getJson(url, `World Bank ${code}`);
  const rows = Array.isArray(payload) ? payload[1] : null;
  if (!rows) throw new Error(`World Bank ${code}: unexpected payload`);
  const byIso3 = new Map();
  for (const row of rows) {
    const iso3 = row.countryiso3code;
    if (!iso3 || row.value == null) continue;
    if (!byIso3.has(iso3)) byIso3.set(iso3, {});
    byIso3.get(iso3)[row.date] = round2(row.value);
  }
  return byIso3;
}

// Parses an SDMX-JSON (dimensionAtObservation=AllDimensions) payload into Map(iso3 -> {period: value}).
async function fetchOecd(spec, label) {
  const url = `${OECD_BASE}/${spec.key}?startPeriod=${START_YEAR}-01&dimensionAtObservation=AllDimensions`;
  const payload = await getJson(url, `OECD ${label}`, {
    Accept: "application/vnd.sdmx.data+json; charset=utf-8",
    // Without an explicit language tag the OECD endpoint intermittently 500s ("languageTag1") on reused connections.
    "Accept-Language": "en"
  });
  const structure = payload.data?.structures?.[0];
  const dataset = payload.data?.dataSets?.[0];
  if (!structure || !dataset) throw new Error(`OECD ${label}: unexpected payload`);
  const dims = structure.dimensions.observation;
  const ids = dims.map((dim) => dim.id);
  const values = dims.map((dim) => dim.values);
  const areaPos = ids.indexOf("REF_AREA");
  const timePos = ids.indexOf("TIME_PERIOD");
  const byIso3 = new Map();
  for (const [encodedKey, observation] of Object.entries(dataset.observations ?? {})) {
    const indices = encodedKey.split(":").map(Number);
    const iso3 = values[areaPos][indices[areaPos]]?.id;
    const period = values[timePos][indices[timePos]]?.id;
    const value = observation?.[0];
    if (!iso3 || !period || value == null) continue;
    if (!byIso3.has(iso3)) byIso3.set(iso3, {});
    byIso3.get(iso3)[period] = round2(value);
  }
  return byIso3;
}

function periodSorter(freq) {
  if (freq === "A") return (a, b) => Number(a) - Number(b);
  if (freq === "Q")
    return (a, b) => {
      const [ay, aq] = a.split("-Q").map(Number);
      const [by, bq] = b.split("-Q").map(Number);
      return ay - by || aq - bq;
    };
  return (a, b) => {
    const [ay, am] = a.split("-").map(Number);
    const [by, bm] = b.split("-").map(Number);
    return ay - by || am - bm;
  };
}

function collectPeriods(maps, freq) {
  const set = new Set();
  for (const map of maps) {
    for (const history of map.values()) {
      for (const period of Object.keys(history)) set.add(period);
    }
  }
  return [...set].sort(periodSorter(freq));
}

async function main() {
  const [metadata, gdpA, perCapitaA] = await Promise.all([
    fetchMetadata(),
    fetchWorldBank(WB.gdp),
    fetchWorldBank(WB.gdpPerCapita)
  ]);
  // OECD requests are serialized + spaced out to stay within the public API rate limits.
  const gdpQ = await fetchOecd(OECD_SERIES.gdpQuarterly, "GDP quarterly");
  await sleep(3000);
  const industrialM = await fetchOecd(OECD_SERIES.industrial, "Industrial production");
  await sleep(3000);
  const retailM = await fetchOecd(OECD_SERIES.retail, "Retail trade");

  const countries = [];
  for (const [iso3, meta] of metadata) {
    const series = {
      gdp: { A: gdpA.get(iso3) ?? {}, Q: gdpQ.get(iso3) ?? {} },
      gdpPerCapita: { A: perCapitaA.get(iso3) ?? {} },
      industrial: { M: industrialM.get(iso3) ?? {} },
      retail: { M: retailM.get(iso3) ?? {} }
    };
    const hasData = Object.values(series).some((byFreq) =>
      Object.values(byFreq).some((history) => Object.keys(history).length > 0)
    );
    if (!hasData) continue;
    countries.push({ ...meta, series });
  }

  countries.sort((a, b) => a.name.localeCompare(b.name));

  const periods = {
    A: collectPeriods([gdpA, perCapitaA], "A"),
    Q: collectPeriods([gdpQ], "Q"),
    M: collectPeriods([industrialM, retailM], "M")
  };

  const dataset = {
    updatedAt: new Date().toISOString().slice(0, 10),
    periods,
    sources: [
      {
        name: "World Bank Open Data",
        url: "https://data.worldbank.org",
        detail: "PIB anual: crecimiento (NY.GDP.MKTP.KD.ZG) y per capita (NY.GDP.PCAP.CD). Cobertura global."
      },
      {
        name: "OECD (SDMX)",
        url: "https://sdmx.oecd.org",
        detail:
          "Indicadores recientes y de alta frecuencia: PIB trimestral, produccion industrial y ventas al por menor (variacion interanual). Principales economias."
      },
      {
        name: "REST Countries",
        url: "https://restcountries.com",
        detail: "Metadatos de paises: nombre, codigos ISO, continente y coordenadas."
      }
    ],
    countries
  };

  await mkdir(dirname(OUTPUT), { recursive: true });
  await writeFile(OUTPUT, JSON.stringify(dataset));
  console.log(
    `Wrote ${countries.length} countries to ${OUTPUT} (updatedAt ${dataset.updatedAt}). ` +
      `Periods A:${periods.A.length} Q:${periods.Q.length} M:${periods.M.length}. ` +
      `Latest Q:${periods.Q.at(-1)} M:${periods.M.at(-1)}.`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
