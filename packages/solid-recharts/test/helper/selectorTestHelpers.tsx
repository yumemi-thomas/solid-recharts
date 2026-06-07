// Solid-native, value-only port of recharts 3.8.1 test/helper/selectorTestHelpers.tsx.
//
// recharts' originals also assert reselect REFERENCE stability (`toBe`):
// `shouldReturnFromInitialState` re-runs the selector on the same state and asserts
// the result is the identical object, and `assertStableBetweenRenders` /
// `useAppSelectorWithStableTest` exist purely for that. This port is Solid-native
// with NO reselect (see the state-architecture-decision memory): selectors return
// fresh objects each call and stability is handled by fine-grained reactivity, not
// selector memoization. So the `toBe` stability assertions are genuinely N/A here
// and are intentionally omitted — only the VALUE assertions (`toEqual`) are ported.
import { describe, expect, it, vi } from "vitest";
import { createRechartsStore } from "../../src/state/store";
import type { RechartsRootState } from "../../src/state/store";
import { useAppSelector } from "../../src/state/hooks";
import { render } from "./render";
import { flush, type Accessor } from "solid-js";

type Selector<T> = (state: RechartsRootState) => T;

/**
 * Solid analogue of recharts' `useAppSelectorWithStableTest`. recharts ran the
 * selector twice and asserted reselect reference stability (`toBe`); that is N/A
 * in this no-reselect Solid rewrite, so this is just `useAppSelector` — it returns
 * an `Accessor`, so callers read `result()` (recharts returned the bare value).
 */
export function useAppSelectorWithStableTest<T>(selector: Selector<T>): Accessor<T | undefined> {
  return useAppSelector(selector);
}

/**
 * Outside a chart's store context, `useAppSelector` yields `undefined` (and must
 * never throw). Mirrors recharts' "called out of Recharts context" guarantee.
 */
export function shouldReturnUndefinedOutOfContext<T>(selector: Selector<T>): void {
  it("should return undefined when called out of Recharts context", () => {
    const spy = vi.fn();
    const Comp = () => {
      // No store provider in scope → the accessor resolves to undefined.
      spy(useAppSelector(selector)());
      return null;
    };
    render(() => <Comp />);
    flush();
    expect(spy).toHaveBeenCalledWith(undefined);
  });
}

/**
 * The value a selector produces from a freshly created store (initial state).
 * Ported from recharts minus the `toBe` reference-stability assertion (N/A — see
 * the file header).
 */
export function shouldReturnFromInitialState<T>(selector: Selector<T>, expectedReturn: T): void {
  const valueDescription = JSON.stringify(expectedReturn);
  it(`should return ${valueDescription} when called with initial state`, () => {
    const store = createRechartsStore();
    const result = selector(store.state);
    expect(result).toEqual(expectedReturn);
  });
}

// Re-export so spec files can group the shared assertions under a describe if needed.
export { describe };
