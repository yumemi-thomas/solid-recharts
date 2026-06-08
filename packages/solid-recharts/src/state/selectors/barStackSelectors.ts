// Ported from recharts 3.8.1 src/state/selectors/barStackSelectors.ts (commit 7a23854).
import type { RechartsRootState } from "../store";
import type { NormalizedStackId } from "../../util/ChartUtils";
import type { BarSettings } from "../types/BarSettings";
import { selectUnfilteredCartesianItems } from "./axisSelectors";
import { selectBarRectangles } from "./barSelectors";

export const selectAllBarsInStack = (
  state: RechartsRootState,
  stackId: NormalizedStackId,
  isPanorama: boolean,
): ReadonlyArray<BarSettings> => {
  return selectUnfilteredCartesianItems(state)
    .filter((i): i is BarSettings => i.type === "bar" && i.stackId === stackId)
    .filter((i) => i.isPanorama === isPanorama)
    .filter((i) => !i.hide);
};

const selectAllBarIdsInStack = (
  state: RechartsRootState,
  stackId: NormalizedStackId,
  isPanorama: boolean,
): ReadonlyArray<string> => {
  return selectAllBarsInStack(state, stackId, isPanorama).map((bar) => bar.id);
};

export type BarStackItem = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/**
 * Takes two rectangles and returns a new rectangle that encompasses both.
 * It takes the minimum x and y, and the maximum width and height.
 * It handles overlapping rectangles, and rectangles with a gap between them.
 */
export const expandRectangle = (
  rect1: BarStackItem | undefined,
  rect2: BarStackItem | undefined,
): BarStackItem | undefined => {
  if (!rect1) {
    return rect2;
  }
  if (!rect2) {
    return rect1;
  }
  const x = Math.min(rect1.x, rect1.x + rect1.width, rect2.x, rect2.x + rect2.width);
  const y = Math.min(rect1.y, rect1.y + rect1.height, rect2.y, rect2.y + rect2.height);
  const maxX = Math.max(rect1.x, rect1.x + rect1.width, rect2.x, rect2.x + rect2.width);
  const maxY = Math.max(rect1.y, rect1.y + rect1.height, rect2.y, rect2.y + rect2.height);
  const width = maxX - x;
  const height = maxY - y;
  return { x, y, width, height };
};

const combineStackRects = (
  state: RechartsRootState,
  stackId: NormalizedStackId,
  isPanorama: boolean,
): ReadonlyArray<BarStackItem | undefined> => {
  const allBarIds = selectAllBarIdsInStack(state, stackId, isPanorama);
  const stackRects: Array<BarStackItem | undefined> = [];
  allBarIds.forEach((barId) => {
    const rectangles = selectBarRectangles(state, barId, isPanorama, undefined);
    rectangles?.forEach((rect) => {
      const rectIndex = rect.originalDataIndex;
      stackRects[rectIndex] = expandRectangle(stackRects[rectIndex], rect);
    });
  });
  return stackRects;
};

export const selectStackRects = (
  state: RechartsRootState,
  stackId: NormalizedStackId,
  isPanorama: boolean,
): ReadonlyArray<BarStackItem | undefined> => combineStackRects(state, stackId, isPanorama);
