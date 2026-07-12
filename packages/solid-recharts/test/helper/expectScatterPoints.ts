// Ported from recharts 3.8.1 test/helper/expectScatterPoints.ts (commit 7a23854).
import { expect } from "vitest";
import { assertNotNull } from "./assertNotNull";

export type ExpectedPoint = {
  cx: string;
  cy: string;
  transform: string;
  d: string;
  width: string;
  height: string;
};

export function getAllScatterPoints(container: Element): ReadonlyArray<SVGPathElement> {
  return Array.from(container.querySelectorAll(".recharts-scatter-symbol .recharts-symbols"));
}

function mapScatterPoints(container: Element): ReadonlyArray<ExpectedPoint> {
  assertNotNull(container);
  return getAllScatterPoints(container).map((point) => ({
    cx: point.getAttribute("cx") ?? "",
    cy: point.getAttribute("cy") ?? "",
    transform: point.getAttribute("transform") ?? "",
    d: point.getAttribute("d") ?? "",
    width: point.getAttribute("width") ?? "",
    height: point.getAttribute("height") ?? "",
  }));
}

export function expectScatterPoints(
  container: Element,
  expectedPoints: ReadonlyArray<ExpectedPoint>,
) {
  expect(mapScatterPoints(container)).toEqual(expectedPoints);
}

const byCxCy = (a: ExpectedPoint, b: ExpectedPoint): number =>
  a.cx === b.cx ? a.cy.localeCompare(b.cy) : a.cx.localeCompare(b.cx);

/**
 * Order-independent variant: asserts the rendered point SET equals the expected
 * set, ignoring DOM order. Used for the Brush-panorama case, where the panorama
 * renders into a separate nested surface (after the z-index-portaled main scatter),
 * so the main/panorama symbol order differs from recharts' shared-surface DOM —
 * the coordinates themselves are byte-identical.
 */
export function expectScatterPointsUnordered(
  container: Element,
  expectedPoints: ReadonlyArray<ExpectedPoint>,
) {
  expect([...mapScatterPoints(container)].sort(byCxCy)).toEqual([...expectedPoints].sort(byCxCy));
}
