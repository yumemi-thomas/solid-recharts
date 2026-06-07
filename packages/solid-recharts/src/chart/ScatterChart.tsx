// Ported from recharts 3.8.1 src/chart/ScatterChart.tsx (commit 7a23854).
// `forwardRef` → `ref` prop; thin user-facing wrapper over CartesianChart.
import type { JSX } from "@solidjs/web";
import { arrayTooltipSearcher } from "../state/optionsSlice";
import { CartesianChart } from "./CartesianChart";
import { CartesianChartProps, TooltipEventType } from "../util/types";

const allowedTooltipTypes: ReadonlyArray<TooltipEventType> = ["item"];

export interface ScatterChartProps<
  DataPointType = unknown,
> extends CartesianChartProps<DataPointType> {
  ref?: SVGSVGElement | ((el: SVGSVGElement) => void);
}

export function ScatterChart<DataPointType = unknown>(
  props: ScatterChartProps<DataPointType>,
): JSX.Element {
  return (
    <CartesianChart
      chartName="ScatterChart"
      defaultTooltipEventType="item"
      validateTooltipEventTypes={allowedTooltipTypes}
      tooltipPayloadSearcher={arrayTooltipSearcher}
      categoricalChartProps={props}
      ref={props.ref}
    />
  );
}
