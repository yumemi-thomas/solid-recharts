// Ported from recharts 3.8.1 test/helper/expectFunctionReturning.ts (commit 7a23854).
import { expect } from "vitest";

interface SyncExpectationResult {
  pass: boolean;
  message: () => string;
  actual?: unknown;
  expected?: unknown;
}

/**
 * Vitest matcher: expect a function to return specific values for given argument
 * tuples. Used for `getPosition` callbacks in tooltip payload configuration tests.
 */
export function expectFunctionReturning<TArgs extends ReadonlyArray<unknown>, TReturn>(
  actual: unknown,
  cases: ReadonlyArray<readonly [...TArgs, TReturn]>,
): SyncExpectationResult {
  if (typeof actual !== "function") {
    return {
      pass: false,
      message: () => `Expected a function, but received ${typeof actual}`,
      actual,
      expected: "function",
    };
  }

  const fn = actual as (...args: TArgs) => TReturn;

  for (const testCase of cases) {
    const args = testCase.slice(0, -1) as unknown as TArgs;
    const expectedReturnValue = testCase[testCase.length - 1] as TReturn;
    const actualReturnValue = fn(...args);
    expect(actualReturnValue, `when called with args [${String(args)}] it should return`).toEqual(
      expectedReturnValue,
    );
  }

  return {
    pass: true,
    message: () => "Expected function to not return the expected values for all cases",
  };
}

expect.extend({
  functionReturning: expectFunctionReturning,
});

declare module "vitest" {
  interface AsymmetricMatchersContaining {
    functionReturning: <TArgs extends ReadonlyArray<unknown>, TReturn>(
      cases: ReadonlyArray<readonly [...TArgs, TReturn]>,
    ) => (...args: TArgs) => TReturn;
  }
}
