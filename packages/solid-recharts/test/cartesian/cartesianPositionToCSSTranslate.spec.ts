// Port of recharts 3.10.1 test/cartesian/cartesianPositionToCSSTranslate.spec.ts.
import { describe, expect, it } from "vitest";
import { cartesianPositionToCSSTranslate } from "../../src/cartesian/cartesianPositionToCSSTranslate";

describe("cartesianPositionToCSSTranslate", () => {
  it.each([
    ["start", "start", ""],
    ["middle", "start", "translate(-50%, 0)"],
    ["end", "start", "translate(-100%, 0)"],
    ["start", "end", "translate(0, -100%)"],
    ["middle", "middle", "translate(-50%, -50%)"],
    ["inherit", "start", "translate(0, 0)"],
    ["inherit", "middle", "translate(0, -50%)"],
    ["inherit", "end", "translate(0, -100%)"],
  ] as const)("translates %s/%s anchors", (horizontal, vertical, expected) => {
    expect(cartesianPositionToCSSTranslate(horizontal, vertical)).toBe(expected);
  });
});
