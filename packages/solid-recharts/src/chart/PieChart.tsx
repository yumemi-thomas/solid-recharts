import { mergeProps, splitProps } from "solid-js";
// Ported from recharts 3.8.1 src/chart/PieChart.tsx (commit 7a23854).
// `forwardRef` → `ref` prop; the user-facing convenience wrapper over PolarChart.
// `resolveDefaultProps` → Solid `merge` (lazy proxy — does NOT eagerly evaluate
// the `children` getter, unlike an object spread). PieChart-specific defaults
// (layout "centric", startAngle 0, endAngle 360) win over PolarChart's polar
// defaults. `ref` is omitted from categoricalChartProps and passed separately,
// mirroring the reference's forwardRef split.

import type { JSX } from "solid-js";
import { arrayTooltipSearcher } from "../state/optionsSlice";
import { PolarChart } from "./PolarChart";
import { PolarChartProps, TooltipEventType } from "../util/types";

const allowedTooltipTypes: ReadonlyArray<TooltipEventType> = ["item"];

const defaultPieChartProps = {
  layout: "centric",
  startAngle: 0,
  endAngle: 360,
} as const satisfies Partial<PolarChartProps>;

export interface PieChartProps<DataPointType = unknown> extends PolarChartProps<DataPointType> {
  ref?: SVGSVGElement | ((el: SVGSVGElement) => void);
}

export function PieChart<DataPointType = unknown>(
  props: PieChartProps<DataPointType>,
): JSX.Element {
  const categoricalChartProps = mergeProps(defaultPieChartProps, splitProps(props, ["ref"])[1]);

  return (
    <PolarChart
      chartName="PieChart"
      defaultTooltipEventType="item"
      validateTooltipEventTypes={allowedTooltipTypes}
      tooltipPayloadSearcher={arrayTooltipSearcher}
      categoricalChartProps={categoricalChartProps}
      ref={props.ref}
    />
  );
}
