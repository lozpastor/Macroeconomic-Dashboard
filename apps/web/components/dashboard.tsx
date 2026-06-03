"use client";

import { useMemo } from "react";
import type { EChartsOption } from "echarts";
import { continents, gdpMetrics, MAX_COMPARE, type GdpMetricKey } from "@/lib/demo-data";
import { latestValue, useDataset, type CountryRow, type Dataset } from "@/lib/dataset";
import { averageGdp, extremes, formatGdp, metricMeta, rankCountries } from "@/lib/analytics";
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

function CountryList({ rows }: { rows: CountryRow[] }) {
  const { metric, selected, toggleCountry } = useMacroStore();
  const ranked = rankCountries(rows, metric);

  if (!ranked.length) {
    return <p className="px-4 py-6 text-sm text-stone-400">Sin resultados.</p>;
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
                {formatGdp(latestValue(country, metric), metric)}
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
          {dataset.countries.length} paises · datos {dataset.range.start}–{dataset.range.end} · actualizado {dataset.updatedAt}
        </p>
      </div>
    </div>
  );
}

function TimeSeries({ rows, range }: { rows: CountryRow[]; range: { start: number; end: number } }) {
  const { metric, selected } = useMacroStore();
  const meta = metricMeta(metric);
  const isCompare = selected.length > 0;

  const option: EChartsOption = useMemo(() => {
    const yearsAxis: number[] = [];
    for (let year = range.start; year <= range.end; year += 1) yearsAxis.push(year);

    const series = rows.map((country, index) => ({
      name: country.name,
      type: "line" as const,
      smooth: true,
      symbol: "circle",
      symbolSize: 4,
      connectNulls: true,
      lineStyle: { width: 2 },
      itemStyle: { color: LINE_COLORS[index % LINE_COLORS.length] },
      emphasis: { focus: "series" as const },
      data: yearsAxis.map((year) => country.history[metric]?.[String(year)] ?? null)
    }));

    return {
      color: LINE_COLORS,
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        borderWidth: 0,
        backgroundColor: "rgba(28,31,28,0.92)",
        textStyle: { color: "#f4f3ee", fontSize: 12 },
        valueFormatter: (value) => (value == null ? "s/d" : formatGdp(Number(value), metric))
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
        data: yearsAxis.map(String),
        axisTick: { show: false },
        axisLine: { lineStyle: { color: "#dcdbd2" } },
        axisLabel: { color: "#8a8d86", fontSize: 11 }
      },
      yAxis: {
        type: "value",
        scale: true,
        splitLine: { lineStyle: { color: "#ecebe3" } },
        axisLabel: { color: "#8a8d86", fontSize: 11, formatter: (value: number) => formatGdp(value, metric) }
      },
      series
    };
  }, [rows, metric, range]);

  return (
    <section className="rounded-md border border-stone-200 bg-white/70 p-5">
      <div className="mb-1 flex items-baseline justify-between">
        <h2 className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
          {isCompare ? "Comparativa" : "Evolucion historica"}
        </h2>
        <span className="text-xs text-stone-400">
          {meta.label} · {range.start}–{range.end}
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

export function Dashboard() {
  const state = useDataset();
  const { metric, setMetric, continent, selected, search, focusedCountry, reset } = useMacroStore();

  const data = state.status === "ready" ? state.data : null;
  const countries = data?.countries ?? [];

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

  const meta = metricMeta(metric);
  const scopeLabel = continent ? continents.find((item) => item.key === continent)?.label ?? "Mundo" : "Mundo";

  const kpiRows = compareRows.length ? compareRows : scopeRows;
  const average = averageGdp(kpiRows, metric);
  const { top, bottom } = extremes(scopeRows, metric);
  const focused = focusedCountry ? countries.find((country) => country.iso3 === focusedCountry) ?? null : null;
  const seriesRows = compareRows.length ? compareRows : rankCountries(scopeRows, metric).slice(0, 6);

  if (state.status !== "ready") {
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
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-end justify-between gap-4 px-6 py-6">
          <div>
            <p className="text-xs uppercase tracking-[0.32em] text-stone-400">Macroeconomic Atlas</p>
            <h1 className="mt-1 font-serif text-3xl font-medium tracking-tight text-stone-900">Producto Interior Bruto</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="inline-flex rounded-md border border-stone-300 bg-white p-0.5">
              {gdpMetrics.map((item) => (
                <button
                  key={item.key}
                  onClick={() => setMetric(item.key)}
                  className={`rounded-[5px] px-3.5 py-1.5 text-sm transition ${
                    metric === item.key ? "bg-stone-900 text-stone-50" : "text-stone-500 hover:text-stone-900"
                  }`}
                >
                  {item.short}
                </button>
              ))}
            </div>
            <AboutButton dataset={data!} />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] px-6 py-6">
        <div className="grid gap-5 lg:grid-cols-[280px_1fr_236px]">
          {/* Left: search + countries */}
          <aside className="flex max-h-[640px] flex-col rounded-md border border-stone-200 bg-white/70">
            <div className="border-b border-stone-200">
              <div className="flex items-center justify-between px-3 pt-3">
                <h2 className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">Paises</h2>
                <span className="text-[10px] uppercase tracking-wider text-stone-400">{meta.unit}</span>
              </div>
              <SearchBox />
            </div>
            <div className="flex-1 overflow-y-auto">
              <CountryList rows={listRows} />
            </div>
          </aside>

          {/* Center: map */}
          <section className="relative flex min-h-[520px] flex-col overflow-hidden rounded-md border border-stone-200 bg-white/70">
            <div className="flex items-center justify-between px-5 pt-4">
              <h2 className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
                {focused ? focused.name : scopeLabel}
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
              <WorldMap metric={metric} rows={scopeRows} allCountries={countries} />
            </div>
          </section>

          {/* Right: KPI + continent + extremes */}
          <aside className="flex flex-col gap-5">
            <div className="rounded-md border border-stone-200 bg-white/70 px-5 py-6 text-center">
              <p className="text-xs uppercase tracking-[0.18em] text-stone-400">
                Media · {compareRows.length ? `${compareRows.length} sel.` : scopeLabel}
              </p>
              <p className="mt-3 font-serif text-4xl font-medium tracking-tight text-stone-900">
                {formatGdp(average, metric)}
              </p>
              <p className="mt-2 text-xs text-stone-400">{meta.label}</p>
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
                    <span className="font-serif text-sm text-stone-900">{formatGdp(latestValue(top, metric), metric)}</span>
                  </div>
                </div>
                <div className="border-t border-stone-100 pt-3">
                  <p className="text-[10px] uppercase tracking-wider text-stone-400">Menor · {scopeLabel}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <Flag iso2={bottom.iso2} className="h-3.5 w-5 rounded-[2px] shadow-[0_0_0_1px_rgba(0,0,0,0.06)]" />
                    <span className="flex-1 truncate text-sm text-stone-700">{bottom.name}</span>
                    <span className="font-serif text-sm text-stone-900">{formatGdp(latestValue(bottom, metric), metric)}</span>
                  </div>
                </div>
              </div>
            )}
          </aside>
        </div>

        <div className="mt-5">
          <TimeSeries rows={seriesRows} range={data!.range} />
        </div>
      </div>
    </main>
  );
}
