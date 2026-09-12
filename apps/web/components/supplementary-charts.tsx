"use client";

import type { EChartsOption } from "echarts";
import { Chart } from "./chart";
import type { CountryRow, GlobalIndicators } from "@/lib/dataset";
import { metricConfig, type Frequency, type MetricKey } from "@/lib/demo-data";
import { formatPeriod } from "@/lib/analytics";
import { createT, numberLocale } from "@/lib/i18n";
import { useMacroStore } from "@/lib/store";
import { analysisPair, matchedPairs, matchedSpread, momentumMetrics, periodChanges, previousPeriod } from "@/lib/supplementary";

const copy = {
  es: { pair: "Comparativa estructural", changes: "Mayores cambios entre periodos", matched: "paises con datos coincidentes", relation: "Relacion descriptiva; no implica causalidad.", coverage: "con observaciones en ambos periodos", increase: "Aumento", decrease: "Descenso", points: "puntos de indice", pp: "p.p.", bp: "pb", oil: "Diferencial Brent - WTI", rates: "Diferencial Fed - BCE", common: "Solo fechas comunes a ambas series", shown: "mostrados", fiscal: "Saldo negativo = deficit; positivo = superavit.", cpi: "Sobre la diagonal: inflacion general superior a la subyacente." },
  en: { pair: "Structural comparison", changes: "Largest changes between periods", matched: "countries with matched data", relation: "Descriptive relationship; does not imply causation.", coverage: "with observations in both periods", increase: "Increase", decrease: "Decrease", points: "index points", pp: "pp", bp: "bp", oil: "Brent - WTI spread", rates: "Fed - ECB spread", common: "Only dates shared by both series", shown: "shown", fiscal: "Negative balance = deficit; positive = surplus.", cpi: "Above the diagonal: headline inflation exceeds core inflation." },
  zh: { pair: "结构性比较", changes: "期间最大变化", matched: "个国家具有同期数据", relation: "描述性关系，不代表因果关系。", coverage: "个国家在两个期间均有数据", increase: "上升", decrease: "下降", points: "指数点", pp: "百分点", bp: "基点", oil: "布伦特 - WTI价差", rates: "美联储 - 欧洲央行利差", common: "仅包含两条序列共有的日期", shown: "显示", fiscal: "负值表示赤字；正值表示盈余。", cpi: "对角线上方：总体通胀高于核心通胀。" }
};

const tooltip = { trigger: "item" as const, renderMode: "richText" as const, confine: true };
const axisStyle = { axisLabel: { color: "#6b6f68", fontSize: 11 }, splitLine: { lineStyle: { color: "#e7e5e4" } } };

export function CountryAnalysis({ rows, metric, freq, period, factor, currency }: {
  rows: CountryRow[]; metric: MetricKey; freq: Frequency; period: string | null; factor: number; currency: string;
}) {
  const lang = useMacroStore((s) => s.lang);
  const tr = createT(lang);
  const text = copy[lang];
  if (!period) return null;
  const pair = analysisPair(metric, freq);
  const points = pair ? matchedPairs(rows, ...pair, freq, period) : [];
  const changes = momentumMetrics.includes(metric) ? periodChanges(rows, metric, freq, period) : [];
  const hasPair = points.length >= 3;
  if (!hasPair && !changes.length) return null;

  const n = (value: number) => new Intl.NumberFormat(numberLocale(lang), { maximumFractionDigits: 2 }).format(value);
  const unit = (key: MetricKey) => metricConfig(key).unit === "USD" ? currency : metricConfig(key).unit;
  const scaled = (value: number, key: MetricKey) => metricConfig(key).unit === "USD" ? value * factor : value;
  const shown = changes.slice(0, 12).reverse();
  const deltaUnit = metricConfig(metric).kind === "spread" ? text.bp : metricConfig(metric).kind === "index" ? text.points : text.pp;
  const delta = (value: number) => value * (metricConfig(metric).kind === "spread" ? 100 : 1);
  const pairOption: EChartsOption = pair ? {
    tooltip: { ...tooltip, formatter: (p) => {
      const point = points[(Array.isArray(p) ? p[0] : p).dataIndex];
      return point ? `${point.country}\n${tr.mShort(pair[0])}: ${n(scaled(point.x, pair[0]))} ${unit(pair[0])}\n${tr.mShort(pair[1])}: ${n(scaled(point.y, pair[1]))} ${unit(pair[1])}` : "";
    } },
    grid: { left: 12, right: 24, top: 16, bottom: 12, containLabel: true },
    xAxis: { ...axisStyle, type: "value", scale: true, axisLabel: { ...axisStyle.axisLabel, formatter: (v: number) => new Intl.NumberFormat(numberLocale(lang), { notation: "compact" }).format(v) } },
    yAxis: { ...axisStyle, type: "value", scale: true },
    series: [{ type: "scatter", symbolSize: 10, itemStyle: { color: "#397b88", opacity: 0.8 }, data: points.map((p) => [scaled(p.x, pair[0]), scaled(p.y, pair[1])]),
      ...(pair[0] === "cpiCore" ? { markLine: { silent: true, symbol: "none", label: { show: false }, data: [[{ coord: [Math.min(...points.flatMap(p => [p.x, p.y])), Math.min(...points.flatMap(p => [p.x, p.y]))] }, { coord: [Math.max(...points.flatMap(p => [p.x, p.y])), Math.max(...points.flatMap(p => [p.x, p.y]))] }]] } } : {})
    }]
  } : {};
  const changeOption: EChartsOption = {
    tooltip: { ...tooltip, formatter: (p) => {
      const point = shown[(Array.isArray(p) ? p[0] : p).dataIndex];
      return point ? `${point.country}\n${n(delta(point.before))} → ${n(delta(point.current))}\n${n(delta(point.change))} ${deltaUnit}` : "";
    } },
    grid: { left: 8, right: 28, top: 8, bottom: 8, containLabel: true },
    xAxis: { ...axisStyle, type: "value" },
    yAxis: { type: "category", data: shown.map((p) => p.iso3), axisTick: { show: false }, axisLabel: { color: "#57534e", fontSize: 11 } },
    series: [{ type: "bar", barMaxWidth: 18, data: shown.map(p => ({ value: delta(p.change), itemStyle: { color: p.change >= 0 ? "#397b88" : "#b76b57" } })),
      markLine: { silent: true, symbol: "none", label: { show: false }, data: [{ xAxis: 0 }] }
    }]
  };
  return <section data-testid="country-analysis" className={`mt-5 grid gap-6 border-t border-stone-200 pt-5 ${hasPair && changes.length ? "xl:grid-cols-2" : ""}`}>
    {hasPair && pair && <article className="min-w-0" data-testid="paired-analysis">
      <h2 className="text-sm font-medium text-stone-800">{text.pair}: {tr.mShort(pair[0])} / {tr.mShort(pair[1])}</h2>
      <p className="mt-1 text-xs text-stone-500">{formatPeriod(period, freq)} · {points.length}/{rows.length} {text.matched}</p>
      <p className="mt-3 text-xs text-stone-600">X: {tr.mLabel(pair[0])} ({unit(pair[0])}) · Y: {tr.mLabel(pair[1])} ({unit(pair[1])})</p>
      <Chart option={pairOption} height={310} />
      <p className="mt-2 text-xs text-stone-500">{pair[0] === "publicDebt" ? text.fiscal : pair[0] === "cpiCore" ? text.cpi : text.relation}</p>
    </article>}
    {!!changes.length && <article className="min-w-0" data-testid="change-analysis">
      <h2 className="text-sm font-medium text-stone-800">{text.changes} · {deltaUnit}</h2>
      <p className="mt-1 text-xs text-stone-500">{formatPeriod(previousPeriod(period, freq)!, freq)} → {formatPeriod(period, freq)} · {changes.length}/{rows.length} {text.coverage} · {shown.length} {text.shown}</p>
      <div className="mt-3 flex gap-4 text-xs text-stone-600"><span><span className="mr-1 inline-block h-2 w-2 bg-[#397b88]" />{text.increase}</span><span><span className="mr-1 inline-block h-2 w-2 bg-[#b76b57]" />{text.decrease}</span></div>
      <Chart option={changeOption} height={310} />
    </article>}
  </section>;
}

export function GlobalSpread({ global, metric, factor, currency }: { global: GlobalIndicators; metric: MetricKey; factor: number; currency: string }) {
  const lang = useMacroStore((s) => s.lang);
  const text = copy[lang];
  const oil = metric === "oilBrent" || metric === "oilWti";
  const rates = metric === "fedRate" || metric === "ecbRate";
  if (!oil && !rates) return null;
  const points = matchedSpread(oil ? global.bpiOil?.brent?.D ?? {} : global.fedRate?.M ?? {}, oil ? global.bpiOil?.wti?.D ?? {} : global.ecbRate?.M ?? {}).slice(-500);
  if (points.length < 3) return null;
  const unit = oil ? currency : text.pp;
  const option: EChartsOption = {
    tooltip: { ...tooltip, trigger: "axis", valueFormatter: (v) => `${new Intl.NumberFormat(numberLocale(lang), { maximumFractionDigits: 2 }).format(Number(v))} ${unit}` },
    grid: { left: 12, right: 24, top: 12, bottom: 12, containLabel: true },
    xAxis: { ...axisStyle, type: "category", data: points.map(p => formatPeriod(p.period, oil ? "D" : "M")), axisLabel: { ...axisStyle.axisLabel, hideOverlap: true } },
    yAxis: { ...axisStyle, type: "value", scale: true },
    series: [{ type: "line", showSymbol: false, connectNulls: false, lineStyle: { color: "#397b88", width: 2 }, data: points.map(p => p.value * (oil ? factor : 1)), markLine: { silent: true, symbol: "none", label: { show: false }, data: [{ yAxis: 0 }] } }]
  };
  return <section data-testid="global-spread" className="mt-5 border-t border-stone-200 pt-5">
    <h2 className="text-sm font-medium text-stone-800">{oil ? text.oil : text.rates} · {unit}{oil ? "/bbl" : ""}</h2>
    <p className="mt-1 text-xs text-stone-500">{text.common} · {formatPeriod(points[0].period, oil ? "D" : "M")} – {formatPeriod(points.at(-1)!.period, oil ? "D" : "M")}</p>
    <Chart option={option} height={280} />
  </section>;
}
