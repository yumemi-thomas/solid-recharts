import { describe, it, expect } from "vitest";
import { getEveryNth } from "../../src/util/getEveryNth";

/*
 * Original unit spec for this port's `src/util/getEveryNth.ts` (recharts exercises
 * it only through TickUtils). Pins the documented contract: n < 1 → empty array,
 * n === 1 → the input array as-is, otherwise every nth element starting at index 0.
 */

describe("getEveryNth", () => {
  it("returns an empty array for n < 1", () => {
    expect(getEveryNth([1, 2, 3], 0)).toEqual([]);
    expect(getEveryNth([1, 2, 3], -2)).toEqual([]);
  });

  it("returns the input array unchanged for n === 1", () => {
    const arr = [1, 2, 3];
    expect(getEveryNth(arr, 1)).toBe(arr);
  });

  it("returns every nth element starting from index 0", () => {
    expect(getEveryNth(["a", "b", "c", "d", "e"], 2)).toEqual(["a", "c", "e"]);
    expect(getEveryNth(["a", "b", "c", "d", "e", "f"], 3)).toEqual(["a", "d"]);
  });

  it("returns only the first element when n is greater than the length", () => {
    expect(getEveryNth([1, 2, 3], 10)).toEqual([1]);
  });

  it("returns an empty array when the input is empty", () => {
    expect(getEveryNth([], 3)).toEqual([]);
  });

  it("does not mutate the input array", () => {
    const arr = [1, 2, 3, 4];
    getEveryNth(arr, 2);
    expect(arr).toEqual([1, 2, 3, 4]);
  });
});
