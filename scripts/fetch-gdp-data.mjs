// Multi-source ETL for the PIB dashboard.
// Sources:
//   - REST Countries (https://restcountries.com)  -> country metadata: name, ISO codes, continent, coordinates.
//   - World Bank Open Data (https://api.worldbank.org) -> GDP growth (NY.GDP.MKTP.KD.ZG) and GDP per capita (NY.GDP.PCAP.CD).
// Output: apps/web/public/data/gdp-dataset.json (consumed at runtime by the web app).

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT = resolve(__dirname, "../apps/web/public/data/gdp-dataset.json");

const START_YEAR = 2005;
const END_YEAR = new Date().getFullYear();

const CONTINENTS = ["Africa", "North America", "South America", "Asia", "Europe", "Oceania"];

const METRICS = {
  gdpGrowth: "NY.GDP.MKTP.KD.ZG",
  gdpPerCapita: "NY.GDP.PCAP.CD"
};

async function getJson(url, label) {
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`${label} failed: HTTP ${response.status}`);
  return response.json();
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

async function fetchIndicator(code) {
  const url = `https://api.worldbank.org/v2/country/all/indicator/${code}?format=json&per_page=30000&date=${START_YEAR}:${END_YEAR}`;
  const payload = await getJson(url, `World Bank ${code}`);
  const rows = Array.isArray(payload) ? payload[1] : null;
  if (!rows) throw new Error(`World Bank ${code}: unexpected payload`);
  const byIso3 = new Map();
  for (const row of rows) {
    const iso3 = row.countryiso3code;
    if (!iso3 || row.value == null) continue;
    if (!byIso3.has(iso3)) byIso3.set(iso3, {});
    byIso3.get(iso3)[row.date] = Math.round(row.value * 100) / 100;
  }
  return byIso3;
}

function latestFrom(history) {
  if (!history) return null;
  const years = Object.keys(history)
    .map(Number)
    .sort((a, b) => b - a);
  if (!years.length) return null;
  return { year: years[0], value: history[String(years[0])] };
}

async function main() {
  const [metadata, growth, perCapita] = await Promise.all([
    fetchMetadata(),
    fetchIndicator(METRICS.gdpGrowth),
    fetchIndicator(METRICS.gdpPerCapita)
  ]);

  const countries = [];
  for (const [iso3, meta] of metadata) {
    const history = {
      gdpGrowth: growth.get(iso3) ?? {},
      gdpPerCapita: perCapita.get(iso3) ?? {}
    };
    const latest = {
      gdpGrowth: latestFrom(history.gdpGrowth),
      gdpPerCapita: latestFrom(history.gdpPerCapita)
    };
    // Drop countries with no GDP data at all.
    if (!latest.gdpGrowth && !latest.gdpPerCapita) continue;
    countries.push({ ...meta, latest, history });
  }

  countries.sort((a, b) => a.name.localeCompare(b.name));

  const dataset = {
    updatedAt: new Date().toISOString().slice(0, 10),
    range: { start: START_YEAR, end: END_YEAR },
    sources: [
      {
        name: "World Bank Open Data",
        url: "https://data.worldbank.org",
        detail: "Crecimiento del PIB (NY.GDP.MKTP.KD.ZG) y PIB per capita (NY.GDP.PCAP.CD)."
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
  console.log(`Wrote ${countries.length} countries to ${OUTPUT} (updatedAt ${dataset.updatedAt}).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
