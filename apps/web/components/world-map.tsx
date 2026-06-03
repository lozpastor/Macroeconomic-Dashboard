"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import * as echarts from "echarts/core";
import { MapChart } from "echarts/charts";
import { VisualMapComponent, TooltipComponent, GeoComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type { EChartsOption } from "echarts";
import { countries, continents, type CountryPoint, type GdpMetricKey } from "@/lib/demo-data";
import { formatGdp, metricMeta } from "@/lib/analytics";
import { useMacroStore } from "@/lib/store";

echarts.use([MapChart, VisualMapComponent, TooltipComponent, GeoComponent, CanvasRenderer]);

const ReactECharts = dynamic(() => import("echarts-for-react/lib/core"), { ssr: false });

type WorldFeature = { id: string; properties: { name: string } };

export function WorldMap({ metric, rows }: { metric: GdpMetricKey; rows: CountryPoint[] }) {
  const { focusedCountry, focusCountry, continent } = useMacroStore();
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
  const visible = rows.length ? rows : countries;
  const values = visible.map((country) => country.latest[metric]);
  const max = Math.max(...values);
  const min = Math.min(...values);

  const view = useMemo(() => {
    if (focusedCountry) {
      const country = countries.find((item) => item.iso3 === focusedCountry);
      if (country) return { center: country.center, zoom: metric === "gdpPerCapita" ? 5 : 5 };
    }
    if (continent) {
      const region = continents.find((item) => item.key === continent);
      if (region) return { center: region.center, zoom: region.zoom };
    }
    return { center: [12, 18] as [number, number], zoom: 1.15 };
  }, [focusedCountry, continent, metric]);

  const option: EChartsOption = useMemo(() => {
    const data = visible
      .filter((country) => nameByIso3[country.iso3])
      .map((country) => ({
        name: nameByIso3[country.iso3],
        value: country.latest[metric]
      }));

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
          return `${name}<br/><b>${formatGdp(value, metric)}</b> <span style="opacity:.6">${meta.unit}</span>`;
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
        text: [formatGdp(max, metric), formatGdp(min, metric)],
        textStyle: { color: "#6b6f68", fontSize: 11 },
        inRange: {
          color:
            metric === "gdpGrowth"
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
          itemStyle: { areaColor: "#f0efe8", borderColor: "#dcdbd2", borderWidth: 0.6 },
          emphasis: {
            label: { show: false },
            itemStyle: { areaColor: "#cdbf9f", borderColor: "#b9a87f", borderWidth: 1 }
          },
          select: {
            label: { show: false },
            itemStyle: { areaColor: "#234c3a", borderColor: "#234c3a" }
          },
          selectedMode: false,
          data
        }
      ]
    };
  }, [visible, nameByIso3, metric, min, max, view, meta.unit]);

  if (!ready) {
    return (
      <div className="grid h-full min-h-[420px] place-items-center text-sm text-stone-400">
        Cargando mapa...
      </div>
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
          if (iso3 && countries.some((country) => country.iso3 === iso3)) {
            focusCountry(iso3);
          }
        }
      }}
    />
  );
}
