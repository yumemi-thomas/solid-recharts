// Ported from recharts 3.8.1 src/state/selectors/containerSelectors.ts (commit 7a23854).
// Solid-native: plain selector functions (memoization comes from `useAppSelector`'s createMemo).
import { RechartsRootState } from "../store";
import { Margin } from "../../util/types";

export const selectChartWidth = (state: RechartsRootState): number => state.layout.width;

export const selectChartHeight = (state: RechartsRootState): number => state.layout.height;

export const selectContainerScale = (state: RechartsRootState): number => state.layout.scale;

export const selectMargin = (state: RechartsRootState): Margin => state.layout.margin;
