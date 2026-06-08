"use client";

import { useMemo, useState } from "react";
import type { EChartsOption } from "echarts";
import {
  categories,
  continents,
  frequencyLabels,
  MAX_COMPARE,
  metricConfig,
  tabForMetric,
  stockIndices,
  baseCurrencies,
  fxCurrencies,
  type Frequency,
  type MetricKey,
  type TabConfig
} from "@/lib/demo-data";
import {
  useDataset,
  valueAt,
  tradeValueAt,
  tradeRecAt,
  globalValueAt,
  globalSeriesAt,
  fxRateSeries,
  latestOf,
  usdToBaseFactor,
  type CountryRow,
  type Dataset,
  type GlobalIndicators,
  type TradeFlowKey,
  type TradeMode
} from "@/lib/dataset";
import { averageAt, averageBy, extremesAt, extremesBy, formatPeriod, formatValue, formatMoney, metricMeta, rankAt, rankBy } from "@/lib/analytics";
import { buildInsights, type Insight } from "@/lib/insights";
import { useMacroStore } from "@/lib/store";
import { Flag } from "./flag";
import { WorldMap } from "./world-map";
import { Chart } from "./chart";

const LINE_COLORS = [
  "#234c3a",
  "#c98a6b",
  "#6b8fb5",
  "#a98bbf",
  "#c7a93b",
  "#7a7d76",
  "#3f7155",
  "#b5654f"
];

function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// ---------------------------------------------------------------------------
// Shared UI components
// ---------------------------------------------------------------------------

function SearchBox() {
  const { search, setSearch } = useMacroStore();
  return (
    <div className="relative px-3 py-3">
      <input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Buscar pais..."
        className="w-full rounded-sm border border-stone-300 bg-white px-3 py-1.5 text-sm text-stone-800 placeholder:text-stone-400 focus:border-stone-500 focus:outline-none"
      />
      {search && (
        <button
          onClick={() => setSearch("")}
          className="absolute right-5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
          aria-label="Limpiar busqueda"
        >
          ×
        </button>
      )}
    </div>
  );
}

function CountryList({
  rows,
  metric,
  freq,
  period,
  resolve,
  fmt
}: {
  rows: CountryRow[];
  metric: MetricKey;
  freq: Frequency;
  period: string | null;
  resolve?: (country: CountryRow) => number | null;
  fmt?: (value: number | null) => string;
}) {
  const { selected, toggleCountry } = useMacroStore();
  const ranked = resolve ? rankBy(rows, resolve) : rankAt(rows, metric, freq, period);
  const valueOf = (country: CountryRow) =>
    resolve ? resolve(country) : valueAt(country, metric, freq, period);
  const display = (country: CountryRow) =>
    fmt ? fmt(valueOf(country)) : formatValue(valueOf(country), metric);

  if (!ranked.length) {
    return <p className="px-4 py-6 text-sm text-stone-400">Sin datos para esta seleccion.</p>;
  }

  return (
    <ul className="flex flex-col">
      {ranked.map((country) => {
        const active = selected.includes(country.iso3);
        return (
          <li key={country.iso3}>
            <button
              onClick={() => toggleCountry(country.iso3)}
              className={`group flex w-full items-center gap-3 border-l-2 px-3 py-2 text-left transition ${
                active ? "border-stone-800 bg-stone-900/[0.05]" : "border-transparent hover:bg-stone-900/[0.03]"
              }`}
            >
              <span
                className={`grid h-4 w-4 shrink-0 place-items-center rounded-[3px] border text-[10px] leading-none ${
                  active ? "border-stone-800 bg-stone-900 text-stone-50" : "border-stone-300 text-transparent"
                }`}
              >
                ✓
              </span>
              <Flag iso2={country.iso2} className="h-4 w-6 shrink-0 rounded-[2px] object-cover shadow-[0_0_0_1px_rgba(0,0,0,0.06)]" />
              <span className="flex-1 truncate text-sm text-stone-700">{country.name}</span>
              <span className="font-serif text-sm tabular-nums text-stone-900">
                {display(country)}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function ContinentFilter() {
  const { continent, setContinent } = useMacroStore();
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {continents.map((item) => {
        const active = continent === item.key;
        return (
          <button
            key={item.key}
            onClick={() => setContinent(item.key)}
            className={`rounded-sm border px-2.5 py-1.5 text-xs transition ${
              active
                ? "border-stone-800 bg-stone-900 text-stone-50"
                : "border-stone-300 text-stone-600 hover:border-stone-400 hover:text-stone-900"
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

function Segmented<T extends string>({
  options,
  value,
  onChange
}: {
  options: Array<{ key: T; label: string }>;
  value: T;
  onChange: (key: T) => void;
}) {
  return (
    <div className="inline-flex rounded-md border border-stone-300 bg-white p-0.5">
      {options.map((item) => (
        <button
          key={item.key}
          onClick={() => onChange(item.key)}
          className={`rounded-[5px] px-3 py-1.5 text-sm transition ${
            value === item.key ? "bg-stone-900 text-stone-50" : "text-stone-500 hover:text-stone-900"
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function InfoTip({ text, align = "left" }: { text: string; align?: "left" | "right" }) {
  return (
    <span className="group/info relative inline-flex">
      <button
        type="button"
        aria-label="Informacion del indicador"
        className="grid h-4 w-4 place-items-center rounded-full border border-stone-300 text-[10px] font-medium leading-none text-stone-400 transition hover:border-stone-500 hover:text-stone-700"
      >
        i
      </button>
      <span
        className={`pointer-events-none invisible absolute top-6 z-30 w-64 rounded-md border border-stone-200 bg-white p-3 text-xs font-normal normal-case leading-relaxed tracking-normal text-stone-600 opacity-0 shadow-xl transition-all duration-150 group-hover/info:visible group-hover/info:opacity-100 ${
          align === "right" ? "right-0" : "left-0"
        }`}
      >
        {text}
      </span>
    </span>
  );
}

function InsightsCarousel({ insights }: { insights: Insight[] }) {
  const [index, setIndex] = useState(0);
  const safe = insights.length ? insights : [{ tag: "Insights", text: "Sin datos suficientes para generar insights." }];
  const i = Math.min(index, safe.length - 1);
  const current = safe[i];
  const go = (delta: number) => setIndex((prev) => {
    const n = (prev + delta + safe.length) % safe.length;
    return n;
  });

  return (
    <div className="flex w-full items-stretch gap-3">
      <button
        onClick={() => go(-1)}
        disabled={safe.length <= 1}
        className="shrink-0 rounded-md border border-stone-300 bg-white px-2 text-stone-500 transition hover:text-stone-900 disabled:opacity-30"
        aria-label="Insight anterior"
      >
        ‹
      </button>
      <div className="flex min-w-0 flex-1 flex-col justify-center rounded-md border border-stone-200 bg-white/70 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-stone-400">{current.tag}</span>
          <span className="ml-auto flex shrink-0 gap-1">
            {safe.map((_, n) => (
              <span
                key={n}
                className={`h-1.5 w-1.5 rounded-full ${n === i ? "bg-stone-800" : "bg-stone-300"}`}
              />
            ))}
          </span>
        </div>
        <p className="mt-1 text-sm leading-snug text-stone-700">{current.text}</p>
      </div>
      <button
        onClick={() => go(1)}
        disabled={safe.length <= 1}
        className="shrink-0 rounded-md border border-stone-300 bg-white px-2 text-stone-500 transition hover:text-stone-900 disabled:opacity-30"
        aria-label="Insight siguiente"
      >
        ›
      </button>
    </div>
  );
}

function PeriodSelector({
  periods,
  value,
  freq,
  onChange
}: {
  periods: string[];
  value: string | null;
  freq: Frequency;
  onChange: (period: string) => void;
}) {
  const index = value ? periods.indexOf(value) : -1;
  const go = (delta: number) => {
    const next = index + delta;
    if (next >= 0 && next < periods.length) onChange(periods[next]);
  };

  const displayPeriods = useMemo(() => {
    if (freq !== "D" || periods.length <= 200) return periods;
    // For daily data show only every Nth to keep select manageable
    const step = Math.ceil(periods.length / 200);
    const sampled = periods.filter((_, i) => i % step === 0 || i === periods.length - 1);
    if (value && !sampled.includes(value)) sampled.push(value);
    return sampled.sort();
  }, [periods, freq, value]);

  return (
    <div className="inline-flex items-center rounded-md border border-stone-300 bg-white">
      <button
        onClick={() => go(-1)}
        disabled={index <= 0}
        className="px-2 py-1.5 text-stone-500 transition hover:text-stone-900 disabled:opacity-30"
        aria-label="Periodo anterior"
      >
        ‹
      </button>
      <select
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        className="border-x border-stone-200 bg-transparent px-2 py-1.5 text-sm text-stone-800 focus:outline-none"
      >
        {[...displayPeriods].reverse().map((period) => (
          <option key={period} value={period}>
            {formatPeriod(period, freq)}
          </option>
        ))}
      </select>
      <button
        onClick={() => go(1)}
        disabled={index < 0 || index >= periods.length - 1}
        className="px-2 py-1.5 text-stone-500 transition hover:text-stone-900 disabled:opacity-30"
        aria-label="Periodo siguiente"
      >
        ›
      </button>
    </div>
  );
}

function AboutButton({ dataset }: { dataset: Dataset }) {
  return (
    <div className="group relative">
      <button className="rounded-full border border-stone-300 px-3 py-1.5 text-xs text-stone-500 transition hover:border-stone-500 hover:text-stone-900">
        Acerca de
      </button>
      <div className="invisible absolute right-0 z-20 mt-2 w-80 translate-y-1 rounded-md border border-stone-200 bg-white p-4 text-left opacity-0 shadow-xl transition-all duration-150 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">Fuentes de datos</p>
        <ul className="mt-3 space-y-3">
          {dataset.sources.map((source) => (
            <li key={source.url}>
              <a
                href={source.url}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-medium text-stone-900 underline-offset-2 hover:underline"
              >
                {source.name}
              </a>
              <p className="mt-0.5 text-xs leading-relaxed text-stone-500">{source.detail}</p>
            </li>
          ))}
        </ul>
        <p className="mt-3 border-t border-stone-100 pt-3 text-xs text-stone-400">
          {dataset.countries.length} paises · actualizado {dataset.updatedAt}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Country-scope time series (with map, ranking, comparison)
// ---------------------------------------------------------------------------

function CountryTimeSeries({
  rows,
  metric,
  freq,
  periods,
  marker
}: {
  rows: CountryRow[];
  metric: MetricKey;
  freq: Frequency;
  periods: string[];
  marker: string | null;
}) {
  const { selected } = useMacroStore();
  const meta = metricMeta(metric);
  const isCompare = selected.length > 0;

  const option: EChartsOption = useMemo(() => {
    const chartPeriods = freq === "D" && periods.length > 500 ? periods.slice(-500) : periods;
    const series = rows.map((country, index) => ({
      name: country.name,
      type: "line" as const,
      smooth: true,
      symbol: "circle",
      symbolSize: 3,
      connectNulls: true,
      lineStyle: { width: 2 },
      itemStyle: { color: LINE_COLORS[index % LINE_COLORS.length] },
      emphasis: { focus: "series" as const },
      data: chartPeriods.map((period) => valueAt(country, metric, freq, period)),
      ...(index === 0 && marker
        ? {
            markLine: {
              silent: true,
              symbol: "none",
              lineStyle: { color: "#b9a87f", type: "dashed" as const, width: 1 },
              label: { show: false },
              data: [{ xAxis: formatPeriod(marker, freq) }]
            }
          }
        : {})
    }));

    return {
      color: LINE_COLORS,
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        borderWidth: 0,
        backgroundColor: "rgba(28,31,28,0.92)",
        textStyle: { color: "#f4f3ee", fontSize: 12 },
        valueFormatter: (value) => (value == null ? "s/d" : formatValue(Number(value), metric))
      },
      legend: {
        bottom: 0,
        type: "scroll",
        icon: "roundRect",
        itemWidth: 10,
        itemHeight: 4,
        textStyle: { color: "#6b6f68", fontSize: 11 }
      },
      grid: { left: 8, right: 18, top: 16, bottom: 44, containLabel: true },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: (freq === "D" && periods.length > 500 ? periods.slice(-500) : periods).map((p) => formatPeriod(p, freq)),
        axisTick: { show: false },
        axisLine: { lineStyle: { color: "#dcdbd2" } },
        axisLabel: { color: "#8a8d86", fontSize: 11, hideOverlap: true }
      },
      yAxis: {
        type: "value",
        scale: true,
        splitLine: { lineStyle: { color: "#ecebe3" } },
        axisLabel: { color: "#8a8d86", fontSize: 11, formatter: (value: number) => formatValue(value, metric) }
      },
      series
    };
  }, [rows, metric, freq, periods, marker]);

  return (
    <section className="rounded-md border border-stone-200 bg-white/70 p-5">
      <div className="mb-1 flex items-baseline justify-between">
        <h2 className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
          {isCompare ? "Comparativa" : "Evolucion historica"}
        </h2>
        <span className="text-xs text-stone-400">
          {meta.label} · {frequencyLabels[freq].adjective}
        </span>
      </div>
      {!isCompare && (
        <p className="mb-2 text-xs text-stone-400">
          Selecciona paises en la lista o el mapa para compararlos (hasta {MAX_COMPARE}). Mostrando el top actual.
        </p>
      )}
      <Chart option={option} height={260} />
    </section>
  );
}

// ---------------------------------------------------------------------------
// Global-scope time series (no map — just a large chart)
// ---------------------------------------------------------------------------

function GlobalTimeSeries({
  global,
  metric,
  freq,
  periods
}: {
  global: GlobalIndicators;
  metric: MetricKey;
  freq: Frequency;
  periods: string[];
}) {
  const meta = metricMeta(metric);
  const tab = tabForMetric(metric);

  const option: EChartsOption = useMemo(() => {
    const chartPeriods = freq === "D" && periods.length > 500 ? periods.slice(-500) : periods;
    const globalMetrics = tab.metrics.filter((m) => m.scope === "global" || m.scope === "globalMulti");
    const series = globalMetrics.flatMap((m, index) => {
      const gKey = m.globalKeys?.[0];
      if (!gKey) return [];
      const data = globalSeriesAt(global, gKey, freq);
      return [
        {
          name: m.short,
          type: "line" as const,
          smooth: true,
          symbol: "none" as const,
          lineStyle: { width: 2 },
          itemStyle: { color: LINE_COLORS[index % LINE_COLORS.length] },
          emphasis: { focus: "series" as const },
          data: chartPeriods.map((p) => data[p] ?? null)
        }
      ];
    });

    return {
      color: LINE_COLORS,
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        borderWidth: 0,
        backgroundColor: "rgba(28,31,28,0.92)",
        textStyle: { color: "#f4f3ee", fontSize: 12 },
        valueFormatter: (value) => (value == null ? "s/d" : formatValue(Number(value), metric))
      },
      legend: series.length > 1 ? {
        bottom: 0,
        type: "scroll",
        icon: "roundRect",
        itemWidth: 10,
        itemHeight: 4,
        textStyle: { color: "#6b6f68", fontSize: 11 }
      } : undefined,
      grid: { left: 8, right: 18, top: 16, bottom: series.length > 1 ? 44 : 24, containLabel: true },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: (freq === "D" && periods.length > 500 ? periods.slice(-500) : periods).map((p) => formatPeriod(p, freq)),
        axisTick: { show: false },
        axisLine: { lineStyle: { color: "#dcdbd2" } },
        axisLabel: { color: "#8a8d86", fontSize: 11, hideOverlap: true }
      },
      yAxis: {
        type: "value",
        scale: true,
        splitLine: { lineStyle: { color: "#ecebe3" } },
        axisLabel: { color: "#8a8d86", fontSize: 11 }
      },
      series
    };
  }, [global, metric, freq, periods, tab.metrics]);

  // Latest values as KPI cards
  const latestPeriod = periods.at(-1) ?? null;
  const kpis = tab.metrics
    .filter((m) => m.scope === "global" || m.scope === "globalMulti")
    .map((m) => {
      const gKey = m.globalKeys?.[0];
      const val = gKey ? globalValueAt(global, gKey, freq, latestPeriod) : null;
      return { label: m.short, value: val, metric: m.key };
    });

  return (
    <div className="space-y-5">
      {/* KPI row */}
      <div className="flex flex-wrap gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="flex-1 rounded-md border border-stone-200 bg-white/70 px-5 py-5 text-center min-w-[180px]">
            <p className="text-xs uppercase tracking-[0.18em] text-stone-400">{kpi.label}</p>
            <p className="mt-2 font-serif text-3xl font-medium tracking-tight text-stone-900">
              {formatValue(kpi.value, kpi.metric)}
            </p>
            {latestPeriod && (
              <p className="mt-1 text-xs text-stone-400">{formatPeriod(latestPeriod, freq)}</p>
            )}
          </div>
        ))}
      </div>
      {/* Chart */}
      <section className="rounded-md border border-stone-200 bg-white/70 p-5">
        <div className="mb-1 flex items-baseline justify-between">
          <h2 className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">Evolucion historica</h2>
          <span className="text-xs text-stone-400">
            {meta.label} · {frequencyLabels[freq].adjective}
          </span>
        </div>
        <Chart option={option} height={340} />
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Exchange rate (per-currency vs selectable base)
// ---------------------------------------------------------------------------

function sparkOption(values: Array<number | null>, color: string, formatter: (v: number) => string): EChartsOption {
  return {
    backgroundColor: "transparent",
    grid: { left: 0, right: 0, top: 6, bottom: 6 },
    xAxis: { type: "category", show: false, boundaryGap: false, data: values.map((_, i) => String(i)) },
    yAxis: { type: "value", scale: true, show: false },
    tooltip: {
      trigger: "axis",
      borderWidth: 0,
      backgroundColor: "rgba(28,31,28,0.92)",
      textStyle: { color: "#f4f3ee", fontSize: 11 },
      formatter: (params) => {
        const p = Array.isArray(params) ? params[0] : params;
        const v = p?.value;
        return v == null ? "s/d" : formatter(Number(v));
      }
    },
    series: [
      {
        type: "line",
        data: values,
        smooth: true,
        symbol: "none",
        lineStyle: { width: 1.5, color },
        areaStyle: { color: `${color}14` },
        connectNulls: true
      }
    ]
  };
}

function fmtRate(value: number) {
  const abs = Math.abs(value);
  const decimals = abs >= 100 ? 2 : abs >= 1 ? 4 : 6;
  return new Intl.NumberFormat("es-ES", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value);
}

function fmtPct(value: number | null) {
  if (value == null || Number.isNaN(value)) return "";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function BaseCurrencySelector() {
  const { baseCurrency, setBaseCurrency } = useMacroStore();
  return (
    <div className="inline-flex items-center gap-2">
      <span className="text-xs uppercase tracking-[0.18em] text-stone-400">Frente a</span>
      <div className="inline-flex items-center rounded-md border border-stone-300 bg-white pl-2">
        <Flag iso2={baseCurrencies.find((b) => b.code === baseCurrency)?.flag ?? "EU"} className="h-3.5 w-5 rounded-[2px] shadow-[0_0_0_1px_rgba(0,0,0,0.06)]" />
        <select
          value={baseCurrency}
          onChange={(event) => setBaseCurrency(event.target.value)}
          className="bg-transparent px-2 py-1.5 text-sm text-stone-800 focus:outline-none"
        >
          {baseCurrencies.map((b) => (
            <option key={b.code} value={b.code}>
              {b.code} · {b.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function FxView({ global }: { global: GlobalIndicators }) {
  const { baseCurrency } = useMacroStore();

  const cards = useMemo(() => {
    return fxCurrencies
      .filter((c) => c.code !== baseCurrency && global.fx?.[c.code])
      .map((c) => {
        const series = fxRateSeries(global, c.code, baseCurrency);
        const dates = Object.keys(series).sort();
        const trimmed = dates.length > 260 ? dates.slice(-260) : dates;
        const values = trimmed.map((d) => series[d]);
        const latest = values.length ? values[values.length - 1] : null;
        const prev = values.length ? values[Math.max(0, values.length - 22)] : null;
        const changePct = latest != null && prev != null && prev !== 0 ? ((latest - prev) / prev) * 100 : null;
        return { ...c, values, latest, changePct, date: trimmed[trimmed.length - 1] ?? null };
      })
      .filter((c) => c.latest != null);
  }, [global, baseCurrency]);

  return (
    <div className="space-y-4">
      <p className="text-xs text-stone-400">
        Cada divisa frente a la moneda base seleccionada (1 {baseCurrency} = X). Variacion del ultimo mes. Fuente: tipos de referencia del BCE (diarios).
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {cards.map((c) => (
          <div key={c.code} className="rounded-md border border-stone-200 bg-white/70 p-4">
            <div className="flex items-center gap-2">
              <Flag iso2={c.flag} className="h-4 w-6 rounded-[2px] shadow-[0_0_0_1px_rgba(0,0,0,0.06)]" />
              <span className="font-serif text-sm font-medium text-stone-900">
                {c.code} / {baseCurrency}
              </span>
              <span className="ml-auto text-xs text-stone-400">{c.label}</span>
            </div>
            <div className="mt-2 flex items-end justify-between">
              <span className="font-serif text-2xl font-medium tabular-nums tracking-tight text-stone-900">
                {c.latest != null ? fmtRate(c.latest) : "s/d"}
              </span>
              <span className={`text-xs font-medium tabular-nums ${(c.changePct ?? 0) >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                {fmtPct(c.changePct)}
              </span>
            </div>
            <div className="mt-2 h-10">
              <Chart option={sparkOption(c.values, (c.changePct ?? 0) >= 0 ? "#3f7155" : "#b5654f", fmtRate)} height={40} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stock indices (cards with country/region flag)
// ---------------------------------------------------------------------------

function IndicesView({ global }: { global: GlobalIndicators }) {
  const cards = useMemo(() => {
    return stockIndices
      .filter((ix) => {
        const s = global.indices?.[ix.key]?.D;
        return s && Object.keys(s).length > 0;
      })
      .map((ix) => {
        const series = global.indices[ix.key].D;
        const dates = Object.keys(series).sort();
        const trimmed = dates.length > 260 ? dates.slice(-260) : dates;
        const values = trimmed.map((d) => series[d]);
        const latest = values[values.length - 1];
        const prev = values[Math.max(0, values.length - 22)];
        const changePct = prev ? ((latest - prev) / prev) * 100 : null;
        return { ...ix, values, latest, changePct, date: trimmed[trimmed.length - 1] ?? null };
      });
  }, [global]);

  const fmtPoints = (v: number) => new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 }).format(v);

  return (
    <div className="space-y-4">
      <p className="text-xs text-stone-400">
        Principales indices bursatiles con la bandera del pais (o de la UE para los paneuropeos). Variacion del ultimo mes. Fuente: Yahoo Finance (diario).
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {cards.map((ix) => (
          <div key={ix.key} className="rounded-md border border-stone-200 bg-white/70 p-4">
            <div className="flex items-center gap-2">
              <Flag iso2={ix.flag} className="h-4 w-6 rounded-[2px] shadow-[0_0_0_1px_rgba(0,0,0,0.06)]" />
              <span className="font-serif text-sm font-medium text-stone-900">{ix.short}</span>
            </div>
            <p className="mt-0.5 truncate text-xs text-stone-400">{ix.label}</p>
            <div className="mt-2 flex items-end justify-between">
              <span className="font-serif text-2xl font-medium tabular-nums tracking-tight text-stone-900">{fmtPoints(ix.latest)}</span>
              <span className={`text-xs font-medium tabular-nums ${(ix.changePct ?? 0) >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                {fmtPct(ix.changePct)}
              </span>
            </div>
            <div className="mt-2 h-10">
              <Chart option={sparkOption(ix.values, (ix.changePct ?? 0) >= 0 ? "#3f7155" : "#b5654f", fmtPoints)} height={40} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Trade values & breakdown by category (UN Comtrade)
// ---------------------------------------------------------------------------

const CATEGORY_COLORS = [
  "#234c3a", "#c98a6b", "#6b8fb5", "#a98bbf", "#c7a93b", "#7a7d76",
  "#3f7155", "#b5654f", "#8a9a5b", "#bf8b6b", "#6b7fb5", "#9b7bb5"
];

function TradePanel({
  global,
  countries,
  freq,
  period
}: {
  global: GlobalIndicators;
  countries: CountryRow[];
  freq: Frequency;
  period: string | null;
}) {
  const {
    baseCurrency, tradeFlow, tradeCategory, setTradeCategory,
    focusedCountry, selected, continent
  } = useMacroStore();

  const factor = usdToBaseFactor(global, baseCurrency) ?? 1;
  const cats = global.tradeCategories ?? [];
  const catLabel = (key: string) => cats.find((c) => c.key === key)?.label ?? key;
  const periodLabel = period ? formatPeriod(period, freq) : "";

  // Countries with trade data for the active period, restricted to the continent.
  const tradeCountries = useMemo(
    () => countries.filter((c) => c.trade && (!continent || c.continent === continent) && tradeRecAt(c, freq, period) != null),
    [countries, continent, freq, period]
  );

  const selectedCountries = useMemo(
    () => selected.map((iso) => tradeCountries.find((c) => c.iso3 === iso)).filter((c): c is CountryRow => Boolean(c)),
    [selected, tradeCountries]
  );
  const multi = selectedCountries.length >= 2;

  // Active country for the single-country breakdown (follows focus/selection).
  const target =
    (focusedCountry && tradeCountries.find((c) => c.iso3 === focusedCountry)) ||
    selectedCountries[selectedCountries.length - 1] ||
    (selected.length === 0
      ? [...tradeCountries].sort((a, b) => (tradeRecAt(b, freq, period)!.exports) - (tradeRecAt(a, freq, period)!.exports))[0]
      : null) ||
    null;

  // Category value for a country, scaled from the annual breakdown to the period.
  const catValue = (c: CountryRow, cat: string): number => {
    const rec = tradeRecAt(c, freq, period);
    const t = c.trade;
    if (!rec || !t) return 0;
    const expScale = t.exports.total ? rec.exports / t.exports.total : 0;
    const impScale = t.imports.total ? rec.imports / t.imports.total : 0;
    const exp = (t.exports.categories[cat] ?? 0) * expScale;
    const imp = (t.imports.categories[cat] ?? 0) * impScale;
    return (tradeFlow === "exports" ? exp : tradeFlow === "imports" ? imp : exp - imp) * factor;
  };

  // Cross-country ranking when a category is selected (limited to the selection
  // when several countries are selected, otherwise the whole scope).
  const ranking = useMemo(() => {
    if (!tradeCategory) return [];
    const base = multi ? selectedCountries : tradeCountries;
    return base
      .map((c) => ({ country: c, value: catValue(c, tradeCategory) }))
      .filter((r) => r.value !== 0)
      .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
      .slice(0, 15);
  }, [tradeCountries, selectedCountries, multi, tradeCategory, tradeFlow, freq, period, factor]);

  // Single-country breakdown by category (no category filter, single country).
  const breakdown = useMemo(() => {
    if (tradeCategory || !target) return [];
    const keys = new Set([
      ...Object.keys(target.trade!.exports.categories),
      ...Object.keys(target.trade!.imports.categories)
    ]);
    return Array.from(keys)
      .map((key) => ({ key, label: catLabel(key), value: catValue(target, key) }))
      .filter((r) => r.value !== 0)
      .sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
  }, [target, tradeCategory, tradeFlow, freq, period, factor]);

  const flowWord = tradeFlow === "exports" ? "Exportaciones" : tradeFlow === "imports" ? "Importaciones" : "Balanza (exp. - imp.)";

  // Horizontal bars for ranking / breakdown.
  const horizontalBars = (rows: Array<{ name: string; value: number }>): EChartsOption => {
    const ordered = [...rows].reverse();
    return {
      backgroundColor: "transparent",
      grid: { left: 8, right: 90, top: 8, bottom: 8, containLabel: true },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        borderWidth: 0,
        backgroundColor: "rgba(28,31,28,0.92)",
        textStyle: { color: "#f4f3ee", fontSize: 12 },
        valueFormatter: (v) => (v == null ? "s/d" : formatMoney(Number(v), baseCurrency))
      },
      xAxis: { type: "value", axisLabel: { show: false }, splitLine: { lineStyle: { color: "#ecebe3" } } },
      yAxis: {
        type: "category",
        data: ordered.map((r) => r.name),
        axisTick: { show: false },
        axisLine: { lineStyle: { color: "#dcdbd2" } },
        axisLabel: { color: "#6b6f68", fontSize: 12 }
      },
      series: [
        {
          type: "bar",
          data: ordered.map((r, i) => ({
            value: r.value,
            itemStyle: { color: CATEGORY_COLORS[(ordered.length - 1 - i) % CATEGORY_COLORS.length], borderRadius: [0, 3, 3, 0] }
          })),
          barWidth: "62%",
          label: {
            show: true,
            position: "right",
            color: "#8a8d86",
            fontSize: 11,
            formatter: (p) => formatMoney(Number(p.value), baseCurrency)
          }
        }
      ]
    };
  };

  // Grouped vertical bars (exports vs imports per country) for comparison.
  const comparisonOption: EChartsOption = useMemo(() => {
    const labels = selectedCountries.map((c) => c.name);
    const recOf = (c: CountryRow) => tradeRecAt(c, freq, period);
    const series =
      tradeFlow === "exports"
        ? [{ name: "Exportaciones", color: "#3f7155", data: selectedCountries.map((c) => (recOf(c)?.exports ?? 0) * factor) }]
        : tradeFlow === "imports"
        ? [{ name: "Importaciones", color: "#c98a6b", data: selectedCountries.map((c) => (recOf(c)?.imports ?? 0) * factor) }]
        : [
            { name: "Exportaciones", color: "#3f7155", data: selectedCountries.map((c) => (recOf(c)?.exports ?? 0) * factor) },
            { name: "Importaciones", color: "#c98a6b", data: selectedCountries.map((c) => (recOf(c)?.imports ?? 0) * factor) }
          ];
    return {
      backgroundColor: "transparent",
      grid: { left: 8, right: 16, top: 28, bottom: 8, containLabel: true },
      legend: { top: 0, right: 0, textStyle: { color: "#6b6f68", fontSize: 11 }, itemWidth: 12, itemHeight: 8 },
      tooltip: {
        trigger: "axis",
        borderWidth: 0,
        backgroundColor: "rgba(28,31,28,0.92)",
        textStyle: { color: "#f4f3ee", fontSize: 12 },
        valueFormatter: (v) => (v == null ? "s/d" : formatMoney(Number(v), baseCurrency))
      },
      xAxis: {
        type: "category",
        data: labels,
        axisTick: { show: false },
        axisLine: { lineStyle: { color: "#dcdbd2" } },
        axisLabel: { color: "#6b6f68", fontSize: 11, interval: 0 }
      },
      yAxis: { type: "value", axisLabel: { show: false }, splitLine: { lineStyle: { color: "#ecebe3" } } },
      series: series.map((s) => ({
        name: s.name,
        type: "bar",
        data: s.data,
        barMaxWidth: 32,
        itemStyle: { color: s.color, borderRadius: [3, 3, 0, 0] }
      }))
    };
  }, [selectedCountries, tradeFlow, freq, period, factor, baseCurrency]);

  // Evolution over sub-annual periods for the active country.
  const evoFreq: Frequency = freq === "A" ? "Q" : freq;
  const evoOption: EChartsOption | null = useMemo(() => {
    const data = target?.trade?.freq?.[evoFreq]?.data;
    if (!data) return null;
    const periods = Object.keys(data).sort();
    if (!periods.length) return null;
    const labels = periods.map((p) => formatPeriod(p, evoFreq));
    const series =
      tradeFlow === "exports"
        ? [{ name: "Exportaciones", color: "#3f7155", data: periods.map((p) => data[p].exports * factor) }]
        : tradeFlow === "imports"
        ? [{ name: "Importaciones", color: "#c98a6b", data: periods.map((p) => data[p].imports * factor) }]
        : [
            { name: "Exportaciones", color: "#3f7155", data: periods.map((p) => data[p].exports * factor) },
            { name: "Importaciones", color: "#c98a6b", data: periods.map((p) => data[p].imports * factor) }
          ];
    return {
      backgroundColor: "transparent",
      grid: { left: 8, right: 16, top: 28, bottom: 8, containLabel: true },
      legend: { top: 0, right: 0, textStyle: { color: "#6b6f68", fontSize: 11 }, itemWidth: 12, itemHeight: 8 },
      tooltip: {
        trigger: "axis",
        borderWidth: 0,
        backgroundColor: "rgba(28,31,28,0.92)",
        textStyle: { color: "#f4f3ee", fontSize: 12 },
        valueFormatter: (v) => (v == null ? "s/d" : formatMoney(Number(v), baseCurrency))
      },
      xAxis: {
        type: "category",
        data: labels,
        axisTick: { show: false },
        axisLine: { lineStyle: { color: "#dcdbd2" } },
        axisLabel: { color: "#6b6f68", fontSize: 11 }
      },
      yAxis: { type: "value", axisLabel: { show: false }, splitLine: { lineStyle: { color: "#ecebe3" } } },
      series: series.map((s) => ({
        name: s.name,
        type: "bar",
        data: s.data,
        barMaxWidth: 18,
        itemStyle: { color: s.color, borderRadius: [3, 3, 0, 0] }
      }))
    };
  }, [target, evoFreq, tradeFlow, factor, baseCurrency]);

  const targetRec = target ? tradeRecAt(target, freq, period) : null;

  return (
    <section className="rounded-md border border-stone-200 bg-white/70 p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
          Valores de comercio por categoria
          {periodLabel && <span className="ml-2 normal-case tracking-normal text-stone-400">· {periodLabel}</span>}
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center gap-2">
            <span className="text-xs uppercase tracking-[0.18em] text-stone-400">Categoria</span>
            <select
              value={tradeCategory ?? ""}
              onChange={(event) => setTradeCategory(event.target.value || null)}
              className="rounded-md border border-stone-300 bg-white px-2 py-1.5 text-sm text-stone-800 focus:outline-none"
            >
              <option value="">Todas (desglose por pais)</option>
              {cats.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {tradeCountries.length === 0 ? (
        <p className="py-8 text-center text-sm text-stone-400">Sin datos de comercio para este periodo.</p>
      ) : tradeCategory ? (
        <>
          <p className="mb-3 text-xs text-stone-400">
            {flowWord} de <span className="font-medium text-stone-600">{catLabel(tradeCategory)}</span> ·{" "}
            {multi ? "comparativa de paises seleccionados" : "ranking de paises"} (valor en {baseCurrency}
            {periodLabel ? `, ${periodLabel}` : ""})
          </p>
          <Chart option={horizontalBars(ranking.map((r) => ({ name: r.country.name, value: r.value })))} height={Math.max(220, ranking.length * 28)} />
        </>
      ) : multi ? (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="text-xs text-stone-400">Comparativa de</span>
            {selectedCountries.map((c) => (
              <span key={c.iso3} className="inline-flex items-center gap-1">
                <Flag iso2={c.iso2} className="h-3.5 w-5 rounded-[2px] shadow-[0_0_0_1px_rgba(0,0,0,0.06)]" />
                <span className="text-xs text-stone-600">{c.name}</span>
              </span>
            ))}
            <span className="text-xs text-stone-400">· {flowWord.toLowerCase()} (valor en {baseCurrency}{periodLabel ? `, ${periodLabel}` : ""})</span>
          </div>
          <Chart option={comparisonOption} height={300} />
        </>
      ) : target && targetRec ? (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Flag iso2={target.iso2} className="h-5 w-7 rounded-[2px] shadow-[0_0_0_1px_rgba(0,0,0,0.06)]" />
              <span className="font-serif text-lg font-medium text-stone-900">{target.name}</span>
              {periodLabel && <span className="text-xs text-stone-400">· {periodLabel}</span>}
            </div>
            <div className="ml-auto flex gap-5 text-right">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-stone-400">Exportaciones</p>
                <p className="font-serif text-lg text-stone-900">{formatMoney(targetRec.exports * factor, baseCurrency)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-stone-400">Importaciones</p>
                <p className="font-serif text-lg text-stone-900">{formatMoney(targetRec.imports * factor, baseCurrency)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-stone-400">Balanza</p>
                <p className="font-serif text-lg text-stone-900">
                  {formatMoney((targetRec.exports - targetRec.imports) * factor, baseCurrency)}
                </p>
              </div>
            </div>
          </div>
          <p className="mb-2 text-xs text-stone-400">
            {flowWord} por categoria de producto. Selecciona varios paises para comparar.
          </p>
          <Chart option={horizontalBars(breakdown.map((r) => ({ name: r.label, value: r.value })))} height={Math.max(220, breakdown.length * 30)} />
          {evoOption && (
            <div className="mt-6 border-t border-stone-200 pt-4">
              <p className="mb-2 text-xs text-stone-400">
                Evolucion {frequencyLabels[evoFreq].adjective} · {flowWord.toLowerCase()} (valor en {baseCurrency})
              </p>
              <Chart option={evoOption} height={220} />
            </div>
          )}
        </>
      ) : (
        <p className="py-8 text-center text-sm text-stone-400">Selecciona un pais con datos de comercio.</p>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Category pills + tab navigation
// ---------------------------------------------------------------------------

function CategoryNav({ active, onChange }: { active: string; onChange: (key: string) => void }) {
  return (
    <nav className="flex flex-wrap gap-2">
      {categories.map((cat) => {
        const isActive = active === cat.key;
        return (
          <button
            key={cat.key}
            onClick={() => onChange(cat.key)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              isActive
                ? "bg-stone-900 text-stone-50"
                : "bg-stone-100 text-stone-500 hover:bg-stone-200 hover:text-stone-800"
            }`}
          >
            {cat.label}
          </button>
        );
      })}
    </nav>
  );
}

function TabNav({ tabs, active, onChange }: { tabs: TabConfig[]; active: string; onChange: (metric: MetricKey) => void }) {
  return (
    <nav className="-mb-px flex flex-wrap items-center gap-x-5 gap-y-2">
      {tabs.map((item) => {
        const isActive = active === item.key;
        return (
          <span key={item.key} className="flex items-center gap-1.5 pb-3">
            <button
              onClick={() => onChange(item.metrics[0].key)}
              className={`border-b-2 pb-3 -mb-3 text-sm transition ${
                isActive
                  ? "border-stone-900 font-medium text-stone-900"
                  : "border-transparent text-stone-500 hover:text-stone-800"
              }`}
            >
              {item.label}
            </button>
            {item.desc && <InfoTip text={item.desc} />}
          </span>
        );
      })}
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Main Dashboard
// ---------------------------------------------------------------------------

export function Dashboard() {
  const state = useDataset();
  const {
    category, setCategory,
    metric, setMetric,
    frequency, setFrequency,
    period, setPeriod,
    continent, selected, search,
    focusedCountry, reset, clearSelection,
    baseCurrency, tradeFlow, setTradeFlow,
    tradeMetric, setTradeMetric
  } = useMacroStore();
  const tradeShare = tradeMetric === "share";

  const data = state.status === "ready" ? state.data : null;
  const countries = useMemo(() => data?.countries ?? [], [data]);

  const cat = categories.find((c) => c.key === category) ?? categories[0];
  const tab = tabForMetric(metric);
  const meta = metricConfig(metric);
  const view = tab.view;
  const isGlobal = meta.scope === "global" || meta.scope === "globalMulti";

  // Periods available for current metric/frequency
  const { metricPeriods, defaultPeriod } = useMemo(() => {
    const all = data?.periods[frequency] ?? [];

    if (isGlobal) {
      const gKey = meta.globalKeys?.[0];
      if (gKey && data?.global) {
        const series = globalSeriesAt(data.global, gKey, frequency);
        const withData = all.filter((p) => series[p] != null);
        return { metricPeriods: withData, defaultPeriod: withData.at(-1) ?? null };
      }
      return { metricPeriods: all, defaultPeriod: all.at(-1) ?? null };
    }

    const counts = all.map((p) => countries.reduce((n, c) => n + (valueAt(c, metric, frequency, p) != null ? 1 : 0), 0));
    const withData = all.filter((_, i) => counts[i] > 0);
    const threshold = Math.max(0, ...counts) * 0.5;
    let def: string | null = null;
    for (let i = all.length - 1; i >= 0; i -= 1) {
      if (counts[i] > 0 && counts[i] >= threshold) {
        def = all[i];
        break;
      }
    }
    return { metricPeriods: withData, defaultPeriod: def ?? withData.at(-1) ?? null };
  }, [data, countries, metric, frequency, isGlobal, meta.globalKeys]);

  const isTrade = view === "trade";
  const tradeMode: TradeMode = tradeShare ? "share" : "value";
  const tradeFactor = data ? usdToBaseFactor(data.global, baseCurrency) ?? 1 : 1;

  // Trade uses its own period catalogue (annual/quarterly/monthly), independent
  // from the generic dataset periods, since trade has its own coverage.
  const activePeriods = isTrade ? data?.tradePeriods?.[frequency] ?? [] : metricPeriods;
  const effectivePeriod = isTrade
    ? (period && activePeriods.includes(period) ? period : activePeriods.at(-1) ?? null)
    : (period && metricPeriods.includes(period) ? period : defaultPeriod) ?? null;

  // Single resolver used across list / map / KPIs so everything stays in sync
  // with mode (variacion/valor), flow (total/exp/imp), frequency and period.
  const tradeResolve = (country: CountryRow): number | null =>
    tradeValueAt(country, { mode: tradeMode, flow: tradeFlow, freq: frequency, period: effectivePeriod, factor: tradeFactor });
  const tradeFmt = (value: number | null): string =>
    value == null ? "s/d" : tradeShare ? formatValue(value, "tradeBalance") : formatMoney(value, baseCurrency);

  const scopeRows = useMemo(
    () => (continent ? countries.filter((country) => country.continent === continent) : countries),
    [countries, continent]
  );

  const listRows = useMemo(() => {
    const query = normalize(search.trim());
    if (!query) return scopeRows;
    return scopeRows.filter((country) => normalize(country.name).includes(query));
  }, [scopeRows, search]);

  const compareRows = useMemo(
    () => selected.map((iso3) => countries.find((country) => country.iso3 === iso3)).filter((c): c is CountryRow => Boolean(c)),
    [countries, selected]
  );

  const scopeLabel = continent ? continents.find((item) => item.key === continent)?.label ?? "Mundo" : "Mundo";
  const kpiRows = compareRows.length ? compareRows : scopeRows;
  const average = isGlobal
    ? null
    : isTrade
    ? averageBy(kpiRows, tradeResolve)
    : averageAt(kpiRows, metric, frequency, effectivePeriod);
  const { top, bottom } = isGlobal
    ? { top: null, bottom: null }
    : isTrade
    ? extremesBy(scopeRows, tradeResolve)
    : extremesAt(scopeRows, metric, frequency, effectivePeriod);
  const focused = focusedCountry ? countries.find((country) => country.iso3 === focusedCountry) ?? null : null;
  const seriesRows = compareRows.length ? compareRows : rankAt(scopeRows, metric, frequency, effectivePeriod).slice(0, 6);

  // Trade target (mirrors TradePanel selection) for synced insights/map.
  const tradeCountries = useMemo(() => countries.filter((c) => c.trade), [countries]);
  const tradeTarget = useMemo(() => {
    if (view !== "trade" || !tradeCountries.length) return null;
    return (
      (focusedCountry && tradeCountries.find((c) => c.iso3 === focusedCountry)) ||
      (selected.length ? tradeCountries.find((c) => selected.includes(c.iso3)) ?? null : null) ||
      [...tradeCountries].sort((a, b) => b.trade!.exports.total - a.trade!.exports.total)[0] ||
      null
    );
  }, [view, tradeCountries, focusedCountry, selected]);

  // Country whose series drives the insights for non-trade views.
  const insightSubject = focused ?? compareRows[0] ?? seriesRows[0] ?? null;

  const insights = useMemo(() => {
    if (!data) return [];
    return buildInsights({
      data,
      view,
      isGlobal,
      metric,
      freq: frequency,
      period: effectivePeriod,
      subject: insightSubject,
      compareRows,
      scopeLabel,
      baseCurrency,
      tradeFlow,
      tradeShare,
      tradeTarget,
      tradeFactor
    });
  }, [data, view, isGlobal, metric, frequency, effectivePeriod, insightSubject, compareRows, scopeLabel, baseCurrency, tradeFlow, tradeShare, tradeTarget, tradeFactor]);

  const insightsKey = `${view ?? "country"}-${metric}-${frequency}-${effectivePeriod ?? ""}-${tradeFlow}-${tradeShare ? "s" : "v"}-${selected.join(",")}-${insightSubject?.iso3 ?? tradeTarget?.iso3 ?? ""}`;

  if (state.status !== "ready" || !data) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f6f5f0] text-stone-500">
        {state.status === "error" ? (
          <div className="text-center">
            <p className="text-sm">No se pudieron cargar los datos.</p>
            <p className="mt-1 text-xs text-stone-400">{state.error}</p>
          </div>
        ) : (
          <p className="text-sm">Cargando datos macroeconomicos...</p>
        )}
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f5f0] text-stone-900">
      <header className="border-b border-stone-200">
        {/* Row 1: title + category pills */}
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-end justify-between gap-x-10 gap-y-3 px-6 pt-6 pb-3">
          <div className="flex flex-wrap items-end gap-x-10 gap-y-3">
            <div className="shrink-0">
              <p className="text-xs uppercase tracking-[0.32em] text-stone-400">Macroeconomic Atlas</p>
              <h1 className="mt-1 font-serif text-3xl font-medium tracking-tight text-stone-900">{cat.label}</h1>
            </div>
            {/* Categories first */}
            <CategoryNav active={category} onChange={setCategory} />
          </div>
          <AboutButton dataset={data} />
        </div>
        {/* Row 2: indicators (left) + their secondary controls (right) */}
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-stone-100 px-6 py-3">
          <TabNav tabs={cat.tabs} active={tab.key} onChange={setMetric} />
          <div className="flex flex-wrap items-center gap-3">
            {tab.metrics.length > 1 && (
              <Segmented
                options={tab.metrics.map((item) => ({ key: item.key, label: item.short }))}
                value={metric}
                onChange={setMetric}
              />
            )}
            {!view && meta.freqs.length > 1 && (
              <Segmented
                options={meta.freqs.map((f) => ({ key: f, label: frequencyLabels[f].short }))}
                value={frequency}
                onChange={setFrequency}
              />
            )}
            {view === "fx" && <BaseCurrencySelector />}
            {view === "trade" && (
              <>
                <Segmented
                  options={[{ key: "share", label: "Variacion" }, { key: "value", label: "Valor" }]}
                  value={tradeMetric}
                  onChange={setTradeMetric}
                />
                <Segmented
                  options={[{ key: "total", label: "Total" }, { key: "exports", label: "Exportaciones" }, { key: "imports", label: "Importaciones" }]}
                  value={tradeFlow}
                  onChange={setTradeFlow}
                />
                {meta.freqs.length > 1 && (
                  <Segmented
                    options={meta.freqs.map((f) => ({ key: f, label: frequencyLabels[f].short }))}
                    value={frequency}
                    onChange={setFrequency}
                  />
                )}
                {!tradeShare && <BaseCurrencySelector />}
              </>
            )}
            {!view && meta.freqs.length > 1 && (
              <Segmented
                options={meta.freqs.map((f) => ({ key: f, label: frequencyLabels[f].short }))}
                value={frequency}
                onChange={setFrequency}
              />
            )}
            {(!view || view === "trade") && (
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-[0.18em] text-stone-400">Periodo</span>
                <PeriodSelector periods={activePeriods} value={effectivePeriod} freq={frequency} onChange={setPeriod} />
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Dynamic insights carousel (replaces the secondary-controls strip) */}
      <div className="border-b border-stone-200 bg-stone-50/60">
        <div className="mx-auto max-w-[1500px] px-6 py-3">
          <div className="mb-1.5 flex items-center gap-2">
            <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-stone-400">Insights automaticos</span>
            <span className="text-[10px] text-stone-300">· generados a partir de los datos en pantalla</span>
          </div>
          <InsightsCarousel key={insightsKey} insights={insights} />
        </div>
      </div>

      <div className="mx-auto max-w-[1500px] px-6 py-6">
        {view === "fx" ? (
          <FxView global={data.global} />
        ) : view === "indices" ? (
          <IndicesView global={data.global} />
        ) : isGlobal ? (
          /* GLOBAL indicator layout — large chart, no map */
          <GlobalTimeSeries global={data.global} metric={metric} freq={frequency} periods={metricPeriods} />
        ) : (
          /* COUNTRY indicator layout — map + ranking + comparison */
          <>
            <div className="grid gap-5 lg:grid-cols-[280px_1fr_236px]">
              {/* Left: search + countries */}
              <aside className="flex max-h-[640px] flex-col rounded-md border border-stone-200 bg-white/70">
                <div className="border-b border-stone-200">
                  <div className="flex items-center justify-between px-3 pt-3">
                    <h2 className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">Paises</h2>
                    <span className="text-[10px] uppercase tracking-wider text-stone-400">
                      {isTrade
                        ? `${tradeFlow === "exports" ? "Export." : tradeFlow === "imports" ? "Import." : "Balanza"} · ${tradeShare ? "% PIB" : baseCurrency}`
                        : `${meta.unit} · ${frequencyLabels[frequency].adjective}`}
                    </span>
                  </div>
                  <SearchBox />
                </div>
                <div className="flex-1 overflow-y-auto">
                  <CountryList
                    rows={listRows}
                    metric={metric}
                    freq={frequency}
                    period={effectivePeriod}
                    resolve={isTrade ? tradeResolve : undefined}
                    fmt={isTrade ? tradeFmt : undefined}
                  />
                </div>
              </aside>

              {/* Center: map */}
              <section className="relative flex min-h-[520px] flex-col overflow-hidden rounded-md border border-stone-200 bg-white/70">
                <div className="flex items-center justify-between gap-3 px-5 pt-4">
                  <h2 className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
                    {compareRows.length > 0 ? (
                      <span className="flex flex-wrap items-center gap-1.5">
                        {compareRows.map((c) => (
                          <Flag
                            key={c.iso3}
                            iso2={c.iso2}
                            className="h-4 w-6 rounded-[2px] shadow-[0_0_0_1px_rgba(0,0,0,0.06)]"
                          />
                        ))}
                        {compareRows.length === 1 && (
                          <span className="normal-case tracking-normal text-stone-700">{compareRows[0].name}</span>
                        )}
                      </span>
                    ) : (
                      <span>{scopeLabel}</span>
                    )}
                    {view === "trade" ? (
                      <span className="font-normal normal-case tracking-normal text-stone-400">
                        · {tradeFlow === "exports" ? "Exportaciones" : tradeFlow === "imports" ? "Importaciones" : "Balanza comercial"} (
                        {tradeShare ? "% PIB" : baseCurrency}){effectivePeriod ? ` · ${formatPeriod(effectivePeriod, frequency)}` : ""}
                      </span>
                    ) : (
                      effectivePeriod && (
                        <span className="font-normal normal-case tracking-normal text-stone-400">
                          · {formatPeriod(effectivePeriod, frequency)}
                        </span>
                      )
                    )}
                  </h2>
                  <div className="flex shrink-0 items-center gap-3">
                    {selected.length > 0 && (
                      <button
                        onClick={clearSelection}
                        className="text-xs text-stone-400 underline-offset-2 hover:text-stone-700 hover:underline"
                      >
                        Reset seleccion
                      </button>
                    )}
                    {(focusedCountry || continent || search) && (
                      <button
                        onClick={reset}
                        className="text-xs text-stone-400 underline-offset-2 hover:text-stone-700 hover:underline"
                      >
                        Ver el mundo
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex-1">
                  {isTrade ? (
                    <WorldMap
                      metric={metric}
                      freq={frequency}
                      period={effectivePeriod}
                      rows={scopeRows}
                      allCountries={countries}
                      resolve={tradeResolve}
                      valueFmt={tradeFmt}
                      colorKind={tradeFlow === "total" ? "growth" : "level"}
                    />
                  ) : (
                    <WorldMap metric={metric} freq={frequency} period={effectivePeriod} rows={scopeRows} allCountries={countries} />
                  )}
                </div>
              </section>

              {/* Right: KPI + continent + extremes */}
              <aside className="flex flex-col gap-5">
                <div className="rounded-md border border-stone-200 bg-white/70 px-5 py-6 text-center">
                  <p className="text-xs uppercase tracking-[0.18em] text-stone-400">
                    Media · {compareRows.length ? `${compareRows.length} sel.` : scopeLabel}
                  </p>
                  <p className="mt-3 font-serif text-4xl font-medium tracking-tight text-stone-900">
                    {isTrade ? tradeFmt(average) : formatValue(average, metric)}
                  </p>
                  <p className="mt-2 text-xs text-stone-400">
                    {meta.label}
                    {effectivePeriod ? ` · ${formatPeriod(effectivePeriod, frequency)}` : ""}
                  </p>
                </div>

                <div className="rounded-md border border-stone-200 bg-white/70 p-4">
                  <h2 className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-stone-500">Continente</h2>
                  <ContinentFilter />
                </div>

                {top && bottom && (
                  <div className="space-y-3 rounded-md border border-stone-200 bg-white/70 p-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-stone-400">Mayor · {scopeLabel}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <Flag iso2={top.iso2} className="h-3.5 w-5 rounded-[2px] shadow-[0_0_0_1px_rgba(0,0,0,0.06)]" />
                        <span className="flex-1 truncate text-sm text-stone-700">{top.name}</span>
                        <span className="font-serif text-sm text-stone-900">
                          {isTrade ? tradeFmt(tradeResolve(top)) : formatValue(valueAt(top, metric, frequency, effectivePeriod), metric)}
                        </span>
                      </div>
                    </div>
                    <div className="border-t border-stone-100 pt-3">
                      <p className="text-[10px] uppercase tracking-wider text-stone-400">Menor · {scopeLabel}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <Flag iso2={bottom.iso2} className="h-3.5 w-5 rounded-[2px] shadow-[0_0_0_1px_rgba(0,0,0,0.06)]" />
                        <span className="flex-1 truncate text-sm text-stone-700">{bottom.name}</span>
                        <span className="font-serif text-sm text-stone-900">
                          {isTrade ? tradeFmt(tradeResolve(bottom)) : formatValue(valueAt(bottom, metric, frequency, effectivePeriod), metric)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </aside>
            </div>

            <div className="mt-5">
              {view === "trade" ? (
                <TradePanel global={data.global} countries={countries} freq={frequency} period={effectivePeriod} />
              ) : (
                <CountryTimeSeries rows={seriesRows} metric={metric} freq={frequency} periods={metricPeriods} marker={effectivePeriod} />
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
