"use client";

import { Activity, Bell, Download, Globe2, LineChart, Moon, Search, Share2, Sun } from "lucide-react";
import type { EChartsOption } from "echarts";
import { countries, indicatorOptions, type IndicatorKey } from "@/lib/demo-data";
import { formatValue, generateInsights, linearRegression, summaryStats } from "@/lib/analytics";
import { useMacroStore } from "@/lib/store";
import { Chart } from "./chart";

function ShellButton({ children, active = false, onClick }: { children: React.ReactNode; active?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm transition ${
        active ? "border-teal-400 bg-teal-500/15 text-teal-100" : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
      }`}
    >
      {children}
    </button>
  );
}

function KpiCards({ indicator }: { indicator: IndicatorKey }) {
  const stats = summaryStats(indicator);
  const items = [
    ["Media mundial", stats.mean],
    ["Mediana mundial", stats.median],
    ["Maximo", stats.max],
    ["Minimo", stats.min],
    ["Top performer", stats.top],
    ["Bottom performer", stats.bottom]
  ];

  return (
    <section className="grid metric-grid gap-3">
      {items.map(([label, value]) => (
        <article key={label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
          <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-2 min-h-8 text-2xl font-semibold text-slate-950 dark:text-white">
            {typeof value === "number" ? formatValue(value) : value}
          </p>
        </article>
      ))}
    </section>
  );
}

function WorldMapPanel({ indicator }: { indicator: IndicatorKey }) {
  const sorted = [...countries].sort((a, b) => b.latest[indicator] - a.latest[indicator]);
  const max = Math.max(...countries.map((country) => country.latest[indicator]));
  const min = Math.min(...countries.map((country) => country.latest[indicator]));

  return (
    <section className="terminal-surface rounded-lg border border-white/10 p-4 shadow-terminal">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Mapa mundial interactivo</h2>
          <p className="text-sm text-slate-400">Choropleth operacional con percentiles, zoom/pan y tooltips avanzados listo para Mapbox/Deck.gl.</p>
        </div>
        <div className="flex gap-2">
          <ShellButton active>Lineal</ShellButton>
          <ShellButton>Log</ShellButton>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {sorted.map((country, index) => {
          const value = country.latest[indicator];
          const width = 18 + ((value - min) / Math.max(max - min, 1)) * 82;
          return (
            <div key={country.iso3} className="rounded-md border border-white/10 bg-slate-950/50 p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-slate-100">{country.name}</span>
                <span className="font-mono text-sm text-teal-200">{formatValue(value)}</span>
              </div>
              <div className="mt-3 h-2 rounded-full bg-slate-800">
                <div className="h-2 rounded-full bg-teal-400" style={{ width: `${width}%` }} />
              </div>
              <p className="mt-2 text-xs text-slate-500">P{Math.max(1, 100 - index * 14)} · {country.region}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Ranking({ indicator }: { indicator: IndicatorKey }) {
  const ranked = [...countries].sort((a, b) => b.latest[indicator] - a.latest[indicator]);
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold">Ranking dinamico</h2>
        <span className="text-xs text-slate-500">Top 10 / variacion anual</span>
      </div>
      <div className="space-y-2">
        {ranked.map((country, index) => (
          <div key={country.iso3} className="grid grid-cols-[32px_1fr_auto] items-center gap-3 rounded-md bg-slate-50 px-3 py-2 dark:bg-slate-950/40">
            <span className="font-mono text-xs text-slate-500">#{index + 1}</span>
            <span className="truncate text-sm font-medium">{country.name}</span>
            <span className="font-mono text-sm">{formatValue(country.latest[indicator])}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function TimeSeries({ indicator }: { indicator: IndicatorKey }) {
  const { selectedCountries, toggleCountry } = useMacroStore();
  const option: EChartsOption = {
    backgroundColor: "transparent",
    tooltip: { trigger: "axis" },
    legend: { textStyle: { color: "#94a3b8" } },
    grid: { left: 44, right: 16, top: 44, bottom: 32 },
    xAxis: { type: "category", data: [2019, 2020, 2021, 2022, 2023], axisLine: { lineStyle: { color: "#64748b" } } },
    yAxis: { type: "value", splitLine: { lineStyle: { color: "rgba(148,163,184,.18)" } } },
    series: countries
      .filter((country) => selectedCountries.includes(country.iso3))
      .map((country) => ({
        name: country.name,
        type: "line",
        smooth: true,
        symbolSize: 7,
        data: country.history.map((point) => point[indicator === "inflation" ? "inflation" : indicator === "debt" ? "debt" : indicator === "gdpPerCapita" ? "gdpPerCapita" : "gdpGrowth"])
      }))
  };

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold">Serie temporal financiera</h2>
        <div className="flex flex-wrap gap-2">
          {countries.map((country) => (
            <button
              key={country.iso3}
              onClick={() => toggleCountry(country.iso3)}
              className={`h-8 rounded-md border px-2 text-xs ${selectedCountries.includes(country.iso3) ? "border-teal-500 bg-teal-500/10" : "border-slate-300 dark:border-white/10"}`}
            >
              {country.iso3}
            </button>
          ))}
        </div>
      </div>
      <Chart option={option} height={310} />
    </section>
  );
}

function AdvancedModules() {
  const scatter = countries.map((country) => ({ name: country.name, x: country.latest.inflation, y: country.latest.gdpGrowth, size: Math.max(8, country.latest.gdpPerCapita / 3500) }));
  const regression = linearRegression(scatter);
  const option: EChartsOption = {
    tooltip: { formatter: (params: any) => `${params.data[3]}<br/>Inflacion: ${params.data[0]}%<br/>Crecimiento: ${params.data[1]}%` },
    grid: { left: 44, right: 24, top: 20, bottom: 36 },
    xAxis: { name: "Inflacion", splitLine: { lineStyle: { color: "#e2e8f0" } } },
    yAxis: { name: "Crecimiento" },
    series: [
      { type: "scatter", symbolSize: (data: number[]) => data[2], data: scatter.map((point) => [point.x, point.y, point.size, point.name]) },
      { type: "line", showSymbol: false, data: [[0, regression.intercept], [140, regression.slope * 140 + regression.intercept]] }
    ]
  };

  const radar: EChartsOption = {
    radar: { indicator: ["Growth", "Inflation control", "Debt space", "Labor", "External", "Energy"].map((name) => ({ name, max: 100 })) },
    series: [{ type: "radar", data: countries.slice(0, 4).map((country) => ({ name: country.iso3, value: [country.latest.gdpGrowth * 10, 100 - country.latest.inflation, 120 - country.latest.debt, 100 - country.latest.unemployment, 50 + country.latest.currentAccount * 5, country.latest.renewable] })) }]
  };

  return (
    <section className="grid gap-4 xl:grid-cols-2">
      <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
        <h2 className="mb-3 text-base font-semibold">Correlaciones y regresion</h2>
        <Chart option={option} height={310} />
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
        <h2 className="mb-3 text-base font-semibold">Comparador avanzado</h2>
        <Chart option={radar} height={310} />
      </div>
    </section>
  );
}

function ForecastPanel() {
  const option: EChartsOption = {
    tooltip: { trigger: "axis" },
    legend: { data: ["Historico", "Forecast", "Intervalo"] },
    xAxis: { type: "category", data: ["2019", "2020", "2021", "2022", "2023", "2024F", "2025F", "2026F"] },
    yAxis: { type: "value" },
    series: [
      { name: "Historico", type: "line", data: [2.3, -2.2, 5.8, 1.9, 2.5, null, null, null] },
      { name: "Forecast", type: "line", data: [null, null, null, null, 2.5, 2.1, 2.0, 1.9], lineStyle: { type: "dashed" } },
      { name: "Intervalo", type: "line", areaStyle: {}, data: [null, null, null, null, 2.5, 2.8, 2.9, 3.1], lineStyle: { opacity: 0 } }
    ]
  };

  return (
    <section className="grid gap-4 xl:grid-cols-[1.4fr_.8fr]">
      <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
        <h2 className="mb-3 text-base font-semibold">Forecast automatico</h2>
        <Chart option={option} height={300} />
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
        <h2 className="text-base font-semibold">Insights automaticos</h2>
        <div className="mt-3 space-y-3">
          {generateInsights().map((insight) => (
            <p key={insight} className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm leading-6 dark:border-white/10 dark:bg-slate-950/40">
              {insight}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}

export function MacroWorkspace() {
  const { indicator, setIndicator, year, setYear, darkMode, toggleTheme } = useMacroStore();

  return (
    <main className={darkMode ? "dark" : ""}>
      <div className="min-h-screen bg-slate-100 text-slate-950 dark:bg-[#0b1020] dark:text-slate-100">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-white/10 dark:bg-slate-950/90">
          <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-md bg-teal-600 text-white"><Globe2 size={22} /></div>
              <div>
                <h1 className="text-lg font-semibold">MacroScope Intelligence</h1>
                <p className="text-xs text-slate-500">Global Economic Command Center</p>
              </div>
            </div>
            <div className="flex min-w-[280px] flex-1 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 dark:border-white/10 dark:bg-white/5 md:max-w-lg">
              <Search size={16} className="text-slate-400" />
              <input className="w-full bg-transparent text-sm outline-none" placeholder="Buscar pais, region, indicador o alerta" />
            </div>
            <div className="flex gap-2">
              <button className="grid h-9 w-9 place-items-center rounded-md border border-slate-200 dark:border-white/10" aria-label="Alerts"><Bell size={16} /></button>
              <button className="grid h-9 w-9 place-items-center rounded-md border border-slate-200 dark:border-white/10" aria-label="Share"><Share2 size={16} /></button>
              <button className="grid h-9 w-9 place-items-center rounded-md border border-slate-200 dark:border-white/10" aria-label="Export"><Download size={16} /></button>
              <button onClick={toggleTheme} className="grid h-9 w-9 place-items-center rounded-md border border-slate-200 dark:border-white/10" aria-label="Theme">
                {darkMode ? <Sun size={16} /> : <Moon size={16} />}
              </button>
            </div>
          </div>
        </header>

        <div className="mx-auto grid max-w-[1600px] gap-4 px-4 py-4 lg:grid-cols-[250px_1fr]">
          <aside className="rounded-lg border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-white/5">
            <nav className="space-y-2">
              {["Dashboard Global", "Paises y bloques", "Comparador", "Correlaciones", "Forecasting", "Alertas", "Reportes"].map((item, index) => (
                <button key={item} className={`flex h-10 w-full items-center gap-2 rounded-md px-3 text-left text-sm ${index === 0 ? "bg-teal-600 text-white" : "hover:bg-slate-100 dark:hover:bg-white/10"}`}>
                  {index < 3 ? <Activity size={15} /> : <LineChart size={15} />} {item}
                </button>
              ))}
            </nav>
            <div className="mt-5 space-y-3">
              <label className="block text-xs uppercase text-slate-500">Indicador</label>
              <select value={indicator} onChange={(event) => setIndicator(event.target.value as IndicatorKey)} className="h-10 w-full rounded-md border border-slate-200 bg-transparent px-2 text-sm dark:border-white/10">
                {indicatorOptions.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
              </select>
              <label className="block text-xs uppercase text-slate-500">Ano</label>
              <input type="range" min="2019" max="2023" value={year} onChange={(event) => setYear(Number(event.target.value))} className="w-full" />
              <p className="font-mono text-sm">{year}</p>
            </div>
          </aside>

          <div className="space-y-4">
            <KpiCards indicator={indicator} />
            <WorldMapPanel indicator={indicator} />
            <div className="grid gap-4 xl:grid-cols-[.8fr_1.2fr]">
              <Ranking indicator={indicator} />
              <TimeSeries indicator={indicator} />
            </div>
            <AdvancedModules />
            <ForecastPanel />
          </div>
        </div>
      </div>
    </main>
  );
}
