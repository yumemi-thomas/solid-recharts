import { describe, it, expect } from "vitest";
import { getRadiusAndStrokeWidthFromDot } from "../../src/util/getRadiusAndStrokeWidthFromDot";

/*
 * Original unit spec for this port's `src/util/getRadiusAndStrokeWidthFromDot.ts`
 * (recharts exercises it only through Line/Area rendering). Pins the documented
 * contract: defaults are r=3, strokeWidth=2; a non-object dot (boolean/function)
 * or a missing / NaN / negative value falls back to the matching default; a valid
 * object dot returns its `r` / `strokeWidth`.
 */

describe("getRadiusAndStrokeWidthFromDot", () => {
  it("returns the defaults for a boolean dot", () => {
    expect(getRadiusAndStrokeWidthFromDot(true)).toEqual({ r: 3, strokeWidth: 2 });
    expect(getRadiusAndStrokeWidthFromDot(false)).toEqual({ r: 3, strokeWidth: 2 });
  });

  it("returns the defaults for a function dot", () => {
    expect(getRadiusAndStrokeWidthFromDot(() => null as never)).toEqual({ r: 3, strokeWidth: 2 });
  });

  it("returns the defaults for an empty object dot", () => {
    expect(getRadiusAndStrokeWidthFromDot({})).toEqual({ r: 3, strokeWidth: 2 });
  });

  it("reads r and strokeWidth from an object dot", () => {
    expect(getRadiusAndStrokeWidthFromDot({ r: 5, strokeWidth: 4 })).toEqual({
      r: 5,
      strokeWidth: 4,
    });
  });

  it("falls back to the default for a missing value but keeps the provided one", () => {
    expect(getRadiusAndStrokeWidthFromDot({ r: 7 })).toEqual({ r: 7, strokeWidth: 2 });
    expect(getRadiusAndStrokeWidthFromDot({ strokeWidth: 6 })).toEqual({ r: 3, strokeWidth: 6 });
  });

  it("falls back to the default for negative values", () => {
    expect(getRadiusAndStrokeWidthFromDot({ r: -1, strokeWidth: -5 })).toEqual({
      r: 3,
      strokeWidth: 2,
    });
  });

  it("accepts zero as a valid value", () => {
    expect(getRadiusAndStrokeWidthFromDot({ r: 0, strokeWidth: 0 })).toEqual({
      r: 0,
      strokeWidth: 0,
    });
  });
});
