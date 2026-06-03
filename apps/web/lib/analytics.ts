import { countries, type IndicatorKey } from "./demo-data";

export function summaryStats(indicator: IndicatorKey) {
  const values = countries.map((country) => country.latest[indicator]).filter(Number.isFinite);
  const sorted = [...values].sort((a, b) => a - b);
  const total = values.reduce((sum, value) => sum + value, 0);
  const maxCountry = countries.reduce((best, country) => (country.latest[indicator] > best.latest[indicator] ? country : best), countries[0]);
  const minCountry = countries.reduce((best, country) => (country.latest[indicator] < best.latest[indicator] ? country : best), countries[0]);

  return {
    mean: total / values.length,
    median: sorted.length % 2 ? sorted[(sorted.length - 1) / 2] : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2,
    max: maxCountry.latest[indicator],
    min: minCountry.latest[indicator],
    top: maxCountry.name,
    bottom: minCountry.name
  };
}

export function generateInsights() {
  const latin = countries.filter((country) => country.region === "Latin America");
  const highestInflation = latin.reduce((best, country) => (country.latest.inflation > best.latest.inflation ? country : best), latin[0]);
  const india = countries.find((country) => country.iso3 === "IND");
  const china = countries.find((country) => country.iso3 === "CHN");
  const asia = countries.filter((country) => country.region.includes("Asia"));
  const asiaGrowth = asia.reduce((sum, country) => sum + country.latest.gdpGrowth, 0) / asia.length;

  return [
    `${highestInflation.name} presenta la inflacion mas elevada de America Latina en el ultimo dato disponible.`,
    india ? `${india.name} mantiene una trayectoria de expansion superior al 7% en el ultimo ejercicio demo.` : "",
    china ? `${china.name} supera la media asiatica de crecimiento en ${Math.round(((china.latest.gdpGrowth / asiaGrowth) - 1) * 100)}%.` : "",
    "Las economias con mayor deuda publica muestran una dispersion elevada de crecimiento, senal de sensibilidad al ciclo monetario.",
    "La cuota renovable de Brasil se situa claramente por encima del grupo G20 incluido en la muestra demo."
  ].filter(Boolean);
}

export function linearRegression(points: Array<{ x: number; y: number }>) {
  const n = points.length;
  const sx = points.reduce((sum, point) => sum + point.x, 0);
  const sy = points.reduce((sum, point) => sum + point.y, 0);
  const sxy = points.reduce((sum, point) => sum + point.x * point.y, 0);
  const sx2 = points.reduce((sum, point) => sum + point.x * point.x, 0);
  const slope = (n * sxy - sx * sy) / (n * sx2 - sx * sx);
  const intercept = (sy - slope * sx) / n;
  return { slope, intercept };
}

export function formatValue(value: number, unit = "") {
  const compact = Math.abs(value) >= 1000 ? new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value) : value.toFixed(1);
  return `${compact}${unit.startsWith("%") ? "%" : unit ? ` ${unit}` : ""}`;
}
