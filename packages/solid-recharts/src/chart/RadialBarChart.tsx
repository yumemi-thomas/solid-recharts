// Ported from recharts 3.8.1 src/chart/RadialBarChart.tsx (commit 7a23854).
// `forwardRef`→`ref` prop; `resolveDefaultProps`→`merge`. RadialBarChart defaults:
// layout "radial", startAngle 0, endAngle 360 (PolarChart fills cx/cy/radii).
import { merge, omit } from "solid-js";
import type { JSX } from "@solidjs/web";
import { arrayTooltipSearcher } from "../state/optionsSlice";
import { PolarChart } from "./PolarChart";
import { PolarChartProps, TooltipEventType } from "../util/types";

const allowedTooltipTypes: ReadonlyArray<TooltipEventType> = ["axis", "item"];

const defaultRadialBarChartProps = {
  layout: "radial",
  startAngle: 0,
  endAngle: 360,
} as const satisfies Partial<PolarChartProps>;

export interface RadialBarChartProps<
  DataPointType = unknown,
> extends PolarChartProps<DataPointType> {
  ref?: SVGSVGElement | ((el: SVGSVGElement) => void);
}

export function RadialBarChart<DataPointType = unknown>(
  props: RadialBarChartProps<DataPointType>,
): JSX.Element {
  const categoricalChartProps = merge(defaultRadialBarChartProps, omit(props, "ref"));

  return (
    <PolarChart
      chartName="RadialBarChart"
      defaultTooltipEventType="axis"
      validateTooltipEventTypes={allowedTooltipTypes}
      tooltipPayloadSearcher={arrayTooltipSearcher}
      categoricalChartProps={categoricalChartProps}
      ref={props.ref}
    />
  );
}
