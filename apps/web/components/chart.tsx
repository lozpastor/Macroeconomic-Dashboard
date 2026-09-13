"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import * as echarts from "echarts/core";
import { LineChart, BarChart, ScatterChart } from "echarts/charts";
import { GridComponent, TooltipComponent, LegendComponent, MarkLineComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type { EChartsOption } from "echarts";

echarts.use([LineChart, BarChart, ScatterChart, GridComponent, TooltipComponent, LegendComponent, MarkLineComponent, CanvasRenderer]);

const ReactECharts = dynamic(() => import("echarts-for-react/lib/core"), { ssr: false });

export function Chart({ option, height = 320 }: { option: EChartsOption; height?: number }) {
  const container = useRef<HTMLDivElement>(null);
  const [fontFamily, setFontFamily] = useState("Inter, sans-serif");
  useEffect(() => {
    if (container.current) setFontFamily(getComputedStyle(container.current).fontFamily);
  }, []);
  return (
    <div ref={container} style={{ height }}>
      <ReactECharts echarts={echarts} option={{ ...option, textStyle: { fontFamily, ...option.textStyle } }} style={{ height: "100%", width: "100%" }} notMerge lazyUpdate />
    </div>
  );
}
