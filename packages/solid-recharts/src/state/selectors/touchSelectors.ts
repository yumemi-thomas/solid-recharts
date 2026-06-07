// Ported from recharts 3.8.1 src/state/selectors/touchSelectors.ts (commit 7a23854).
import { Coordinate } from "../../util/types";
import { GraphicalItemId } from "../graphicalItemsSlice";
import { RechartsRootState } from "../store";
import { TooltipIndex, TooltipPayloadConfiguration } from "../tooltipSlice";
import { selectTooltipState } from "./selectTooltipState";

export const selectTooltipCoordinate = (
  state: RechartsRootState,
  tooltipIndex: TooltipIndex,
  graphicalItemId: GraphicalItemId,
): Coordinate | undefined => {
  if (tooltipIndex == null) {
    return undefined;
  }
  const allTooltipConfigurations: ReadonlyArray<TooltipPayloadConfiguration> =
    selectTooltipState(state).tooltipItemPayloads;
  const mostRelevantTooltipConfiguration = allTooltipConfigurations.find(
    (tooltipConfiguration) => tooltipConfiguration.settings.graphicalItemId === graphicalItemId,
  );
  if (mostRelevantTooltipConfiguration == null) {
    return undefined;
  }
  const { getPosition } = mostRelevantTooltipConfiguration;
  if (getPosition == null) {
    return undefined;
  }
  return getPosition(tooltipIndex);
};
