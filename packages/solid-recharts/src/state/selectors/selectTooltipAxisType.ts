// Ported from recharts 3.8.1 src/state/selectors/selectTooltipAxisType.ts
// (commit 7a23854). The axis-type unions seeded axisSelectors early; the
// `selectTooltipAxisType` selector lands now with the tooltip vertical.
import { RechartsRootState } from "../store";
import { selectChartLayout } from "../../context/chartLayoutContext";

/** Every axis kind, including the never-rendered Z axis. */
export type AllAxisTypes = "xAxis" | "yAxis" | "zAxis" | "radiusAxis" | "angleAxis";

/** Axis kinds that actually render ticks/scale (everything except Z). */
export type RenderableAxisType = "xAxis" | "yAxis" | "angleAxis" | "radiusAxis";

/**
 * The Tooltip attaches to one axis, chosen by layout: horizontal → X, vertical →
 * Y, centric → angle, radial → radius.
 */
export const selectTooltipAxisType = (state: RechartsRootState): RenderableAxisType => {
  const layout = selectChartLayout(state);

  if (layout === "horizontal") {
    return "xAxis";
  }

  if (layout === "vertical") {
    return "yAxis";
  }

  if (layout === "centric") {
    return "angleAxis";
  }

  return "radiusAxis";
};
