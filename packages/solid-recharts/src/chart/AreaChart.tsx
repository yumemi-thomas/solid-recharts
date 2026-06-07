// Ported from recharts 3.8.1 src/chart/AreaChart.tsx (commit 7a23854).
// `forwardRef` → `ref` prop; thin user-facing wrapper over CartesianChart
// (mirrors LineChart — differs only in chartName / allowed tooltip event types).
import type { JSX } from "@solidjs/web";
import { arrayTooltipSearcher } from "../state/optionsSlice";
import { CartesianChart } from "./CartesianChart";
import { CartesianChartProps, TooltipEventType } from "../util/types";

const allowedTooltipTypes: ReadonlyArray<TooltipEventType> = ["axis"];

export interface AreaChartProps<
  DataPointType = unknown,
> extends CartesianChartProps<DataPointType> {
  ref?: SVGSVGElement | ((el: SVGSVGElement) => void);
}

export function AreaChart<DataPointType = unknown>(
  props: AreaChartProps<DataPointType>,
): JSX.Element {
  return (
    <CartesianChart
      chartName="AreaChart"
      defaultTooltipEventType="axis"
      validateTooltipEventTypes={allowedTooltipTypes}
      tooltipPayloadSearcher={arrayTooltipSearcher}
      categoricalChartProps={props}
      ref={props.ref}
    />
  );
}
