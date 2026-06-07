// Ported from recharts 3.8.1 src/state/selectors/selectTooltipState.ts (commit 7a23854).
import { RechartsRootState } from "../store";
import { TooltipState } from "../tooltipSlice";

export const selectTooltipState = (state: RechartsRootState): TooltipState => state.tooltip;
