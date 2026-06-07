// Ported from recharts 3.8.1
// src/state/selectors/combiners/combineAxisRangeWithReverse.ts (commit 7a23854).
import { BaseCartesianAxis } from "../../cartesianAxisSlice";
import { AxisRange } from "../axisSelectors";

export const combineAxisRangeWithReverse = (
  axisSettings: BaseCartesianAxis | undefined,
  axisRange: AxisRange | undefined,
): AxisRange | undefined => {
  if (!axisSettings || !axisRange) {
    return undefined;
  }
  if (axisSettings.reversed) {
    return [axisRange[1], axisRange[0]];
  }
  return axisRange;
};
