// Ported from recharts 3.8.1 src/state/selectors/selectChartOffset.ts (commit 7a23854).
// Solid-native plain function (no reselect; memoization comes from useAppSelector).
import { selectChartOffsetInternal } from "./selectChartOffsetInternal";
import { RechartsRootState } from "../store";
import { ChartOffset } from "../../types";

export const selectChartOffset = (state: RechartsRootState): ChartOffset => {
  const offsetInternal = selectChartOffsetInternal(state);
  return {
    top: offsetInternal.top,
    bottom: offsetInternal.bottom,
    left: offsetInternal.left,
    right: offsetInternal.right,
  };
};
