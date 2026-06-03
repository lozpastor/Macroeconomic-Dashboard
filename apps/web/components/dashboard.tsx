"use client";

import { useMemo } from "react";
import type { EChartsOption } from "echarts";
import { countries, continents, gdpMetrics, years, type CountryPoint } from "@/lib/demo-data";
import { averageGdp, extremes, formatGdp, metricMeta, rankCountries } from "@/lib/analytics";
import { useMacroStore } from "@/lib/store";
import { Flag } from "./flag";
import { WorldMap } from "./world-map";
import { Chart } from "./chart";

const LINE_COLORS = ["#234c3a", "#c98a6b", "#6b8fb5", "#a98bbf", "#c7a93b", "#7a7d76"];

function CountryList({ rows }: { rows: CountryPoint[] }) {
  const { metric, focusedCountry, focusCountry } = useMacroStore();
  const ranked = rankCountries(rows, metric);

  return (
    <ul className="flex flex-col">
      {ranked.map((country) => {
        const active = focusedCountry === country.iso3;
        return (
          <li key={country.iso3}>
            <button
              onClick={() => focusCountry(country.iso3)}
              className={`group flex w-full items-center gap-3 border-l-2 px-3 py-2.5 text-left transition ${
                active
                  ? "border-stone-800 bg-stone-900/[0.04]"
                  : "border-transparent hover:bg-stone-900/[0.03]"
              }`}
            >
              <Flag iso2={country.iso2} className="h-4 w-6 shrink-0 rounded-[2px] object-cover shadow-[0_0_0_1px_rgba(0,0,0,0.06)]" />
              <span className="flex-1 truncate text-sm text-stone-700">{country.name}</span>
              <span className="font-serif text-sm tabular-nums text-stone-900">
                {formatGdp(country.latest[metric], metric)}
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

function TimeSeries({ rows }: { rows: CountryPoint[] }) {
  const { metric, focusedCountry } = useMacroStore();
  const meta = metricMeta(metric);

  const option: EChartsOption = useMemo(() => {
    const series = rows.map((country, index) => {
      const dimmed = focusedCountry && focusedCountry !== country.iso3;
      return {
        name: country.name,
        type: "line" as const,
        smooth: true,
        symbol: "circle",
        symbolSize: 5,
        lineStyle: { width: focusedCountry === country.iso3 ? 2.6 : 1.6, opacity: dimmed ? 0.18 : 1 },
        itemStyle: { color: LINE_COLORS[index % LINE_COLORS.length], opacity: dimmed ? 0.18 : 1 },
        emphasis: { focus: "series" as const },
        data: country.history.map((point) => point[metric])
      };
    });

    return {
      color: LINE_COLORS,
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        borderWidth: 0,
        backgroundColor: "rgba(28,31,28,0.92)",
        textStyle: { color: "#f4f3ee", fontSize: 12 },
        valueFormatter: (value) => formatGdp(Number(value), metric)
      },
      legend: {
        bottom: 0,
        icon: "roundRect",
        itemWidth: 10,
        itemHeight: 4,
        textStyle: { color: "#6b6f68", fontSize: 11 }
      },
      grid: { left: 8, right: 18, top: 16, bottom: 44, containLabel: true },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: years.map(String),
        axisTick: { show: false },
        axisLine: { lineStyle: { color: "#dcdbd2" } },
        axisLabel: { color: "#8a8d86", fontSize: 11 }
      },
      yAxis: {
        type: "value",
        scale: metric === "gdpPerCapita",
        splitLine: { lineStyle: { color: "#ecebe3" } },
        axisLabel: {
          color: "#8a8d86",
          fontSize: 11,
          formatter: (value: number) => formatGdp(value, metric)
        }
      },
      series
    };
  }, [rows, metric, focusedCountry]);

  return (
    <section className="rounded-md border border-stone-200 bg-white/70 p-5">
      <div className="mb-1 flex items-baseline justify-between">
        <h2 className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">Evolucion historica</h2>
        <span className="text-xs text-stone-400">{meta.label} · {years[0]}–{years[years.length - 1]}</span>
      </div>
      <Chart option={option} height={240} />
    </section>
  );
}

export function Dashboard() {
  const { metric, setMetric, continent, focusedCountry, reset } = useMacroStore();
  const meta = metricMeta(metric);

  const rows = useMemo(
    () => (continent ? countries.filter((country) => country.continent === continent) : countries),
    [continent]
  );

  const average = averageGdp(rows, metric);
  const { top, bottom } = extremes(rows, metric);
  const scopeLabel = continent ? continents.find((item) => item.key === continent)?.label ?? "Mundo" : "Mundo";
  const focused = focusedCountry ? countries.find((country) => country.iso3 === focusedCountry) ?? null : null;

  return (
    <main className="min-h-screen bg-[#f6f5f0] text-stone-900">
      <header className="border-b border-stone-200">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-end justify-between gap-4 px-6 py-6">
          <div>
            <p className="text-xs uppercase tracking-[0.32em] text-stone-400">Macroeconomic Atlas</p>
            <h1 className="mt-1 font-serif text-3xl font-medium tracking-tight text-stone-900">
              Producto Interior Bruto
            </h1>
          </div>
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
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] px-6 py-6">
        <div className="grid gap-5 lg:grid-cols-[260px_1fr_236px]">
          {/* Left: countries by flag */}
          <aside className="rounded-md border border-stone-200 bg-white/70">
            <div className="flex items-center justify-between border-b border-stone-200 px-3 py-3">
              <h2 className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">Paises</h2>
              <span className="text-[10px] uppercase tracking-wider text-stone-400">{meta.unit}</span>
            </div>
            <CountryList rows={rows} />
          </aside>

          {/* Center: map */}
          <section className="relative flex min-h-[500px] flex-col overflow-hidden rounded-md border border-stone-200 bg-white/70">
            <div className="flex items-center justify-between px-5 pt-4">
              <h2 className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
                {focused ? focused.name : scopeLabel}
              </h2>
              {(focusedCountry || continent) && (
                <button
                  onClick={reset}
                  className="text-xs text-stone-400 underline-offset-2 hover:text-stone-700 hover:underline"
                >
                  Ver el mundo
                </button>
              )}
            </div>
            <div className="flex-1">
              <WorldMap metric={metric} rows={rows} />
            </div>
          </section>

          {/* Right: KPI + continent filter */}
          <aside className="flex flex-col gap-5">
            <div className="rounded-md border border-stone-200 bg-white/70 px-5 py-6 text-center">
              <p className="text-xs uppercase tracking-[0.18em] text-stone-400">Media · {scopeLabel}</p>
              <p className="mt-3 font-serif text-5xl font-medium tracking-tight text-stone-900">
                {formatGdp(average, metric)}
              </p>
              <p className="mt-2 text-xs text-stone-400">{meta.label}</p>
            </div>

            <div className="rounded-md border border-stone-200 bg-white/70 p-4">
              <h2 className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-stone-500">Continente</h2>
              <ContinentFilter />
            </div>

            <div className="space-y-3 rounded-md border border-stone-200 bg-white/70 p-4">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-stone-400">Mayor</p>
                <div className="mt-1 flex items-center gap-2">
                  <Flag iso2={top.iso2} className="h-3.5 w-5 rounded-[2px] shadow-[0_0_0_1px_rgba(0,0,0,0.06)]" />
                  <span className="flex-1 truncate text-sm text-stone-700">{top.name}</span>
                  <span className="font-serif text-sm text-stone-900">{formatGdp(top.latest[metric], metric)}</span>
                </div>
              </div>
              <div className="border-t border-stone-100 pt-3">
                <p className="text-[10px] uppercase tracking-wider text-stone-400">Menor</p>
                <div className="mt-1 flex items-center gap-2">
                  <Flag iso2={bottom.iso2} className="h-3.5 w-5 rounded-[2px] shadow-[0_0_0_1px_rgba(0,0,0,0.06)]" />
                  <span className="flex-1 truncate text-sm text-stone-700">{bottom.name}</span>
                  <span className="font-serif text-sm text-stone-900">{formatGdp(bottom.latest[metric], metric)}</span>
                </div>
              </div>
            </div>
          </aside>
        </div>

        <div className="mt-5">
          <TimeSeries rows={rows} />
        </div>
      </div>
    </main>
  );
}
