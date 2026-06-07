// Ported from recharts 3.8.1 test/helper/mockTouchingElement.ts (commit 7a23854).
import type { GraphicalItemId } from "../../src/state/graphicalItemsSlice";
import type { TooltipIndex } from "../../src/state/tooltipSlice";
import {
  DATA_ITEM_GRAPHICAL_ITEM_ID_ATTRIBUTE_NAME,
  DATA_ITEM_INDEX_ATTRIBUTE_NAME,
} from "../../src/util/Constants";

/**
 * Pretend the user is touching an element at the given index. jsdom does not
 * support elementFromPoint (no layout); recharts tests mock it for touchmove.
 */
export function mockTouchingElement(
  touchItemIndex: NonNullable<TooltipIndex>,
  graphicalItemId: GraphicalItemId,
): void {
  const fakeElement = document.createElement("g");
  fakeElement.setAttribute(DATA_ITEM_INDEX_ATTRIBUTE_NAME, String(touchItemIndex));
  fakeElement.setAttribute(DATA_ITEM_GRAPHICAL_ITEM_ID_ATTRIBUTE_NAME, graphicalItemId);
  document.elementFromPoint = () => fakeElement;
}

/** Mock touching an element that is not a chart data item. */
export function mockTouchingUnrelatedElement(): void {
  const fakeElement = document.createElement("g");
  document.elementFromPoint = () => fakeElement;
}
