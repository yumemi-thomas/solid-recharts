// Ported from recharts 3.8.1 test/helper/assertZIndexLayerOrder.ts (commit 7a23854).
import { assertNotNull } from "./assertNotNull";

/**
 * Checks that the `front` element is rendered later in the DOM than `back` element.
 * Because SVG does not support z-index directly we need to rely on the sibling order
 * to determine visual stacking.
 */
export function assertZIndexLayerOrder({ front, back }: { front: Element; back: Element }): void {
  assertNotNull(front);
  assertNotNull(back);
  const position = back.compareDocumentPosition(front);
  const isFrontOnTop =
    position === Node.DOCUMENT_POSITION_FOLLOWING ||
    position === (Node.DOCUMENT_POSITION_FOLLOWING | Node.DOCUMENT_POSITION_CONTAINED_BY);
  if (!isFrontOnTop) {
    throw new Error("Expected front element to be rendered on top of back element");
  }
}
