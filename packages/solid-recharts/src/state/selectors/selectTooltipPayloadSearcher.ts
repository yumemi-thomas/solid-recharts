// Ported from recharts 3.8.1 src/state/selectors/selectTooltipPayloadSearcher.ts
// (commit 7a23854).
import { RechartsRootState } from "../store";
import { TooltipPayloadSearcher } from "../tooltipSlice";

export const selectTooltipPayloadSearcher = (state: RechartsRootState): TooltipPayloadSearcher =>
  state.options.tooltipPayloadSearcher;
