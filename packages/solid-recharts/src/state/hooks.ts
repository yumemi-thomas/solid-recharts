// Solid-native replacement for recharts 3.8.1 src/state/hooks.ts.
//
// recharts bridged react-redux via `useSyncExternalStoreWithSelector`
// (`useAppSelector`) and `store.dispatch` (`useAppDispatch`). Solid needs neither:
//   - `useAppSelector(sel)` returns a reactive `Accessor` backed by `createMemo`,
//     so consumers read `selector(state)` and re-read fine-grainedly. Outside a
//     chart it returns `() => undefined` (recharts returned `undefined`), so a
//     component can still be used standalone.
//   - There is no `dispatch`/action-object indirection: `useAppStore()` exposes
//     the `{ state, actions }` store, and callers run `store.actions.<slice>.<fn>()`.
import { createMemo, useContext, type Accessor } from "solid-js";
import { RechartsStoreContext } from "./RechartsStoreContext";
import type { RechartsRootState, RechartsStore } from "./store";

/**
 * Returns the chart's store (`{ state, actions }`), or `undefined` when used
 * outside a chart. Replaces recharts' `useAppDispatch` — call action functions
 * directly: `useAppStore()?.actions.chartData.setChartData(...)`.
 */
export function useAppStore(): RechartsStore | undefined {
  return useContext(RechartsStoreContext) ?? undefined;
}

/**
 * Recharts variant of react-redux's `useSelector`, ported to Solid.
 *
 * Unlike react-redux (which throws outside its Provider), this returns an
 * accessor that yields `undefined` outside a chart — so components work both
 * inside a chart (props read from the store) and standalone (props explicit).
 *
 * @param selector pulls a value out of the root state; only called inside a chart.
 * @returns an accessor for the selected value, or `undefined` outside a chart.
 */
export function useAppSelector<T>(
  selector: (state: RechartsRootState) => T,
): Accessor<T | undefined> {
  const store = useContext(RechartsStoreContext);
  if (store == null) {
    return () => undefined;
  }
  return createMemo(() => selector(store.state));
}
