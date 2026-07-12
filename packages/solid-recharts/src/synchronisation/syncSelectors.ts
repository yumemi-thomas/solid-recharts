// Ported from recharts 3.8.1 src/synchronisation/syncSelectors.ts (commit 7a23854).
import { RechartsRootState } from "../state/store";
import { TooltipSyncState } from "../state/tooltipSlice";

export function selectSynchronisedTooltipState(state: RechartsRootState): TooltipSyncState {
  return state.tooltip.syncInteraction;
}
