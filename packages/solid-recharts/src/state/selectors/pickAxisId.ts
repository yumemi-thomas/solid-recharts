// Ported from recharts 3.8.1 src/state/selectors/pickAxisId.ts (commit 7a23854).
import { RechartsRootState } from "../store";
import { AxisId } from "../cartesianAxisSlice";

export const pickAxisId = (_state: RechartsRootState, _axisType: unknown, axisId: AxisId): AxisId =>
  axisId;
