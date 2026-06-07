// Ported from recharts 3.8.1 src/state/selectors/selectAllAxes.ts (commit 7a23854).
// Solid-native: plain selectors (memoization comes from useAppSelector's createMemo).
import { RechartsRootState } from "../store";
import { XAxisSettings, YAxisSettings } from "../cartesianAxisSlice";

export const selectAllXAxes = (state: RechartsRootState): ReadonlyArray<XAxisSettings> =>
  Object.values(state.cartesianAxis.xAxis);

export const selectAllYAxes = (state: RechartsRootState): ReadonlyArray<YAxisSettings> =>
  Object.values(state.cartesianAxis.yAxis);
