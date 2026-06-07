// Ported from recharts 3.8.1 src/chart/LineChart.tsx (commit 7a23854).
// `forwardRef` → `ref` prop; the user-facing convenience wrapper over CartesianChart.
import type { JSX } from "@solidjs/web";
import { arrayTooltipSearcher } from "../state/optionsSlice";
import { CartesianChart } from "./CartesianChart";
import { CartesianChartProps, TooltipEventType } from "../util/types";

const allowedTooltipTypes: ReadonlyArray<TooltipEventType> = ["axis"];

export interface LineChartProps<
  DataPointType = unknown,
> extends CartesianChartProps<DataPointType> {
  ref?: SVGSVGElement | ((el: SVGSVGElement) => void);
}

export function LineChart<DataPointType = unknown>(
  props: LineChartProps<DataPointType>,
): JSX.Element {
  return (
    <CartesianChart
      chartName="LineChart"
      defaultTooltipEventType="axis"
      validateTooltipEventTypes={allowedTooltipTypes}
      tooltipPayloadSearcher={arrayTooltipSearcher}
      categoricalChartProps={props}
      ref={props.ref}
    />
  );
}
