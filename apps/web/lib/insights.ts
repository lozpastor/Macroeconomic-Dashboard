// Dynamic, data-anchored insights derived from the data already loaded in the
// app. No external calls, no AI: every sentence references real numbers from the
// series currently on screen (country / indicator / period / active view).

import {
  baseCurrencies,
  fxCurrencies,
  metricConfig,
  stockIndices,
  type Frequency,
  type MetricKey,
  type TabView
} from "./demo-data";
import {
  fxRateSeries,
  type CountryRow,
  type Dataset,
  type GlobalIndicators
} from "./dataset";
import { formatMoney, formatPeriod, formatValue } from "./analytics";

export type Insight = { tag: string; text: string };

type Entry = [string, number];

function entries(series: Record<string, number> | undefined): Entry[] {
  if (!series) return [];
  return Object.entries(series)
    .filter(([, v]) => v != null && !Number.isNaN(v))
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
}

function pct(curr: number, prev: number): number | null {
  if (prev === 0 || prev == null) return null;
  return ((curr - prev) / Math.abs(prev)) * 100;
}

function fmtPct(value: number | null): string {
  if (value == null || Number.isNaN(value)) return "s/d";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

function fmtPP(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)} pp`;
}

// Period one year before the latest, matched by label where possible.
function yearAgoValue(map: Record<string, number>, latest: string, freq: Frequency): number | null {
  if (freq === "A") {
    return map[String(Number(latest) - 1)] ?? null;
  }
  if (freq === "Q") {
    const [y, q] = latest.split("-Q");
    return map[`${Number(y) - 1}-Q${q}`] ?? null;
  }
  if (freq === "M") {
    const [y, m] = latest.split("-");
    return map[`${Number(y) - 1}-${m}`] ?? null;
  }
  // Daily: closest available date <= one year earlier.
  const target = `${Number(latest.slice(0, 4)) - 1}${latest.slice(4)}`;
  let best: number | null = null;
  for (const [d, v] of entries(map)) {
    if (d <= target) best = v;
    else break;
  }
  return best;
}

function trendWord(values: number[]): { word: string; deltaPct: number | null } {
  if (values.length < 3) return { word: "estable", deltaPct: null };
  const first = values[0];
  const last = values[values.length - 1];
  const change = pct(last, first);
  if (change == null) return { word: "estable", deltaPct: null };
  if (change > 1.5) return { word: "al alza", deltaPct: change };
  if (change < -1.5) return { word: "a la baja", deltaPct: change };
  return { word: "lateral", deltaPct: change };
}

// ---------------------------------------------------------------------------
// Generic series insights (value-based metrics)
// ---------------------------------------------------------------------------

function seriesInsights(
  subject: string,
  map: Record<string, number>,
  freq: Frequency,
  metric: MetricKey
): Insight[] {
  const list = entries(map);
  if (list.length === 0) return [];
  const meta = metricConfig(metric);
  const fmt = (v: number) => formatValue(v, metric);
  const out: Insight[] = [];

  const [lastP, lastV] = list[list.length - 1];
  const lastLabel = formatPeriod(lastP, freq);

  // 1. Latest reading.
  out.push({
    tag: "Lectura actual",
    text: `${subject}: ${meta.label.toLowerCase()} se situa en ${fmt(lastV)} en ${lastLabel}.`
  });

  // 2. Change vs previous period.
  if (list.length >= 2) {
    const [prevP, prevV] = list[list.length - 2];
    const diff = lastV - prevV;
    const change =
      meta.kind === "growth" || meta.kind === "rate"
        ? fmtPP(diff)
        : meta.kind === "spread"
        ? `${diff > 0 ? "+" : ""}${diff.toFixed(0)} pb`
        : fmtPct(pct(lastV, prevV));
    const dir = diff > 0 ? "sube" : diff < 0 ? "baja" : "se mantiene";
    out.push({
      tag: "Variacion",
      text: `Respecto a ${formatPeriod(prevP, freq)} ${dir} ${change} (desde ${fmt(prevV)}).`
    });
  }

  // 3. Year-on-year (when meaningful).
  const ya = yearAgoValue(map, lastP, freq);
  if (ya != null && (meta.kind === "level" || meta.kind === "index" || meta.kind === "price")) {
    out.push({
      tag: "Interanual",
      text: `En un ano la variacion es ${fmtPct(pct(lastV, ya))} (desde ${fmt(ya)}).`
    });
  }

  // 4. Max / min over the available window.
  let maxE = list[0];
  let minE = list[0];
  for (const e of list) {
    if (e[1] > maxE[1]) maxE = e;
    if (e[1] < minE[1]) minE = e;
  }
  out.push({
    tag: "Maximos y minimos",
    text: `En el periodo disponible (${formatPeriod(list[0][0], freq)}-${lastLabel}) el maximo fue ${fmt(maxE[1])} (${formatPeriod(maxE[0], freq)}) y el minimo ${fmt(minE[1])} (${formatPeriod(minE[0], freq)}).`
  });

  // 5. Recent trend (last up-to-6 points).
  const recent = list.slice(-6).map((e) => e[1]);
  const t = trendWord(recent);
  out.push({
    tag: "Tendencia reciente",
    text: `La tendencia de los ultimos ${recent.length} periodos es ${t.word}${t.deltaPct != null ? ` (${fmtPct(t.deltaPct)} acumulado)` : ""}.`
  });

  // 6. Economic interpretation (heuristic, anchored to the latest value).
  const interp = interpret(metric, lastV, subject);
  if (interp) out.push({ tag: "Interpretacion", text: interp });

  return out;
}

function interpret(metric: MetricKey, v: number, subject: string): string | null {
  switch (metric) {
    case "gdp":
      return v >= 3
        ? `Un crecimiento del ${v.toFixed(1)}% apunta a una expansion solida de ${subject}.`
        : v > 0
        ? `Un crecimiento del ${v.toFixed(1)}% indica expansion moderada.`
        : `Una variacion del ${v.toFixed(1)}% senala contraccion de la actividad.`;
    case "cpi":
    case "cpiCore": {
      const gap = v - 2;
      return Math.abs(gap) <= 0.5
        ? `Con un ${v.toFixed(1)}% la inflacion esta cerca del objetivo del 2%.`
        : gap > 0
        ? `Un ${v.toFixed(1)}% deja la inflacion ${gap.toFixed(1)} pp por encima del objetivo del 2%.`
        : `Un ${v.toFixed(1)}% situa la inflacion por debajo del objetivo del 2%, con riesgo de debilidad de precios.`;
    }
    case "unemployment":
      return v <= 5
        ? `Un ${v.toFixed(1)}% refleja un mercado laboral tensionado (casi pleno empleo).`
        : v >= 10
        ? `Un ${v.toFixed(1)}% indica un desempleo elevado.`
        : `Un ${v.toFixed(1)}% es un desempleo intermedio.`;
    case "publicDebt":
      return v >= 100
        ? `Con ${v.toFixed(0)}% del PIB la deuda supera el tamano de la economia.`
        : v >= 60
        ? `Con ${v.toFixed(0)}% del PIB la deuda esta por encima del umbral de referencia (60%).`
        : `Con ${v.toFixed(0)}% del PIB la deuda se mantiene contenida.`;
    case "deficit":
      return v < -3
        ? `Un saldo del ${v.toFixed(1)}% del PIB supera el limite de deficit del 3%.`
        : v < 0
        ? `Un saldo del ${v.toFixed(1)}% del PIB es un deficit moderado.`
        : `Un saldo del ${v.toFixed(1)}% del PIB indica superavit fiscal.`;
    case "riskPremium":
    case "countryRisk": {
      const bps = Math.round(v);
      return bps <= 0
        ? `La prima es nula o negativa frente a Alemania (${bps} pb): riesgo percibido muy bajo.`
        : `Una prima de ${bps} pb sobre Alemania refleja el sobrecoste de financiacion frente al bono aleman.`;
    }
    case "oilBrent":
    case "oilWti":
      return `El crudo cotiza a $${v.toFixed(2)} por barril, referencia clave para costes e inflacion.`;
    case "fedRate":
    case "ecbRate":
      return `Un tipo oficial del ${v.toFixed(2)}% define una politica monetaria ${v >= 3 ? "restrictiva" : v >= 1.5 ? "neutral" : "acomodaticia"}.`;
    case "bondYield":
      return `El bono a 10 anos rinde ${v.toFixed(2)}%, coste de referencia de la deuda a largo plazo.`;
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Trade insights (values + categories + quarterly evolution)
// ---------------------------------------------------------------------------

function tradeInsights(
  target: CountryRow | null,
  flow: "total" | "exports" | "imports",
  baseCurrency: string,
  global: GlobalIndicators,
  factor: number
): Insight[] {
  if (!target?.trade) return [{ tag: "Comercio", text: "Selecciona un pais con datos de comercio para ver el analisis." }];
  const t = target.trade;
  const cats = global.tradeCategories ?? [];
  const catLabel = (k: string) => cats.find((c) => c.key === k)?.label ?? k;
  const money = (usd: number) => formatMoney(usd * factor, baseCurrency);
  const out: Insight[] = [];
  const flowWord = flow === "exports" ? "exportaciones" : flow === "imports" ? "importaciones" : "balanza comercial";

  // 1. Headline values (annual).
  const balance = t.exports.total - t.imports.total;
  if (flow === "total") {
    out.push({
      tag: "Balanza",
      text: `${target.name} (${t.year}): exporto ${money(t.exports.total)} e importo ${money(t.imports.total)}, ${balance >= 0 ? "superavit" : "deficit"} de ${money(Math.abs(balance))}.`
    });
  } else {
    const fl = flow === "exports" ? t.exports : t.imports;
    out.push({
      tag: flow === "exports" ? "Exportaciones" : "Importaciones",
      text: `${target.name} registro ${money(fl.total)} en ${flowWord} en ${t.year}.`
    });
  }

  // 2. Top categories of the active flow.
  const flowForCats = flow === "imports" ? t.imports : t.exports;
  const ranked = Object.entries(flowForCats.categories)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);
  if (ranked.length) {
    const top = ranked[0];
    const share = (top[1] / flowForCats.total) * 100;
    const second = ranked[1];
    out.push({
      tag: "Principal categoria",
      text: `La principal partida de ${flow === "imports" ? "importacion" : "exportacion"} es ${catLabel(top[0])} con ${money(top[1])} (${share.toFixed(0)}% del total)${second ? `, seguida de ${catLabel(second[0])} (${money(second[1])})` : ""}.`
    });
    if (ranked.length > 2) {
      const top3 = ranked.slice(0, 3).reduce((s, [, v]) => s + v, 0);
      out.push({
        tag: "Concentracion",
        text: `Las tres mayores categorias concentran el ${((top3 / flowForCats.total) * 100).toFixed(0)}% de las ${flow === "imports" ? "importaciones" : "exportaciones"}.`
      });
    }
  }

  // 3. Quarterly evolution (when available).
  const q = t.quarters ?? [];
  if (q.length >= 2) {
    const last = q[q.length - 1];
    const prev = q[q.length - 2];
    const pick = (x: typeof last) => (flow === "imports" ? x.imports : flow === "exports" ? x.exports : x.exports - x.imports);
    const lastV = pick(last);
    const prevV = pick(prev);
    out.push({
      tag: "Ultimo trimestre",
      text: `En ${formatPeriod(last.period, "Q")} las ${flow === "total" ? "cuentas comerciales arrojan" : flowWord + " sumaron"} ${flow === "total" ? (lastV >= 0 ? "superavit" : "deficit") + " de " + money(Math.abs(lastV)) : money(lastV)}, ${pct(Math.abs(lastV), Math.abs(prevV)) != null ? `${fmtPct(pct(Math.abs(lastV), Math.abs(prevV)))} frente a ${formatPeriod(prev.period, "Q")}` : "sin comparativa previa"}.`
    });
    // Year-on-year quarter.
    const yaQ = q.find((x) => {
      const [y, qq] = last.period.split("-Q");
      return x.period === `${Number(y) - 1}-Q${qq}`;
    });
    if (yaQ) {
      const yaV = pick(yaQ);
      out.push({
        tag: "Interanual (trim.)",
        text: `Respecto al mismo trimestre de un ano antes (${formatPeriod(yaQ.period, "Q")}), la variacion es ${flow === "total" ? money(lastV - yaV) : fmtPct(pct(lastV, yaV))}.`
      });
    }
    // Recent quarterly trend.
    const recent = q.slice(-4).map(pick);
    const tr = trendWord(recent.map(Math.abs));
    out.push({
      tag: "Tendencia trimestral",
      text: `En los ultimos ${recent.length} trimestres la ${flowWord} sigue una trayectoria ${tr.word}.`
    });
  }

  return out;
}

// ---------------------------------------------------------------------------
// FX & indices insights (movers)
// ---------------------------------------------------------------------------

function changeOf(values: Array<number | null>): number | null {
  const clean = values.filter((v): v is number => v != null);
  if (clean.length < 2) return null;
  return pct(clean[clean.length - 1], clean[0]);
}

function fxInsights(global: GlobalIndicators, baseCurrency: string): Insight[] {
  const baseLabel = baseCurrencies.find((b) => b.code === baseCurrency)?.label ?? baseCurrency;
  const movers = fxCurrencies
    .filter((c) => c.code !== baseCurrency && global.fx?.[c.code])
    .map((c) => {
      const s = fxRateSeries(global, c.code, baseCurrency);
      const dates = Object.keys(s).sort();
      const win = dates.slice(-22).map((d) => s[d]);
      return { code: c.code, label: c.label, change: changeOf(win), latest: win[win.length - 1] };
    })
    .filter((m) => m.change != null);
  if (!movers.length) return [];
  const sorted = [...movers].sort((a, b) => (b.change ?? 0) - (a.change ?? 0));
  const up = sorted[0];
  const down = sorted[sorted.length - 1];
  return [
    { tag: "Moneda base", text: `Todas las cotizaciones se expresan frente a ${baseLabel} (${baseCurrency}). Variacion del ultimo mes.` },
    { tag: "Mayor apreciacion", text: `${up.code}/${baseCurrency} es la que mas sube en el mes: ${fmtPct(up.change)}.` },
    { tag: "Mayor depreciacion", text: `${down.code}/${baseCurrency} es la que mas baja: ${fmtPct(down.change)}.` },
    {
      tag: "Resumen",
      text: `De ${movers.length} divisas, ${movers.filter((m) => (m.change ?? 0) > 0).length} se aprecian y ${movers.filter((m) => (m.change ?? 0) < 0).length} se deprecian frente a ${baseCurrency}.`
    }
  ];
}

function indicesInsights(global: GlobalIndicators): Insight[] {
  const movers = stockIndices
    .filter((ix) => global.indices?.[ix.key]?.D)
    .map((ix) => {
      const s = global.indices[ix.key].D;
      const dates = Object.keys(s).sort();
      const win = dates.slice(-22).map((d) => s[d]);
      return { short: ix.short, change: changeOf(win) };
    })
    .filter((m) => m.change != null);
  if (!movers.length) return [];
  const sorted = [...movers].sort((a, b) => (b.change ?? 0) - (a.change ?? 0));
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];
  const positives = movers.filter((m) => (m.change ?? 0) > 0).length;
  return [
    { tag: "Mejor indice", text: `En el ultimo mes ${best.short} lidera con ${fmtPct(best.change)}.` },
    { tag: "Peor indice", text: `${worst.short} es el mas rezagado: ${fmtPct(worst.change)}.` },
    { tag: "Amplitud", text: `${positives} de ${movers.length} indices suben en el mes; el resto cae o se mantiene.` }
  ];
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export function buildInsights(params: {
  data: Dataset;
  view: TabView | undefined;
  isGlobal: boolean;
  metric: MetricKey;
  freq: Frequency;
  subject: CountryRow | null;
  scopeLabel: string;
  baseCurrency: string;
  tradeFlow: "total" | "exports" | "imports";
  tradeTarget: CountryRow | null;
  tradeFactor: number;
}): Insight[] {
  const { data, view, isGlobal, metric, freq, subject, baseCurrency, tradeFlow, tradeTarget, tradeFactor } = params;

  if (view === "fx") return fxInsights(data.global, baseCurrency);
  if (view === "indices") return indicesInsights(data.global);
  if (view === "trade") return tradeInsights(tradeTarget, tradeFlow, baseCurrency, data.global, tradeFactor);

  if (isGlobal) {
    const meta = metricConfig(metric);
    const gKey = meta.globalKeys?.[0];
    if (!gKey) return [];
    const parts = gKey.split(".");
    let obj: unknown = data.global;
    for (const p of parts) obj = (obj as Record<string, unknown> | undefined)?.[p];
    const map = ((obj as Record<string, Record<string, number>> | undefined)?.[freq]) ?? {};
    return seriesInsights(meta.label, map, freq, metric);
  }

  if (!subject) return [{ tag: "Seleccion", text: "Selecciona un pais en la lista o el mapa para ver insights especificos." }];
  const map = subject.series[metric]?.[freq] ?? {};
  if (entries(map).length === 0) {
    return [{ tag: "Sin datos", text: `No hay datos de ${metricConfig(metric).label.toLowerCase()} para ${subject.name} en frecuencia ${freq}.` }];
  }
  return seriesInsights(subject.name, map, freq, metric);
}
