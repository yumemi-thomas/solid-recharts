// Ported from recharts 3.8.1 src/state/selectors/polarGridSelectors.ts (commit 7a23854).
// reselect `createSelector` → plain functions.
import { RechartsRootState } from "../store";
import { AxisId } from "../cartesianAxisSlice";
import { selectPolarAxisTicks } from "./polarScaleSelectors";

export type PolarAngles = ReadonlyArray<number>;
export type PolarRadius = ReadonlyArray<number>;

export const selectPolarGridAngles = (
  state: RechartsRootState,
  angleAxisId: AxisId,
): PolarAngles | undefined => {
  const ticks = selectPolarAxisTicks(state, "angleAxis", angleAxisId, false);
  return ticks?.map((tick) => tick.coordinate);
};

export const selectPolarGridRadii = (
  state: RechartsRootState,
  radiusAxisId: AxisId,
): PolarRadius | undefined => {
  const ticks = selectPolarAxisTicks(state, "radiusAxis", radiusAxisId, false);
  return ticks?.map((tick) => tick.coordinate);
};
