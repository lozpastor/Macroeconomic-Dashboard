"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import * as echarts from "echarts/core";
import { MapChart } from "echarts/charts";
import { VisualMapComponent, TooltipComponent, GeoComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type { EChartsOption } from "echarts";
import { continents, type Frequency, type MetricKey } from "@/lib/demo-data";
import { valueAt, type CountryRow } from "@/lib/dataset";
import { formatValue, metricMeta } from "@/lib/analytics";
import { useMacroStore } from "@/lib/store";

echarts.use([MapChart, VisualMapComponent, TooltipComponent, GeoComponent, CanvasRenderer]);

const ReactECharts = dynamic(() => import("echarts-for-react/lib/core"), { ssr: false });

type WorldFeature = { id: string; properties: { name: string } };

export function WorldMap({
  metric,
  freq,
  period,
  rows,
  allCountries,
  resolve,
  valueFmt,
  colorKind
}: {
  metric: MetricKey;
  freq: Frequency;
  period: string | null;
  rows: CountryRow[];
  allCountries: CountryRow[];
  resolve?: (country: CountryRow) => number | null;
  valueFmt?: (value: number) => string;
  colorKind?: "growth" | "level";
}) {
  const { focusedCountry, continent, selected, toggleCountry } = useMacroStore();
  const [ready, setReady] = useState(false);
  const [nameByIso3, setNameByIso3] = useState<Record<string, string>>({});
  const [iso3ByName, setIso3ByName] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    fetch("maps/world.geo.json")
      .then((response) => response.json())
      .then((geo: { features: WorldFeature[] }) => {
        if (cancelled) return;
        echarts.registerMap("world", geo as never);
        const byIso3: Record<string, string> = {};
        const byName: Record<string, string> = {};
        for (const feature of geo.features) {
          byIso3[feature.id] = feature.properties.name;
          byName[feature.properties.name] = feature.id;
        }
        setNameByIso3(byIso3);
        setIso3ByName(byName);
        setReady(true);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const meta = metricMeta(metric);
  const getValue = (country: CountryRow) => (resolve ? resolve(country) : valueAt(country, metric, freq, period));
  const fmt = (value: number) => (valueFmt ? valueFmt(value) : formatValue(value, metric));
  const kind = colorKind ?? meta.kind;
  const values = rows.map((country) => getValue(country)).filter((value): value is number => value != null);
  const max = values.length ? Math.max(...values) : 1;
  const min = values.length ? Math.min(...values) : 0;

  const view = useMemo(() => {
    if (focusedCountry) {
      const country = allCountries.find((item) => item.iso3 === focusedCountry);
      if (country?.center) return { center: country.center, zoom: 5 };
    }
    if (continent) {
      const region = continents.find((item) => item.key === continent);
      if (region) return { center: region.center, zoom: region.zoom };
    }
    return { center: [12, 18] as [number, number], zoom: 1.15 };
  }, [focusedCountry, continent, allCountries]);

  const option: EChartsOption = useMemo(() => {
    const selectedNames = new Set(
      selected.map((iso3) => nameByIso3[iso3]).filter((name): name is string => Boolean(name))
    );
    const data = rows
      .filter((country) => nameByIso3[country.iso3] && getValue(country) != null)
      .map((country) => {
        const name = nameByIso3[country.iso3];
        const isSelected = selectedNames.has(name);
        return {
          name,
          value: getValue(country) as number,
          itemStyle: isSelected ? { borderColor: "#1c1f1c", borderWidth: 1.6 } : undefined
        };
      });

    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "item",
        borderWidth: 0,
        backgroundColor: "rgba(28,31,28,0.92)",
        padding: [8, 12],
        textStyle: { color: "#f4f3ee", fontSize: 12 },
        formatter: (params) => {
          const item = Array.isArray(params) ? params[0] : params;
          const value = item?.value as number | undefined;
          const name = item?.name ?? "";
          if (value == null || Number.isNaN(value)) return name;
          return `${name}<br/><b>${fmt(value)}</b>`;
        }
      },
      visualMap: {
        type: "continuous",
        min,
        max,
        left: "left",
        bottom: 24,
        itemWidth: 10,
        itemHeight: 120,
        calculable: true,
        text: [fmt(max), fmt(min)],
        textStyle: { color: "#6b6f68", fontSize: 11 },
        inRange: {
          color:
            kind === "growth"
              ? ["#c98a6b", "#e7ddcf", "#cfd9c4", "#7fa07f", "#3f7155", "#234c3a"]
              : ["#eef0ea", "#cfd9c4", "#9bb597", "#5d8a6c", "#2f6f5e", "#1f4a3c"]
        }
      },
      series: [
        {
          type: "map",
          map: "world",
          roam: true,
          center: view.center,
          zoom: view.zoom,
          nameProperty: "name",
          scaleLimit: { min: 1, max: 12 },
          itemStyle: { areaColor: "#f0efe8", borderColor: "#dcdbd2", borderWidth: 0.5 },
          emphasis: {
            label: { show: false },
            itemStyle: { areaColor: "#cdbf9f", borderColor: "#b9a87f", borderWidth: 1 }
          },
          selectedMode: false,
          data
        }
      ]
    };
  }, [rows, selected, nameByIso3, metric, freq, period, min, max, view, kind, resolve, valueFmt]);

  if (!ready) {
    return (
      <div className="grid h-full min-h-[460px] place-items-center text-sm text-stone-400">Cargando mapa...</div>
    );
  }

  return (
    <ReactECharts
      echarts={echarts}
      option={option}
      notMerge
      style={{ height: "100%", width: "100%", minHeight: 460 }}
      onEvents={{
        click: (params: { name?: string }) => {
          if (!params.name) return;
          const iso3 = iso3ByName[params.name];
          if (iso3 && allCountries.some((country) => country.iso3 === iso3)) {
            toggleCountry(iso3);
          }
        }
      }}
    />
  );
}
