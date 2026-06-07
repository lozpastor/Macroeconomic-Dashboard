"use client";

import { useMemo } from "react";
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
  globalValueAt,
  globalSeriesAt,
  fxRateSeries,
  latestOf,
  usdToBaseFactor,
  type CountryRow,
  type Dataset,
  type GlobalIndicators
} from "@/lib/dataset";
import { averageAt, extremesAt, formatPeriod, formatValue, formatMoney, metricMeta, rankAt } from "@/lib/analytics";
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
  period
}: {
  rows: CountryRow[];
  metric: MetricKey;
  freq: Frequency;
  period: string | null;
}) {
  const { selected, toggleCountry } = useMacroStore();
  const ranked = rankAt(rows, metric, freq, period);

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
                {formatValue(valueAt(country, metric, freq, period), metric)}
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

function TradePanel({ global, countries }: { global: GlobalIndicators; countries: CountryRow[] }) {
  const {
    baseCurrency, tradeFlow, setTradeFlow, tradeCategory, setTradeCategory,
    focusedCountry, selected
  } = useMacroStore();

  const tradeCountries = useMemo(() => countries.filter((c) => c.trade), [countries]);
  const factor = usdToBaseFactor(global, baseCurrency) ?? 1;
  const categories = global.tradeCategories ?? [];
  const catLabel = (key: string) => categories.find((c) => c.key === key)?.label ?? key;

  const target =
    (focusedCountry && tradeCountries.find((c) => c.iso3 === focusedCountry)) ||
    (selected.length ? tradeCountries.find((c) => selected.includes(c.iso3)) : null) ||
    [...tradeCountries].sort((a, b) => (b.trade!.exports.total) - (a.trade!.exports.total))[0] ||
    null;

  // Cross-country ranking when a category filter is active.
  const ranking = useMemo(() => {
    if (!tradeCategory) return [];
    return tradeCountries
      .map((c) => {
        const flow = tradeFlow === "exports" ? c.trade!.exports : c.trade!.imports;
        const usd = flow.categories[tradeCategory] ?? 0;
        return { country: c, value: usd * factor };
      })
      .filter((r) => r.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 15);
  }, [tradeCountries, tradeCategory, tradeFlow, factor]);

  // Single-country breakdown when no category filter.
  const breakdown = useMemo(() => {
    if (tradeCategory || !target) return [];
    const flow = tradeFlow === "exports" ? target.trade!.exports : target.trade!.imports;
    return Object.entries(flow.categories)
      .map(([key, usd]) => ({ key, label: catLabel(key), value: usd * factor }))
      .filter((r) => r.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [target, tradeCategory, tradeFlow, factor]);

  const barOption: EChartsOption = useMemo(() => {
    const rows = tradeCategory
      ? ranking.map((r) => ({ name: r.country.name, value: r.value }))
      : breakdown.map((r) => ({ name: r.label, value: r.value }));
    const ordered = [...rows].reverse();
    return {
      backgroundColor: "transparent",
      grid: { left: 8, right: 80, top: 8, bottom: 8, containLabel: true },
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
  }, [ranking, breakdown, tradeCategory, baseCurrency]);

  const flowWord = tradeFlow === "exports" ? "Exportaciones" : "Importaciones";

  return (
    <section className="rounded-md border border-stone-200 bg-white/70 p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
          Valores de comercio por categoria
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <Segmented
            options={[{ key: "exports", label: "Exportaciones" }, { key: "imports", label: "Importaciones" }]}
            value={tradeFlow}
            onChange={setTradeFlow}
          />
          <BaseCurrencySelector />
          <div className="inline-flex items-center gap-2">
            <span className="text-xs uppercase tracking-[0.18em] text-stone-400">Categoria</span>
            <select
              value={tradeCategory ?? ""}
              onChange={(event) => setTradeCategory(event.target.value || null)}
              className="rounded-md border border-stone-300 bg-white px-2 py-1.5 text-sm text-stone-800 focus:outline-none"
            >
              <option value="">Todas (desglose por pais)</option>
              {categories.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {tradeCountries.length === 0 ? (
        <p className="py-8 text-center text-sm text-stone-400">Sin datos de comercio disponibles.</p>
      ) : tradeCategory ? (
        <>
          <p className="mb-3 text-xs text-stone-400">
            {flowWord} de <span className="font-medium text-stone-600">{catLabel(tradeCategory)}</span> · ranking de paises (valor en {baseCurrency})
          </p>
          <Chart option={barOption} height={Math.max(220, ranking.length * 28)} />
        </>
      ) : target ? (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Flag iso2={target.iso2} className="h-5 w-7 rounded-[2px] shadow-[0_0_0_1px_rgba(0,0,0,0.06)]" />
              <span className="font-serif text-lg font-medium text-stone-900">{target.name}</span>
              <span className="text-xs text-stone-400">· {target.trade!.year}</span>
            </div>
            <div className="ml-auto flex gap-5 text-right">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-stone-400">Exportaciones</p>
                <p className="font-serif text-lg text-stone-900">{formatMoney(target.trade!.exports.total * factor, baseCurrency)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-stone-400">Importaciones</p>
                <p className="font-serif text-lg text-stone-900">{formatMoney(target.trade!.imports.total * factor, baseCurrency)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-stone-400">Balanza</p>
                <p className="font-serif text-lg text-stone-900">
                  {formatMoney((target.trade!.exports.total - target.trade!.imports.total) * factor, baseCurrency)}
                </p>
              </div>
            </div>
          </div>
          <p className="mb-2 text-xs text-stone-400">
            {flowWord} por categoria de producto. Selecciona un pais en la lista para cambiar el detalle.
          </p>
          <Chart option={barOption} height={Math.max(220, breakdown.length * 30)} />
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
    <nav className="-mb-px flex flex-wrap gap-6">
      {tabs.map((item) => {
        const isActive = active === item.key;
        return (
          <button
            key={item.key}
            onClick={() => onChange(item.metrics[0].key)}
            className={`border-b-2 pb-3 text-sm transition ${
              isActive
                ? "border-stone-900 font-medium text-stone-900"
                : "border-transparent text-stone-500 hover:text-stone-800"
            }`}
          >
            {item.label}
          </button>
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
    focusedCountry, reset
  } = useMacroStore();

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

  const effectivePeriod = (period && metricPeriods.includes(period) ? period : defaultPeriod) ?? null;

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
  const average = isGlobal ? null : averageAt(kpiRows, metric, frequency, effectivePeriod);
  const { top, bottom } = isGlobal ? { top: null, bottom: null } : extremesAt(scopeRows, metric, frequency, effectivePeriod);
  const focused = focusedCountry ? countries.find((country) => country.iso3 === focusedCountry) ?? null : null;
  const seriesRows = compareRows.length ? compareRows : rankAt(scopeRows, metric, frequency, effectivePeriod).slice(0, 6);

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
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-end justify-between gap-4 px-6 pt-6 pb-4">
          <div>
            <p className="text-xs uppercase tracking-[0.32em] text-stone-400">Macroeconomic Atlas</p>
            <h1 className="mt-1 font-serif text-3xl font-medium tracking-tight text-stone-900">{cat.label}</h1>
          </div>
          <AboutButton dataset={data} />
        </div>
        {/* Category pills */}
        <div className="mx-auto max-w-[1500px] px-6 pb-4">
          <CategoryNav active={category} onChange={setCategory} />
        </div>
        {/* Indicator tabs within category */}
        <div className="mx-auto max-w-[1500px] px-6 border-t border-stone-100 pt-2">
          <TabNav tabs={cat.tabs} active={tab.key} onChange={setMetric} />
        </div>
      </header>

      {/* Controls bar: sub-metric, frequency, period */}
      <div className="border-b border-stone-200 bg-white/40">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-3 px-6 py-3">
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
          </div>
          {!view && (
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-[0.18em] text-stone-400">Periodo</span>
              <PeriodSelector periods={metricPeriods} value={effectivePeriod} freq={frequency} onChange={setPeriod} />
            </div>
          )}
          {view === "trade" && (
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-[0.18em] text-stone-400">Periodo (% PIB)</span>
              <PeriodSelector periods={metricPeriods} value={effectivePeriod} freq={frequency} onChange={setPeriod} />
            </div>
          )}
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
                      {meta.unit} · {frequencyLabels[frequency].adjective}
                    </span>
                  </div>
                  <SearchBox />
                </div>
                <div className="flex-1 overflow-y-auto">
                  <CountryList rows={listRows} metric={metric} freq={frequency} period={effectivePeriod} />
                </div>
              </aside>

              {/* Center: map */}
              <section className="relative flex min-h-[520px] flex-col overflow-hidden rounded-md border border-stone-200 bg-white/70">
                <div className="flex items-center justify-between px-5 pt-4">
                  <h2 className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
                    {focused ? focused.name : scopeLabel}
                    {effectivePeriod && (
                      <span className="ml-2 font-normal normal-case tracking-normal text-stone-400">
                        · {formatPeriod(effectivePeriod, frequency)}
                      </span>
                    )}
                  </h2>
                  {(focusedCountry || continent || search) && (
                    <button
                      onClick={reset}
                      className="text-xs text-stone-400 underline-offset-2 hover:text-stone-700 hover:underline"
                    >
                      Ver el mundo
                    </button>
                  )}
                </div>
                <div className="flex-1">
                  <WorldMap metric={metric} freq={frequency} period={effectivePeriod} rows={scopeRows} allCountries={countries} />
                </div>
              </section>

              {/* Right: KPI + continent + extremes */}
              <aside className="flex flex-col gap-5">
                <div className="rounded-md border border-stone-200 bg-white/70 px-5 py-6 text-center">
                  <p className="text-xs uppercase tracking-[0.18em] text-stone-400">
                    Media · {compareRows.length ? `${compareRows.length} sel.` : scopeLabel}
                  </p>
                  <p className="mt-3 font-serif text-4xl font-medium tracking-tight text-stone-900">
                    {formatValue(average, metric)}
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
                          {formatValue(valueAt(top, metric, frequency, effectivePeriod), metric)}
                        </span>
                      </div>
                    </div>
                    <div className="border-t border-stone-100 pt-3">
                      <p className="text-[10px] uppercase tracking-wider text-stone-400">Menor · {scopeLabel}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <Flag iso2={bottom.iso2} className="h-3.5 w-5 rounded-[2px] shadow-[0_0_0_1px_rgba(0,0,0,0.06)]" />
                        <span className="flex-1 truncate text-sm text-stone-700">{bottom.name}</span>
                        <span className="font-serif text-sm text-stone-900">
                          {formatValue(valueAt(bottom, metric, frequency, effectivePeriod), metric)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </aside>
            </div>

            <div className="mt-5">
              {view === "trade" ? (
                <TradePanel global={data.global} countries={countries} />
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
