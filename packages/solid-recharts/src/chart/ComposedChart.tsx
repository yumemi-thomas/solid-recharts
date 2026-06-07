// Ported from recharts 3.8.1 src/chart/ComposedChart.tsx (commit 7a23854).
// `forwardRef` → `ref` prop; thin user-facing wrapper over CartesianChart.
import type { JSX } from "@solidjs/web";
import { arrayTooltipSearcher } from "../state/optionsSlice";
import { CartesianChart } from "./CartesianChart";
import { CartesianChartProps, TooltipEventType } from "../util/types";

const allowedTooltipTypes: ReadonlyArray<TooltipEventType> = ["axis"];

export interface ComposedChartProps<
  DataPointType = unknown,
> extends CartesianChartProps<DataPointType> {
  ref?: SVGSVGElement | ((el: SVGSVGElement) => void);
}

export function ComposedChart<DataPointType = unknown>(
  props: ComposedChartProps<DataPointType>,
): JSX.Element {
  return (
    <CartesianChart
      chartName="ComposedChart"
      defaultTooltipEventType="axis"
      validateTooltipEventTypes={allowedTooltipTypes}
      tooltipPayloadSearcher={arrayTooltipSearcher}
      categoricalChartProps={props}
      ref={props.ref}
    />
  );
}
