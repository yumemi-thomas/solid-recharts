// Resolves the scaled axis / ticks a cartesian graphical item is bound to, from
// the item's id. Area and Bar each declared these four wrappers privately (and
// Bar carried a dead `axisId == null` guard — selectX/YAxisIdFromGraphicalItemId
// never returns null, it falls back to defaultAxisId). Concentrated here so the
// "which axis does this item read" resolution lives once.
//
// A leaf module (like areaSelectors/barSelectors): it imports from both
// axisSelectors and graphicalItemSelectors, so it introduces no import cycle.
import { RechartsRootState } from "../store";
import { GraphicalItemId } from "../graphicalItemsSlice";
import {
  selectAxisWithScale,
  selectTicksOfGraphicalItem,
  type BaseAxisWithScale,
} from "./axisSelectors";
import {
  selectXAxisIdFromGraphicalItemId,
  selectYAxisIdFromGraphicalItemId,
} from "./graphicalItemSelectors";
import type { TickItem } from "../../util/types";

type CartesianAxisType = "xAxis" | "yAxis";

const axisIdForGraphicalItem = (
  state: RechartsRootState,
  axisType: CartesianAxisType,
  id: GraphicalItemId,
) =>
  axisType === "xAxis"
    ? selectXAxisIdFromGraphicalItemId(state, id)
    : selectYAxisIdFromGraphicalItemId(state, id);

export const selectAxisWithScaleForGraphicalItem = (
  state: RechartsRootState,
  axisType: CartesianAxisType,
  id: GraphicalItemId,
  isPanorama: boolean,
): BaseAxisWithScale | undefined =>
  selectAxisWithScale(state, axisType, axisIdForGraphicalItem(state, axisType, id), isPanorama);

export const selectTicksForGraphicalItem = (
  state: RechartsRootState,
  axisType: CartesianAxisType,
  id: GraphicalItemId,
  isPanorama: boolean,
): TickItem[] | undefined =>
  selectTicksOfGraphicalItem(
    state,
    axisType,
    axisIdForGraphicalItem(state, axisType, id),
    isPanorama,
  );
