// Ported from recharts 3.8.1 src/state/selectors/combiners/combineTooltipPayloadConfigurations.ts.
import { TooltipIndex, TooltipPayloadConfiguration, TooltipState } from "../../tooltipSlice";
import { TooltipEventType } from "../../../util/types";
import { TooltipTrigger } from "../../../chart/types";
import { GraphicalItemId } from "../../graphicalItemsSlice";

export const combineTooltipPayloadConfigurations = (
  tooltipState: TooltipState,
  tooltipEventType: TooltipEventType | undefined,
  trigger: TooltipTrigger,
  defaultIndex: TooltipIndex | undefined,
): ReadonlyArray<TooltipPayloadConfiguration> => {
  // axis interaction shows all items at the same axis coordinate.
  if (tooltipEventType === "axis") {
    return tooltipState.tooltipItemPayloads;
  }
  // item interaction shows only the hovered/clicked item.
  if (tooltipState.tooltipItemPayloads.length === 0) {
    return [];
  }
  let filterByGraphicalItemId: GraphicalItemId | undefined;
  if (trigger === "hover") {
    filterByGraphicalItemId = tooltipState.itemInteraction.hover.graphicalItemId;
  } else {
    filterByGraphicalItemId = tooltipState.itemInteraction.click.graphicalItemId;
  }
  if (tooltipState.syncInteraction.active && filterByGraphicalItemId == null) {
    // Synchronised from another chart: show all items at the synced index.
    return tooltipState.tooltipItemPayloads;
  }
  if (
    filterByGraphicalItemId == null &&
    (defaultIndex != null || tooltipState.keyboardInteraction.active)
  ) {
    // With defaultIndex/keyboard but no hovered item, show the first item.
    const firstItemPayload = tooltipState.tooltipItemPayloads[0];
    if (firstItemPayload != null) {
      return [firstItemPayload];
    }
    return [];
  }
  return tooltipState.tooltipItemPayloads.filter(
    (tpc) => tpc.settings?.graphicalItemId === filterByGraphicalItemId,
  );
};
