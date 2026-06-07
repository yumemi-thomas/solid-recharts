// Ported from recharts 3.8.1 src/state/selectors/pickAxisType.ts (commit 7a23854).
import { RechartsRootState } from "../store";

export const pickAxisType = <T>(_state: RechartsRootState, axisType: T): T => axisType;
