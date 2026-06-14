// Dynamic, data-anchored insights derived from the data already loaded in the
// app. No external calls, no AI: every sentence references real numbers from the
// series currently on screen (country / indicator / period / active view).
// Localised to the active language (ES / EN / ZH) via the module-level lang.

import {
  fxCurrencies,
  metricConfig,
  stockIndices,
  type Frequency,
  type MetricKey,
  type TabView
} from "./demo-data";
import {
  fxRateSeries,
  tradeRecAt,
  valueAt,
  type CountryRow,
  type Dataset,
  type GlobalIndicators
} from "./dataset";
import { formatMoney, formatPeriod, formatValue } from "./analytics";
import { createT, getLang, noData, type Lang } from "./i18n";

export type Insight = { tag: string; text: string };

type Entry = [string, number];
type DirKey = "up" | "down" | "same";
type TrendKey = "stable" | "up" | "down" | "flat";

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
  if (value == null || Number.isNaN(value)) return noData();
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

function ppUnit(lang: Lang): string {
  return lang === "zh" ? " 个百分点" : " pp";
}
function bpsUnit(lang: Lang): string {
  return lang === "zh" ? " 个基点" : lang === "en" ? " bps" : " pb";
}

function fmtPP(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}${ppUnit(getLang())}`;
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

function trendWord(values: number[]): { key: TrendKey; deltaPct: number | null } {
  if (values.length < 3) return { key: "stable", deltaPct: null };
  const first = values[0];
  const last = values[values.length - 1];
  const change = pct(last, first);
  if (change == null) return { key: "stable", deltaPct: null };
  if (change > 1.5) return { key: "up", deltaPct: change };
  if (change < -1.5) return { key: "down", deltaPct: change };
  return { key: "flat", deltaPct: change };
}

// ---------------------------------------------------------------------------
// Localised words & tags
// ---------------------------------------------------------------------------

const TRENDS: Record<Lang, Record<TrendKey, string>> = {
  es: { stable: "estable", up: "al alza", down: "a la baja", flat: "lateral" },
  en: { stable: "stable", up: "rising", down: "falling", flat: "sideways" },
  zh: { stable: "稳定", up: "上行", down: "下行", flat: "横盘" }
};

const DIR: Record<Lang, Record<DirKey, string>> = {
  es: { up: "sube", down: "baja", same: "se mantiene" },
  en: { up: "rises", down: "falls", same: "holds" },
  zh: { up: "上升", down: "下降", same: "持平" }
};

const TAG: Record<Lang, Record<string, string>> = {
  es: {
    current: "Lectura actual", change: "Variacion", yoy: "Interanual", maxmin: "Maximos y minimos",
    trend: "Tendencia reciente", interp: "Interpretacion", trade: "Comercio", balance: "Balanza",
    exports: "Exportaciones", imports: "Importaciones", topCat: "Principal categoria",
    concentration: "Concentracion", lastQuarter: "Ultimo trimestre", yoyQ: "Interanual (trim.)",
    quarterTrend: "Tendencia trimestral", baseCurrency: "Moneda base", topGain: "Mayor apreciacion",
    topLoss: "Mayor depreciacion", summary: "Resumen", bestIndex: "Mejor indice", worstIndex: "Peor indice",
    breadth: "Amplitud", comparison: "Comparativa", difference: "Diferencia", groupAvg: "Media del grupo",
    ranking: "Ranking", selection: "Seleccion", noData: "Sin datos"
  },
  en: {
    current: "Latest reading", change: "Change", yoy: "Year-on-year", maxmin: "Highs and lows",
    trend: "Recent trend", interp: "Interpretation", trade: "Trade", balance: "Balance",
    exports: "Exports", imports: "Imports", topCat: "Top category",
    concentration: "Concentration", lastQuarter: "Latest quarter", yoyQ: "Year-on-year (qtr.)",
    quarterTrend: "Quarterly trend", baseCurrency: "Base currency", topGain: "Top gainer",
    topLoss: "Top loser", summary: "Summary", bestIndex: "Best index", worstIndex: "Worst index",
    breadth: "Breadth", comparison: "Comparison", difference: "Difference", groupAvg: "Group average",
    ranking: "Ranking", selection: "Selection", noData: "No data"
  },
  zh: {
    current: "最新读数", change: "环比变化", yoy: "同比", maxmin: "最高与最低",
    trend: "近期趋势", interp: "经济解读", trade: "贸易", balance: "贸易差额",
    exports: "出口", imports: "进口", topCat: "主要类别",
    concentration: "集中度", lastQuarter: "最新季度", yoyQ: "同比（季度）",
    quarterTrend: "季度趋势", baseCurrency: "基准货币", topGain: "升值最多",
    topLoss: "贬值最多", summary: "概览", bestIndex: "最佳指数", worstIndex: "最差指数",
    breadth: "广度", comparison: "对比", difference: "差距", groupAvg: "组内均值",
    ranking: "排名", selection: "选择", noData: "无数据"
  }
};

function flowWordOf(flow: "total" | "exports" | "imports", lang: Lang): string {
  if (flow === "exports") return lang === "en" ? "exports" : lang === "zh" ? "出口" : "exportaciones";
  if (flow === "imports") return lang === "en" ? "imports" : lang === "zh" ? "进口" : "importaciones";
  return lang === "en" ? "trade balance" : lang === "zh" ? "贸易差额" : "balanza comercial";
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
  const lang = getLang();
  const tr = createT(lang);
  const tag = TAG[lang];
  const list = entries(map);
  if (list.length === 0) return [];
  const meta = metricConfig(metric);
  const mlabel = tr.mLabel(metric);
  const fmt = (v: number) => formatValue(v, metric);
  const out: Insight[] = [];

  const [lastP, lastV] = list[list.length - 1];
  const lastLabel = formatPeriod(lastP, freq);

  // 1. Latest reading.
  out.push({
    tag: tag.current,
    text:
      lang === "en"
        ? `${subject}: ${mlabel} stands at ${fmt(lastV)} in ${lastLabel}.`
        : lang === "zh"
        ? `${subject}：${mlabel}在${lastLabel}为${fmt(lastV)}。`
        : `${subject}: ${mlabel.toLowerCase()} se situa en ${fmt(lastV)} en ${lastLabel}.`
  });

  // 2. Change vs previous period.
  if (list.length >= 2) {
    const [prevP, prevV] = list[list.length - 2];
    const diff = lastV - prevV;
    const change =
      meta.kind === "growth" || meta.kind === "rate"
        ? fmtPP(diff)
        : meta.kind === "spread"
        ? `${diff > 0 ? "+" : ""}${diff.toFixed(0)}${bpsUnit(lang)}`
        : fmtPct(pct(lastV, prevV));
    const dirKey: DirKey = diff > 0 ? "up" : diff < 0 ? "down" : "same";
    const dir = DIR[lang][dirKey];
    const prevLabel = formatPeriod(prevP, freq);
    out.push({
      tag: tag.change,
      text:
        lang === "en"
          ? `Versus ${prevLabel} it ${dir} ${change} (from ${fmt(prevV)}).`
          : lang === "zh"
          ? `相比${prevLabel}${dir}${change}（自${fmt(prevV)}）。`
          : `Respecto a ${prevLabel} ${dir} ${change} (desde ${fmt(prevV)}).`
    });
  }

  // 3. Year-on-year (when meaningful).
  const ya = yearAgoValue(map, lastP, freq);
  if (ya != null && (meta.kind === "level" || meta.kind === "index" || meta.kind === "price")) {
    out.push({
      tag: tag.yoy,
      text:
        lang === "en"
          ? `Over a year the change is ${fmtPct(pct(lastV, ya))} (from ${fmt(ya)}).`
          : lang === "zh"
          ? `一年内变化为${fmtPct(pct(lastV, ya))}（自${fmt(ya)}）。`
          : `En un ano la variacion es ${fmtPct(pct(lastV, ya))} (desde ${fmt(ya)}).`
    });
  }

  // 4. Max / min over the available window.
  let maxE = list[0];
  let minE = list[0];
  for (const e of list) {
    if (e[1] > maxE[1]) maxE = e;
    if (e[1] < minE[1]) minE = e;
  }
  const startLabel = formatPeriod(list[0][0], freq);
  out.push({
    tag: tag.maxmin,
    text:
      lang === "en"
        ? `Over the available window (${startLabel}-${lastLabel}) the high was ${fmt(maxE[1])} (${formatPeriod(maxE[0], freq)}) and the low ${fmt(minE[1])} (${formatPeriod(minE[0], freq)}).`
        : lang === "zh"
        ? `在可用区间（${startLabel}-${lastLabel}）内，最高为${fmt(maxE[1])}（${formatPeriod(maxE[0], freq)}），最低为${fmt(minE[1])}（${formatPeriod(minE[0], freq)}）。`
        : `En el periodo disponible (${startLabel}-${lastLabel}) el maximo fue ${fmt(maxE[1])} (${formatPeriod(maxE[0], freq)}) y el minimo ${fmt(minE[1])} (${formatPeriod(minE[0], freq)}).`
  });

  // 5. Recent trend (last up-to-6 points).
  const recent = list.slice(-6).map((e) => e[1]);
  const t = trendWord(recent);
  const word = TRENDS[lang][t.key];
  const acc = t.deltaPct != null ? ` (${fmtPct(t.deltaPct)})` : "";
  out.push({
    tag: tag.trend,
    text:
      lang === "en"
        ? `The trend over the last ${recent.length} periods is ${word}${acc}.`
        : lang === "zh"
        ? `最近${recent.length}个周期的趋势为${word}${acc}。`
        : `La tendencia de los ultimos ${recent.length} periodos es ${word}${t.deltaPct != null ? ` (${fmtPct(t.deltaPct)} acumulado)` : ""}.`
  });

  // 6. Economic interpretation (heuristic, anchored to the latest value).
  const interp = interpret(metric, lastV, subject, lang);
  if (interp) out.push({ tag: tag.interp, text: interp });

  return out;
}

function interpret(metric: MetricKey, v: number, subject: string, lang: Lang): string | null {
  const f1 = v.toFixed(1);
  const f0 = v.toFixed(0);
  const f2 = v.toFixed(2);
  switch (metric) {
    case "gdp":
      if (v >= 3)
        return lang === "en"
          ? `Growth of ${f1}% points to a solid expansion of ${subject}.`
          : lang === "zh"
          ? `${f1}% 的增长表明${subject}经济强劲扩张。`
          : `Un crecimiento del ${f1}% apunta a una expansion solida de ${subject}.`;
      if (v > 0)
        return lang === "en"
          ? `Growth of ${f1}% indicates a moderate expansion.`
          : lang === "zh"
          ? `${f1}% 的增长表明温和扩张。`
          : `Un crecimiento del ${f1}% indica expansion moderada.`;
      return lang === "en"
        ? `A change of ${f1}% signals a contraction in activity.`
        : lang === "zh"
        ? `${f1}% 的变化表明经济活动收缩。`
        : `Una variacion del ${f1}% senala contraccion de la actividad.`;
    case "cpi":
    case "cpiCore": {
      const gap = v - 2;
      if (Math.abs(gap) <= 0.5)
        return lang === "en"
          ? `At ${f1}% inflation is near the 2% target.`
          : lang === "zh"
          ? `${f1}% 的通胀接近 2% 的目标。`
          : `Con un ${f1}% la inflacion esta cerca del objetivo del 2%.`;
      if (gap > 0)
        return lang === "en"
          ? `At ${f1}% inflation is ${gap.toFixed(1)} pp above the 2% target.`
          : lang === "zh"
          ? `${f1}% 的通胀高于 2% 目标 ${gap.toFixed(1)} 个百分点。`
          : `Un ${f1}% deja la inflacion ${gap.toFixed(1)} pp por encima del objetivo del 2%.`;
      return lang === "en"
        ? `At ${f1}% inflation is below the 2% target, with risk of price weakness.`
        : lang === "zh"
        ? `${f1}% 的通胀低于 2% 目标，存在物价疲软风险。`
        : `Un ${f1}% situa la inflacion por debajo del objetivo del 2%, con riesgo de debilidad de precios.`;
    }
    case "unemployment":
      if (v <= 5)
        return lang === "en"
          ? `${f1}% reflects a tight labour market (near full employment).`
          : lang === "zh"
          ? `${f1}% 反映劳动力市场紧张（接近充分就业）。`
          : `Un ${f1}% refleja un mercado laboral tensionado (casi pleno empleo).`;
      if (v >= 10)
        return lang === "en"
          ? `${f1}% indicates high unemployment.`
          : lang === "zh"
          ? `${f1}% 表明失业率偏高。`
          : `Un ${f1}% indica un desempleo elevado.`;
      return lang === "en"
        ? `${f1}% is an intermediate unemployment level.`
        : lang === "zh"
        ? `${f1}% 属于中等失业水平。`
        : `Un ${f1}% es un desempleo intermedio.`;
    case "publicDebt":
      if (v >= 100)
        return lang === "en"
          ? `At ${f0}% of GDP debt exceeds the size of the economy.`
          : lang === "zh"
          ? `债务为 GDP 的 ${f0}%，超过经济总量。`
          : `Con ${f0}% del PIB la deuda supera el tamano de la economia.`;
      if (v >= 60)
        return lang === "en"
          ? `At ${f0}% of GDP debt is above the 60% reference threshold.`
          : lang === "zh"
          ? `债务为 GDP 的 ${f0}%，高于 60% 的参考阈值。`
          : `Con ${f0}% del PIB la deuda esta por encima del umbral de referencia (60%).`;
      return lang === "en"
        ? `At ${f0}% of GDP debt remains contained.`
        : lang === "zh"
        ? `债务为 GDP 的 ${f0}%，保持可控。`
        : `Con ${f0}% del PIB la deuda se mantiene contenida.`;
    case "deficit":
      if (v < -3)
        return lang === "en"
          ? `A balance of ${f1}% of GDP exceeds the 3% deficit limit.`
          : lang === "zh"
          ? `${f1}% 的财政余额超过 3% 的赤字上限。`
          : `Un saldo del ${f1}% del PIB supera el limite de deficit del 3%.`;
      if (v < 0)
        return lang === "en"
          ? `A balance of ${f1}% of GDP is a moderate deficit.`
          : lang === "zh"
          ? `${f1}% 的财政余额为温和赤字。`
          : `Un saldo del ${f1}% del PIB es un deficit moderado.`;
      return lang === "en"
        ? `A balance of ${f1}% of GDP indicates a fiscal surplus.`
        : lang === "zh"
        ? `${f1}% 的财政余额表明财政盈余。`
        : `Un saldo del ${f1}% del PIB indica superavit fiscal.`;
    case "riskPremium":
    case "countryRisk": {
      const bps = Math.round(v);
      if (bps <= 0)
        return lang === "en"
          ? `The spread is null or negative versus Germany (${bps} bps): very low perceived risk.`
          : lang === "zh"
          ? `相对德国的利差为零或负（${bps} 个基点）：感知风险极低。`
          : `La prima es nula o negativa frente a Alemania (${bps} pb): riesgo percibido muy bajo.`;
      return lang === "en"
        ? `A spread of ${bps} bps over Germany reflects the extra funding cost versus the German bund.`
        : lang === "zh"
        ? `相对德国 ${bps} 个基点的利差反映了相对德债的额外融资成本。`
        : `Una prima de ${bps} pb sobre Alemania refleja el sobrecoste de financiacion frente al bono aleman.`;
    }
    case "oilBrent":
    case "oilWti":
      return lang === "en"
        ? `Crude trades at $${f2} per barrel, a key reference for costs and inflation.`
        : lang === "zh"
        ? `原油价格为每桶 $${f2}，是成本与通胀的关键参考。`
        : `El crudo cotiza a $${f2} por barril, referencia clave para costes e inflacion.`;
    case "fedRate":
    case "ecbRate": {
      const stance =
        lang === "en"
          ? v >= 3 ? "restrictive" : v >= 1.5 ? "neutral" : "accommodative"
          : lang === "zh"
          ? v >= 3 ? "紧缩" : v >= 1.5 ? "中性" : "宽松"
          : v >= 3 ? "restrictiva" : v >= 1.5 ? "neutral" : "acomodaticia";
      return lang === "en"
        ? `An official rate of ${f2}% defines a ${stance} monetary policy.`
        : lang === "zh"
        ? `${f2}% 的政策利率意味着${stance}的货币政策。`
        : `Un tipo oficial del ${f2}% define una politica monetaria ${stance}.`;
    }
    case "bondYield":
      return lang === "en"
        ? `The 10-year bond yields ${f2}%, a reference cost for long-term debt.`
        : lang === "zh"
        ? `10 年期国债收益率为 ${f2}%，是长期债务的参考成本。`
        : `El bono a 10 anos rinde ${f2}%, coste de referencia de la deuda a largo plazo.`;
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
  factor: number,
  freq: Frequency,
  period: string | null
): Insight[] {
  const lang = getLang();
  const tr = createT(lang);
  const tag = TAG[lang];
  if (!target?.trade)
    return [{
      tag: tag.trade,
      text:
        lang === "en"
          ? "Select a country with trade data to see the analysis."
          : lang === "zh"
          ? "请选择有贸易数据的国家以查看分析。"
          : "Selecciona un pais con datos de comercio para ver el analisis."
    }];
  const t = target.trade;
  const catLabel = (k: string) => tr.tradeCat(k);
  const money = (usd: number) => formatMoney(usd * factor, baseCurrency);
  const out: Insight[] = [];
  const flowWord = flowWordOf(flow, lang);

  const surplus = lang === "en" ? "surplus" : lang === "zh" ? "顺差" : "superavit";
  const deficit = lang === "en" ? "deficit" : lang === "zh" ? "逆差" : "deficit";

  // 0. Period-aware headline (when a quarter/month is selected).
  const rec = tradeRecAt(target, freq, period);
  if (rec && (freq !== "A" || period)) {
    const periodLabel = period ? formatPeriod(period, freq) : t.year.toString();
    const bal = rec.exports - rec.imports;
    const balWord = bal >= 0 ? surplus : deficit;
    const periodTag = lang === "en" ? `Period ${periodLabel}` : lang === "zh" ? `周期 ${periodLabel}` : `Periodo ${periodLabel}`;
    out.push({
      tag: periodTag,
      text:
        flow === "total"
          ? lang === "en"
            ? `${target.name} (${periodLabel}): exported ${money(rec.exports)} and imported ${money(rec.imports)}, ${balWord} of ${money(Math.abs(bal))}.`
            : lang === "zh"
            ? `${target.name}（${periodLabel}）：出口${money(rec.exports)}，进口${money(rec.imports)}，${balWord}${money(Math.abs(bal))}。`
            : `${target.name} (${periodLabel}): exporto ${money(rec.exports)} e importo ${money(rec.imports)}, ${balWord} de ${money(Math.abs(bal))}.`
          : lang === "en"
          ? `${target.name} (${periodLabel}): ${flowWord} of ${money(flow === "exports" ? rec.exports : rec.imports)}.`
          : lang === "zh"
          ? `${target.name}（${periodLabel}）：${flowWord}${money(flow === "exports" ? rec.exports : rec.imports)}。`
          : `${target.name} (${periodLabel}): ${flowWord} de ${money(flow === "exports" ? rec.exports : rec.imports)}.`
    });
  }

  // 1. Headline values (annual).
  const balance = t.exports.total - t.imports.total;
  if (flow === "total") {
    const balWord = balance >= 0 ? surplus : deficit;
    out.push({
      tag: tag.balance,
      text:
        lang === "en"
          ? `${target.name} (${t.year}): exported ${money(t.exports.total)} and imported ${money(t.imports.total)}, ${balWord} of ${money(Math.abs(balance))}.`
          : lang === "zh"
          ? `${target.name}（${t.year}）：出口${money(t.exports.total)}，进口${money(t.imports.total)}，${balWord}${money(Math.abs(balance))}。`
          : `${target.name} (${t.year}): exporto ${money(t.exports.total)} e importo ${money(t.imports.total)}, ${balWord} de ${money(Math.abs(balance))}.`
    });
  } else {
    const fl = flow === "exports" ? t.exports : t.imports;
    out.push({
      tag: flow === "exports" ? tag.exports : tag.imports,
      text:
        lang === "en"
          ? `${target.name} recorded ${money(fl.total)} in ${flowWord} in ${t.year}.`
          : lang === "zh"
          ? `${target.name}在${t.year}的${flowWord}为${money(fl.total)}。`
          : `${target.name} registro ${money(fl.total)} en ${flowWord} en ${t.year}.`
    });
  }

  // 2. Top categories of the active flow.
  const flowForCats = flow === "imports" ? t.imports : t.exports;
  const flowNoun =
    flow === "imports"
      ? lang === "en" ? "import" : lang === "zh" ? "进口" : "importacion"
      : lang === "en" ? "export" : lang === "zh" ? "出口" : "exportacion";
  const ranked = Object.entries(flowForCats.categories)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);
  if (ranked.length) {
    const top = ranked[0];
    const share = (top[1] / flowForCats.total) * 100;
    const second = ranked[1];
    out.push({
      tag: tag.topCat,
      text:
        lang === "en"
          ? `The main ${flowNoun} line is ${catLabel(top[0])} with ${money(top[1])} (${share.toFixed(0)}% of the total)${second ? `, followed by ${catLabel(second[0])} (${money(second[1])})` : ""}.`
          : lang === "zh"
          ? `主要${flowNoun}类别是${catLabel(top[0])}，为${money(top[1])}（占总量 ${share.toFixed(0)}%）${second ? `，其次是${catLabel(second[0])}（${money(second[1])}）` : ""}。`
          : `La principal partida de ${flowNoun} es ${catLabel(top[0])} con ${money(top[1])} (${share.toFixed(0)}% del total)${second ? `, seguida de ${catLabel(second[0])} (${money(second[1])})` : ""}.`
    });
    if (ranked.length > 2) {
      const top3 = ranked.slice(0, 3).reduce((s, [, v]) => s + v, 0);
      const sharePct = ((top3 / flowForCats.total) * 100).toFixed(0);
      const flowPlural = flow === "imports" ? flowWordOf("imports", lang) : flowWordOf("exports", lang);
      out.push({
        tag: tag.concentration,
        text:
          lang === "en"
            ? `The three largest categories account for ${sharePct}% of ${flowPlural}.`
            : lang === "zh"
            ? `前三大类别占${flowPlural}的 ${sharePct}%。`
            : `Las tres mayores categorias concentran el ${sharePct}% de las ${flowPlural}.`
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
    const qLabel = formatPeriod(last.period, "Q");
    const prevLabel = formatPeriod(prev.period, "Q");
    const change = pct(Math.abs(lastV), Math.abs(prevV));
    const valStr = flow === "total" ? `${(lastV >= 0 ? surplus : deficit)} ${money(Math.abs(lastV))}` : money(lastV);
    const cmpStr =
      change != null
        ? lang === "en"
          ? `${fmtPct(change)} versus ${prevLabel}`
          : lang === "zh"
          ? `相比${prevLabel}${fmtPct(change)}`
          : `${fmtPct(change)} frente a ${prevLabel}`
        : lang === "en" ? "no prior comparison" : lang === "zh" ? "无前期对比" : "sin comparativa previa";
    out.push({
      tag: tag.lastQuarter,
      text:
        lang === "en"
          ? `In ${qLabel} ${flowWord} reached ${valStr}, ${cmpStr}.`
          : lang === "zh"
          ? `在${qLabel}，${flowWord}为${valStr}，${cmpStr}。`
          : `En ${qLabel} ${flowWord} fue ${valStr}, ${cmpStr}.`
    });
    // Year-on-year quarter.
    const yaQ = q.find((x) => {
      const [y, qq] = last.period.split("-Q");
      return x.period === `${Number(y) - 1}-Q${qq}`;
    });
    if (yaQ) {
      const yaV = pick(yaQ);
      const yaStr = flow === "total" ? money(lastV - yaV) : fmtPct(pct(lastV, yaV));
      out.push({
        tag: tag.yoyQ,
        text:
          lang === "en"
            ? `Versus the same quarter a year earlier (${formatPeriod(yaQ.period, "Q")}), the change is ${yaStr}.`
            : lang === "zh"
            ? `相比去年同季度（${formatPeriod(yaQ.period, "Q")}），变化为${yaStr}。`
            : `Respecto al mismo trimestre de un ano antes (${formatPeriod(yaQ.period, "Q")}), la variacion es ${yaStr}.`
      });
    }
    // Recent quarterly trend.
    const recent = q.slice(-4).map(pick);
    const tw = trendWord(recent.map(Math.abs));
    const word = TRENDS[lang][tw.key];
    out.push({
      tag: tag.quarterTrend,
      text:
        lang === "en"
          ? `Over the last ${recent.length} quarters ${flowWord} follows a ${word} path.`
          : lang === "zh"
          ? `最近${recent.length}个季度，${flowWord}呈${word}走势。`
          : `En los ultimos ${recent.length} trimestres la ${flowWord} sigue una trayectoria ${word}.`
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
  const lang = getLang();
  const tr = createT(lang);
  const tag = TAG[lang];
  const baseLabel = tr.curLabel(baseCurrency);
  const movers = fxCurrencies
    .filter((c) => c.code !== baseCurrency && global.fx?.[c.code])
    .map((c) => {
      const s = fxRateSeries(global, c.code, baseCurrency);
      const dates = Object.keys(s).sort();
      const win = dates.slice(-22).map((d) => s[d]);
      return { code: c.code, change: changeOf(win), latest: win[win.length - 1] };
    })
    .filter((m) => m.change != null);
  if (!movers.length) return [];
  const sorted = [...movers].sort((a, b) => (b.change ?? 0) - (a.change ?? 0));
  const up = sorted[0];
  const down = sorted[sorted.length - 1];
  const gains = movers.filter((m) => (m.change ?? 0) > 0).length;
  const losses = movers.filter((m) => (m.change ?? 0) < 0).length;
  return [
    {
      tag: tag.baseCurrency,
      text:
        lang === "en"
          ? `All quotes are expressed against ${baseLabel} (${baseCurrency}). Last-month change.`
          : lang === "zh"
          ? `所有报价均相对${baseLabel}（${baseCurrency}）。为近一个月变化。`
          : `Todas las cotizaciones se expresan frente a ${baseLabel} (${baseCurrency}). Variacion del ultimo mes.`
    },
    {
      tag: tag.topGain,
      text:
        lang === "en"
          ? `${up.code}/${baseCurrency} is the biggest riser this month: ${fmtPct(up.change)}.`
          : lang === "zh"
          ? `${up.code}/${baseCurrency} 是本月升值最多的：${fmtPct(up.change)}。`
          : `${up.code}/${baseCurrency} es la que mas sube en el mes: ${fmtPct(up.change)}.`
    },
    {
      tag: tag.topLoss,
      text:
        lang === "en"
          ? `${down.code}/${baseCurrency} is the biggest faller: ${fmtPct(down.change)}.`
          : lang === "zh"
          ? `${down.code}/${baseCurrency} 是贬值最多的：${fmtPct(down.change)}。`
          : `${down.code}/${baseCurrency} es la que mas baja: ${fmtPct(down.change)}.`
    },
    {
      tag: tag.summary,
      text:
        lang === "en"
          ? `Of ${movers.length} currencies, ${gains} appreciate and ${losses} depreciate against ${baseCurrency}.`
          : lang === "zh"
          ? `在${movers.length}种货币中，${gains}种相对${baseCurrency}升值，${losses}种贬值。`
          : `De ${movers.length} divisas, ${gains} se aprecian y ${losses} se deprecian frente a ${baseCurrency}.`
    }
  ];
}

function indicesInsights(global: GlobalIndicators): Insight[] {
  const lang = getLang();
  const tag = TAG[lang];
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
    {
      tag: tag.bestIndex,
      text:
        lang === "en"
          ? `Over the last month ${best.short} leads with ${fmtPct(best.change)}.`
          : lang === "zh"
          ? `近一个月，${best.short}领先，涨幅${fmtPct(best.change)}。`
          : `En el ultimo mes ${best.short} lidera con ${fmtPct(best.change)}.`
    },
    {
      tag: tag.worstIndex,
      text:
        lang === "en"
          ? `${worst.short} lags the most: ${fmtPct(worst.change)}.`
          : lang === "zh"
          ? `${worst.short}表现最弱：${fmtPct(worst.change)}。`
          : `${worst.short} es el mas rezagado: ${fmtPct(worst.change)}.`
    },
    {
      tag: tag.breadth,
      text:
        lang === "en"
          ? `${positives} of ${movers.length} indices rise this month; the rest fall or hold.`
          : lang === "zh"
          ? `${movers.length}个指数中有${positives}个本月上涨，其余下跌或持平。`
          : `${positives} de ${movers.length} indices suben en el mes; el resto cae o se mantiene.`
    }
  ];
}

// ---------------------------------------------------------------------------
// Multi-country comparative insights
// ---------------------------------------------------------------------------

function diffLabel(meta: ReturnType<typeof metricConfig>, a: number, b: number): string {
  const d = a - b;
  if (meta.kind === "growth" || meta.kind === "rate") return fmtPP(d);
  if (meta.kind === "spread") return `${d > 0 ? "+" : ""}${Math.round(d * 100)}${bpsUnit(getLang())}`;
  return fmtPct(pct(a, b));
}

function compareInsights(
  rows: CountryRow[],
  metric: MetricKey,
  freq: Frequency,
  period: string | null
): Insight[] {
  const lang = getLang();
  const tr = createT(lang);
  const tag = TAG[lang];
  const meta = metricConfig(metric);
  const mlabel = tr.mLabel(metric);
  const fmt = (v: number) => formatValue(v, metric);
  const label = period ? formatPeriod(period, freq) : null;
  const vals = rows
    .map((r) => ({ name: r.name, v: valueAt(r, metric, freq, period) }))
    .filter((x): x is { name: string; v: number } => x.v != null);
  if (vals.length < 2) return [];

  const sorted = [...vals].sort((a, b) => b.v - a.v);
  const top = sorted[0];
  const bottom = sorted[sorted.length - 1];
  const avg = vals.reduce((s, x) => s + x.v, 0) / vals.length;
  const suffix = label ? ` (${label})` : "";
  const out: Insight[] = [];

  // 1. Ranking of the selected group.
  out.push({
    tag: tag.comparison,
    text:
      lang === "en"
        ? `Among the ${vals.length} selected countries${suffix}, ${top.name} leads with ${fmt(top.v)} and ${bottom.name} trails with ${fmt(bottom.v)} in ${mlabel}.`
        : lang === "zh"
        ? `在所选的${vals.length}个国家中${suffix}，${mlabel}方面${top.name}以${fmt(top.v)}领先，${bottom.name}以${fmt(bottom.v)}垫底。`
        : `Entre los ${vals.length} paises seleccionados${suffix}, ${top.name} encabeza con ${fmt(top.v)} y ${bottom.name} cierra con ${fmt(bottom.v)} en ${mlabel.toLowerCase()}.`
  });

  // 2. Gap between the two extremes.
  out.push({
    tag: tag.difference,
    text:
      lang === "en"
        ? `${top.name} exceeds ${bottom.name} by ${diffLabel(meta, top.v, bottom.v)}.`
        : lang === "zh"
        ? `${top.name}比${bottom.name}高${diffLabel(meta, top.v, bottom.v)}。`
        : `${top.name} supera a ${bottom.name} en ${diffLabel(meta, top.v, bottom.v)}.`
  });

  // 3. Group average + who is above/below.
  const above = vals.filter((x) => x.v > avg).length;
  out.push({
    tag: tag.groupAvg,
    text:
      lang === "en"
        ? `The selection average is ${fmt(avg)}; ${above} of ${vals.length} are above it.`
        : lang === "zh"
        ? `所选组的均值为${fmt(avg)}；${vals.length}个中有${above}个高于均值。`
        : `La media de la seleccion es ${fmt(avg)}; ${above} de ${vals.length} estan por encima.`
  });

  // 4. Full ordered ranking when the group is small.
  if (vals.length <= 5) {
    out.push({
      tag: tag.ranking,
      text: sorted.map((x, i) => `${i + 1}. ${x.name} ${fmt(x.v)}`).join(" · ")
    });
  }

  return out;
}

function tradeCompareInsights(
  rows: CountryRow[],
  flow: "total" | "exports" | "imports",
  baseCurrency: string,
  factor: number
): Insight[] {
  const lang = getLang();
  const tag = TAG[lang];
  const money = (usd: number) => formatMoney(usd * factor, baseCurrency);
  const flowWord = flowWordOf(flow, lang);
  const pick = (c: CountryRow) => {
    const e = c.trade!.exports.total;
    const i = c.trade!.imports.total;
    return flow === "exports" ? e : flow === "imports" ? i : e - i;
  };
  const vals = rows.filter((r) => r.trade).map((r) => ({ name: r.name, v: pick(r) }));
  if (vals.length < 2) return [];
  const sorted = [...vals].sort((a, b) => b.v - a.v);
  const top = sorted[0];
  const bottom = sorted[sorted.length - 1];
  const out: Insight[] = [];
  out.push({
    tag: tag.comparison,
    text:
      lang === "en"
        ? `In ${flowWord}, ${top.name} leads with ${money(top.v)} versus ${bottom.name} (${money(bottom.v)}) among the selected.`
        : lang === "zh"
        ? `在${flowWord}方面，所选国家中${top.name}以${money(top.v)}领先，${bottom.name}为${money(bottom.v)}。`
        : `En ${flowWord}, ${top.name} lidera con ${money(top.v)} frente a ${bottom.name} (${money(bottom.v)}) entre los seleccionados.`
  });
  const ratio = bottom.v !== 0 ? top.v / bottom.v : null;
  if (ratio != null && Number.isFinite(ratio)) {
    out.push({
      tag: tag.difference,
      text:
        lang === "en"
          ? `${top.name} is ${money(Math.abs(top.v - bottom.v))} higher than ${bottom.name}.`
          : lang === "zh"
          ? `${top.name}比${bottom.name}高${money(Math.abs(top.v - bottom.v))}。`
          : `${top.name} supera a ${bottom.name} en ${money(Math.abs(top.v - bottom.v))}.`
    });
  }
  out.push({
    tag: tag.ranking,
    text: sorted.map((x, i) => `${i + 1}. ${x.name} ${money(x.v)}`).join(" · ")
  });
  return out;
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
  period: string | null;
  subject: CountryRow | null;
  compareRows: CountryRow[];
  scopeLabel: string;
  baseCurrency: string;
  tradeFlow: "total" | "exports" | "imports";
  tradeShare: boolean;
  tradeTarget: CountryRow | null;
  tradeFactor: number;
}): Insight[] {
  const { data, view, isGlobal, metric, freq, period, subject, compareRows, baseCurrency, tradeFlow, tradeShare, tradeTarget, tradeFactor } = params;
  const lang = getLang();
  const tr = createT(lang);
  const tag = TAG[lang];

  if (view === "fx") return fxInsights(data.global, baseCurrency);
  if (view === "indices") return indicesInsights(data.global);
  if (view === "trade") {
    // Comparative trade insights first when several countries are selected.
    const cmp = compareRows.length >= 2 ? tradeCompareInsights(compareRows, tradeFlow, baseCurrency, tradeFactor) : [];
    if (tradeShare) {
      // "Variacion": balance as % of GDP, reusing the generic series engine.
      const t = tradeTarget;
      if (compareRows.length >= 2) {
        const grp = compareInsights(compareRows, "tradeBalance", "A", period);
        if (grp.length) return [...cmp.slice(1), ...grp];
      }
      const map = t?.series["tradeBalance"]?.["A"] ?? {};
      if (t && entries(map).length) return [...cmp, ...seriesInsights(t.name, map, "A", "tradeBalance")];
    }
    return [...cmp, ...tradeInsights(tradeTarget, tradeFlow, baseCurrency, data.global, tradeFactor, freq, period)];
  }

  if (isGlobal) {
    const meta = metricConfig(metric);
    const gKey = meta.globalKeys?.[0];
    if (!gKey) return [];
    const parts = gKey.split(".");
    let obj: unknown = data.global;
    for (const p of parts) obj = (obj as Record<string, unknown> | undefined)?.[p];
    const map = ((obj as Record<string, Record<string, number>> | undefined)?.[freq]) ?? {};
    return seriesInsights(tr.mLabel(metric), map, freq, metric);
  }

  // Multi-country comparison takes precedence when 2+ countries are selected.
  const cmp = compareRows.length >= 2 ? compareInsights(compareRows, metric, freq, period) : [];

  if (!subject) {
    if (cmp.length) return cmp;
    return [{
      tag: tag.selection,
      text:
        lang === "en"
          ? "Select a country in the list or map to see specific insights."
          : lang === "zh"
          ? "在列表或地图中选择一个国家以查看具体洞察。"
          : "Selecciona un pais en la lista o el mapa para ver insights especificos."
    }];
  }
  const map = subject.series[metric]?.[freq] ?? {};
  if (entries(map).length === 0) {
    if (cmp.length) return cmp;
    return [{
      tag: tag.noData,
      text:
        lang === "en"
          ? `No ${tr.mLabel(metric)} data for ${subject.name} at ${freq} frequency.`
          : lang === "zh"
          ? `${subject.name}没有${freq}频率的${tr.mLabel(metric)}数据。`
          : `No hay datos de ${tr.mLabel(metric).toLowerCase()} para ${subject.name} en frecuencia ${freq}.`
    }];
  }
  return [...cmp, ...seriesInsights(subject.name, map, freq, metric)];
}
