// Tier B port of recharts 3.8.1 test/state/hooks.spec.tsx.
//
// The recharts spec tests the react-redux binding and Redux store mechanics:
// `useAppSelector` via useSyncExternalStore, `useAppDispatch`/`dispatch(action)`,
// re-render-on-dispatch, and `store.subscribe(spy)`. None of that exists in the
// Solid-native rewrite (no Redux store, no dispatch, no re-render). This spec is
// re-expressed against the equivalent Solid-native contract, preserving the
// behavioral guarantees recharts cared about:
//   - outside a chart, `useAppSelector` yields `undefined` and never throws;
//   - inside the provider, it yields the live state;
//   - it updates reactively when an action mutates the store;
//   - the store's actions are reachable inside the provider.
// The provider is supplied via renderHook's `wrapper`; reactive reads are
// asserted after `flush()` (Solid batches writes on microtasks).
import { describe, expect, it } from "vitest";
import { flush } from "solid-js";
import { renderHook } from "../helper/render";
import { useAppSelector, useAppStore } from "../../src/state/hooks";
import { RechartsStoreProvider } from "../../src/state/RechartsStoreProvider";

describe("useAppSelector", () => {
  it("should return undefined when used outside of the store context", () => {
    const { result } = renderHook(() => useAppSelector((s) => s));
    expect(result()).toBeUndefined();
  });

  it("should not throw an error when used outside of the store context", () => {
    expect(() => renderHook(() => useAppSelector((s) => s))).not.toThrow();
  });

  it("should return state when inside the store provider", () => {
    const { result } = renderHook(() => useAppSelector((s) => s), {
      wrapper: RechartsStoreProvider,
    });
    expect(result()).not.toBeUndefined();
  });

  it("should update after an action changes the state", () => {
    const { result } = renderHook(
      () => {
        const store = useAppStore();
        const chartData = useAppSelector((s) => s.chartData.chartData);
        return { store, chartData };
      },
      { wrapper: RechartsStoreProvider },
    );

    expect(result.chartData()).toBeUndefined();

    result.store?.actions.chartData.setChartData([]);
    flush();

    expect(result.chartData()).toEqual([]);
  });
});

describe("useAppStore", () => {
  it("should return undefined and not throw when used outside the store context", () => {
    const { result } = renderHook(() => useAppStore());
    expect(result).toBeUndefined();
  });

  it("should expose slice actions when inside the store provider", () => {
    const { result } = renderHook(() => useAppStore(), { wrapper: RechartsStoreProvider });
    expect(result).not.toBeUndefined();
    expect(typeof result?.actions.chartData.setChartData).toBe("function");
  });
});
