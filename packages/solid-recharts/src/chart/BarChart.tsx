// Ported from recharts 3.8.1 src/chart/BarChart.tsx (commit 7a23854).
// `forwardRef` → `ref` prop; thin user-facing wrapper over CartesianChart.
import type { JSX } from "@solidjs/web";
import { arrayTooltipSearcher } from "../state/optionsSlice";
import { CartesianChart } from "./CartesianChart";
import { CartesianChartProps, TooltipEventType } from "../util/types";

const allowedTooltipTypes: ReadonlyArray<TooltipEventType> = ["axis", "item"];

export interface BarChartProps<DataPointType = unknown> extends CartesianChartProps<DataPointType> {
  ref?: SVGSVGElement | ((el: SVGSVGElement) => void);
}

export function BarChart<DataPointType = unknown>(
  props: BarChartProps<DataPointType>,
): JSX.Element {
  return (
    <CartesianChart
      chartName="BarChart"
      defaultTooltipEventType="axis"
      validateTooltipEventTypes={allowedTooltipTypes}
      tooltipPayloadSearcher={arrayTooltipSearcher}
      categoricalChartProps={props}
      ref={props.ref}
    />
  );
}
