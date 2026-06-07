// Ported from recharts 3.8.1 src/state/selectors/selectTooltipSettings.ts (commit 7a23854).
import { RechartsRootState } from "../store";
import { TooltipSettingsState } from "../tooltipSlice";

export const selectTooltipSettings = (state: RechartsRootState): TooltipSettingsState =>
  state.tooltip.settings;
