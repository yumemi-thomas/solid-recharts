import { expect } from "vitest";
import type { Mock } from "vitest";
import type { AxisDomain } from "../../src/util/types";
import type { RechartsScale } from "../../src/util/scale/RechartsScale";
import { assertNotNull } from "./assertNotNull";

// Ported from recharts 3.8.1 test/helper/expectScale.ts.

export type ExpectedScale = { domain: AxisDomain; range: [number, number]; bandwidth?: number };

/**
 * Asserts a RechartsScale's domain/range (and optional bandwidth) against an
 * expected description. `actual` is the scale object (with `domain`/`range`
 * functions); `expected` carries the already-called results.
 */
export function expectScale(actual: unknown, expected: ExpectedScale): void {
  assertNotNull(actual);
  const scale = actual as RechartsScale;
  expect(typeof scale.map).toBe("function");
  expect(scale.domain(), "domain error").toEqual(expected.domain);
  expect(scale.range(), "range error").toEqual(expected.range);
  if ("bandwidth" in expected && typeof scale.bandwidth === "function") {
    expect(scale.bandwidth(), "bandwidth error").toEqual(expected.bandwidth);
  }
}

/**
 * Verifies the spy's last call was with a scale matching `expected`.
 */
export function expectLastCalledWithScale(
  spy: Mock<(scale: RechartsScale) => unknown>,
  expected: ExpectedScale,
): void {
  expect(spy).toHaveBeenCalled();
  const lastKnownScale = spy.mock.calls[spy.mock.calls.length - 1]?.[0];
  expectScale(lastKnownScale, expected);
}
