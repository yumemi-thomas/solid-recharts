import { describe, it, expect } from "vitest";
import { getSliced } from "../../src/util/getSliced";

/*
 * Original unit spec for this port's `src/util/getSliced.ts`. recharts has no
 * dedicated test (it is exercised indirectly via combineTooltipPayload /
 * getDomainOfStackGroups); these assertions pin the documented contract:
 * non-array input is returned unchanged, a [0, 0] window is treated as "no slice"
 * (full array), and otherwise the result is `arr.slice(startIndex, endIndex + 1)`
 * (inclusive end).
 */

describe("getSliced", () => {
  it("returns a non-array input unchanged", () => {
    const notArray = { length: 3 } as never;
    expect(getSliced(notArray, 1, 2)).toBe(notArray);
  });

  it("returns the full array when startIndex + endIndex === 0", () => {
    const arr = [1, 2, 3, 4, 5];
    expect(getSliced(arr, 0, 0)).toBe(arr);
  });

  it("slices inclusively of endIndex", () => {
    const arr = [1, 2, 3, 4, 5];
    expect(getSliced(arr, 1, 3)).toEqual([2, 3, 4]);
  });

  it("includes the first element when startIndex is 0 and endIndex is non-zero", () => {
    const arr = ["a", "b", "c", "d"];
    expect(getSliced(arr, 0, 2)).toEqual(["a", "b", "c"]);
  });

  it("returns a new array (does not mutate the input)", () => {
    const arr = [1, 2, 3, 4, 5];
    const result = getSliced(arr, 1, 3);
    expect(result).not.toBe(arr);
    expect(arr).toEqual([1, 2, 3, 4, 5]);
  });

  it("clamps to the array bounds when endIndex exceeds the length", () => {
    const arr = [1, 2, 3];
    expect(getSliced(arr, 1, 10)).toEqual([2, 3]);
  });
});
