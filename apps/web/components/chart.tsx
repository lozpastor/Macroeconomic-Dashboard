"use client";

import dynamic from "next/dynamic";
import * as echarts from "echarts/core";
import { LineChart } from "echarts/charts";
import { GridComponent, TooltipComponent, LegendComponent, MarkLineComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type { EChartsOption } from "echarts";

echarts.use([LineChart, GridComponent, TooltipComponent, LegendComponent, MarkLineComponent, CanvasRenderer]);

const ReactECharts = dynamic(() => import("echarts-for-react/lib/core"), { ssr: false });

export function Chart({ option, height = 320 }: { option: EChartsOption; height?: number }) {
  return (
    <div style={{ height }}>
      <ReactECharts echarts={echarts} option={option} style={{ height: "100%", width: "100%" }} notMerge lazyUpdate />
    </div>
  );
}
