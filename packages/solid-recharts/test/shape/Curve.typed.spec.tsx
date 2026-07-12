/**
 * Ported from recharts 3.8.1 test/shape/Curve.typed.spec.tsx (commit 7a23854).
 *
 * .typed spec: correctness is enforced by `tsc --noEmit` (the package tsconfig
 * includes test/). "should allow X" cases compile + render; "should NOT allow X"
 * cases carry a `// @ts-expect-error` on the line Solid genuinely rejects.
 *
 * SOLID DEVIATION (Tier-B, golden-anchored to the Solid type surface):
 *   The recharts reference declares each handler props-first —
 *   `onClick={(_curveProps: CurveProps, e) => getRelativeCoordinate(e)}` —
 *   because recharts' Curve types its handlers as `(props, event)`. In Solid,
 *   `CurveProps` extends `JSX.PathSVGAttributes<SVGPathElement>`, so `onClick`,
 *   `onMouseDown`, … are the standard Solid DOM `EventHandlerUnion` —
 *   single-argument `(e) => void` where `e` is a `MouseEvent`/`TouchEvent`
 *   whose `currentTarget` is the `SVGPathElement`. The props-first wrapping is an
 *   implementation detail of `adaptEventHandlers` at runtime, NOT part of the
 *   prop type. So the assertion ported here is: a Solid Curve event handler
 *   receives a DOM event that `getRelativeCoordinate` accepts. (The two-argument
 *   `(_curveProps, e)` React signature is reported in blocked.)
 */
import { describe, it } from "vitest";
import { render } from "@solidjs/testing-library";
import { Curve, getRelativeCoordinate } from "../../src";

describe("Curve types", () => {
  it("should allow calling getRelativeCoordinate with the event provided by a Curve event handler", () => {
    render(() => (
      <Curve
        points={[
          { x: 0, y: 0 },
          { x: 1, y: 1 },
        ]}
        onClick={(e) => {
          getRelativeCoordinate(e);
        }}
        onMouseDown={(e) => {
          getRelativeCoordinate(e);
        }}
        onMouseUp={(e) => {
          getRelativeCoordinate(e);
        }}
        onMouseMove={(e) => {
          getRelativeCoordinate(e);
        }}
        onMouseLeave={(e) => {
          getRelativeCoordinate(e);
        }}
        onMouseOver={(e) => {
          getRelativeCoordinate(e);
        }}
        onMouseOut={(e) => {
          getRelativeCoordinate(e);
        }}
        onMouseEnter={(e) => {
          getRelativeCoordinate(e);
        }}
        onTouchStart={(e) => {
          getRelativeCoordinate(e);
        }}
        onTouchMove={(e) => {
          getRelativeCoordinate(e);
        }}
        onTouchEnd={(e) => {
          getRelativeCoordinate(e);
        }}
      />
    ));
  });
});
