// Ported from recharts 3.8.1 src/state/selectors/selectPlotArea.ts (commit 7a23854).
// Solid-native plain function. Uses the (margin-seeded) internal offset directly
// rather than recharts' separate `selectChartOffset` (same left/top/right/bottom).
import { RechartsRootState } from "../store";
import { selectChartOffsetInternal } from "./selectChartOffsetInternal";
import { selectChartHeight, selectChartWidth } from "./containerSelectors";
// Canonical public type; re-exported so existing importers of `PlotArea` from
// this module (e.g. hooks.ts) keep working.
import type { PlotArea } from "../../types";
export type { PlotArea };

export const selectPlotArea = (state: RechartsRootState): PlotArea | undefined => {
  const offset = selectChartOffsetInternal(state);
  const chartWidth = selectChartWidth(state);
  const chartHeight = selectChartHeight(state);

  if (offset == null || chartWidth == null || chartHeight == null) {
    return undefined;
  }

  return {
    x: offset.left,
    y: offset.top,
    width: Math.max(0, chartWidth - offset.left - offset.right),
    height: Math.max(0, chartHeight - offset.top - offset.bottom),
  };
};
