import { mergeProps, splitProps } from "solid-js";
// Ported from recharts 3.8.1 src/chart/RadarChart.tsx (commit 7a23854).
// `forwardRef`→`ref` prop; `resolveDefaultProps`→`merge` (lazy proxy, see PieChart).
// RadarChart-specific defaults: layout "centric", startAngle 90, endAngle -270.

import type { JSX } from "solid-js";
import { arrayTooltipSearcher } from "../state/optionsSlice";
import { PolarChart } from "./PolarChart";
import { PolarChartProps, TooltipEventType } from "../util/types";

const allowedTooltipTypes: ReadonlyArray<TooltipEventType> = ["axis"];

const defaultRadarChartProps = {
  layout: "centric",
  startAngle: 90,
  endAngle: -270,
} as const satisfies Partial<PolarChartProps>;

export interface RadarChartProps<DataPointType = unknown> extends PolarChartProps<DataPointType> {
  ref?: SVGSVGElement | ((el: SVGSVGElement) => void);
}

export function RadarChart<DataPointType = unknown>(
  props: RadarChartProps<DataPointType>,
): JSX.Element {
  const categoricalChartProps = mergeProps(defaultRadarChartProps, splitProps(props, ["ref"])[1]);

  return (
    <PolarChart
      chartName="RadarChart"
      defaultTooltipEventType="axis"
      validateTooltipEventTypes={allowedTooltipTypes}
      tooltipPayloadSearcher={arrayTooltipSearcher}
      categoricalChartProps={categoricalChartProps}
      ref={props.ref}
    />
  );
}
