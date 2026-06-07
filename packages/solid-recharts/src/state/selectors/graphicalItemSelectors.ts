// Ported from recharts 3.8.1 src/state/selectors/graphicalItemSelectors.ts
// (commit 7a23854). Solid-native plain selectors.
import { RechartsRootState } from "../store";
import { GraphicalItemId } from "../graphicalItemsSlice";
import { AxisId, defaultAxisId } from "../cartesianAxisSlice";

export function selectXAxisIdFromGraphicalItemId(
  state: RechartsRootState,
  id: GraphicalItemId,
): AxisId {
  return (
    state.graphicalItems.cartesianItems.find((item) => item.id === id)?.xAxisId ?? defaultAxisId
  );
}

export function selectYAxisIdFromGraphicalItemId(
  state: RechartsRootState,
  id: GraphicalItemId,
): AxisId {
  return (
    state.graphicalItems.cartesianItems.find((item) => item.id === id)?.yAxisId ?? defaultAxisId
  );
}
