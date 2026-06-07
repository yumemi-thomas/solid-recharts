// Ported from recharts 3.8.1 src/state/types/PieSettings.ts (commit 7a23854).
//
// MINIMAL PORT. Deviation: recharts carries arbitrary path presentation props in
// `presentationProps: PiePresentationProps | null` (the full SVG-prop passthrough
// from `svgPropertiesNoEvents`). The minimal Pie reduces this to the two props the
// sector actually needs — `fill` and `stroke` — and defers the general
// passthrough (and per-data-row presentation via Cells) to a later step.
import { BasePolarGraphicalItemSettings } from "../graphicalItemsSlice";
import { DataKey, LegendType, TooltipType } from "../../util/types";

export interface PieSettings extends BasePolarGraphicalItemSettings {
  type: "pie";
  name: string | number | undefined;
  nameKey: DataKey<unknown> | undefined;
  tooltipType: TooltipType | undefined;

  legendType: LegendType;
  fill: string;
  /** DEVIATION: stands in for recharts' `presentationProps` (reduced to stroke). */
  stroke: string | undefined;

  cx: number | string;
  cy: number | string;
  startAngle: number;
  endAngle: number;
  paddingAngle: number;
  minAngle: number;
  innerRadius: number | string;
  outerRadius: number | string | ((element: unknown) => number | string);
  maxRadius: number | undefined;
  cornerRadius: number | string | undefined;
}
