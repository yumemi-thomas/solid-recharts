import { expect } from "vitest";
import type { Mock } from "vitest";

// Ported from recharts 3.8.1 test/helper/expectLastCalledWith.ts.

/**
 * Same as `expect(spy).toHaveBeenLastCalledWith(expected)` but with correct
 * TypeScript types: the expected arguments are checked against the spy's argument
 * types.
 */
export function expectLastCalledWith<T1, T2, T3, T4>(
  spy: Mock<(arg1: T1, arg2: T2, arg3: T3, arg4: T4) => void>,
  expected1: T1,
  expected2?: T2,
  expected3?: T3,
  expected4?: T4,
): void {
  if (expected4 !== undefined) {
    expect(spy).toHaveBeenLastCalledWith(expected1, expected2, expected3, expected4);
    return;
  }
  if (expected3 !== undefined) {
    expect(spy).toHaveBeenLastCalledWith(expected1, expected2, expected3);
    return;
  }
  if (expected2 !== undefined) {
    expect(spy).toHaveBeenLastCalledWith(expected1, expected2);
    return;
  }
  expect(spy).toHaveBeenLastCalledWith(expected1);
}

/**
 * Same as `expect(spy).toHaveBeenNthCalledWith(n, expected)` but with correct
 * TypeScript types.
 */
export function expectNthCalledWith<T1, T2>(
  spy: Mock<(arg1: T1, arg2: T2) => void>,
  n: number,
  expected1: T1,
  expected2?: T2,
): void {
  if (expected2 !== undefined) {
    expect(spy).toHaveBeenNthCalledWith(n, expected1, expected2);
    return;
  }
  expect(spy).toHaveBeenNthCalledWith(n, expected1);
}
