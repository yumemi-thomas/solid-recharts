// Hand-rolled replacement for reselect v5 `createSelector` (ADR-0002).
//
// The port initially replaced reselect with plain functions memoized only by
// each consumer's `createMemo` (ADR-0001), which lost *shared* memoization:
// every consumer re-ran the full selector chain. This module restores
// upstream's caching contract without the dependency:
//
//   - Cache nodes live per store (WeakMap keyed on the root state object, so
//     they are GC'd with the chart) and per primitive args (nested Maps, i.e.
//     SameValueZero keying — `0` and `"0"` are distinct axis ids), mirroring
//     reselect v5's `weakMapMemoize`.
//   - A node recomputes its combiner only when one of its extracted input
//     values changes by reference (`===`, reselect's default equality). This
//     is sound because every slice follows the slice immutability contract:
//     writes replace the objects along the written path.
//   - Input selectors run tracked on EVERY evaluation — they are the sole
//     reactive surface, so a consumer's `createMemo` subscribes identically on
//     cache hits and misses. The combiner runs `untrack`ed and must be pure
//     over its inputs (reselect's own contract; combiners never read state).
//   - `resultEqualityCheck` (upstream's `memoizeOptions.resultEqualityCheck`)
//     keeps the previous reference when a recompute produces a value-equal
//     result, so downstream reference comparisons — and `useAppSelector`'s
//     `createMemo` equality — stop propagation.
import { untrack } from "solid-js";

export type CreateSelectorOptions<Result> = {
  /** When a recompute yields a value-equal result, return the previous reference. */
  resultEqualityCheck?: (previous: Result, next: Result) => boolean;
};

type InputSelector<State> = (state: State, ...args: never[]) => unknown;

type CacheNode = {
  entry?: { inputs: readonly unknown[]; result: unknown };
  children?: Map<unknown, CacheNode>;
};

/**
 * Memoizing selector factory — the Solid-native stand-in for reselect's
 * `createSelector([inputs], combiner)`. The returned selector stays a plain
 * function callable with or without a reactive owner; all callers of the same
 * store share one cache node per argument combination.
 *
 * Input selectors must read every state path segment leading to the value they
 * extract; the combiner must be pure over the extracted values. The returned
 * function takes `...args: unknown[]` — callers annotate the exported const's
 * type (e.g. `(state, axisType, axisId) => X`), which narrows this signature.
 *
 * Typed via a precise public overload + a loose implementation signature (the
 * reselect approach): the body operates entirely on `unknown`, so it needs no
 * type assertions while callers still get full input/combiner type checking.
 */
export function createSelector<
  State extends object,
  Inputs extends readonly InputSelector<State>[],
  Result,
>(
  inputs: readonly [...Inputs],
  combiner: (...values: { [K in keyof Inputs]: ReturnType<Inputs[K]> }) => Result,
  options?: CreateSelectorOptions<Result>,
): (state: State, ...args: unknown[]) => Result;
export function createSelector(
  inputs: ReadonlyArray<(state: object, ...args: unknown[]) => unknown>,
  combiner: (...values: unknown[]) => unknown,
  options?: CreateSelectorOptions<unknown>,
): (state: object, ...args: unknown[]) => unknown {
  const cache = new WeakMap<object, CacheNode>();
  const resultEqualityCheck = options?.resultEqualityCheck;

  return (state: object, ...args: unknown[]): unknown => {
    let node: CacheNode = cache.get(state) ?? {};
    cache.set(state, node);
    for (const arg of args) {
      const children: Map<unknown, CacheNode> = node.children ?? new Map<unknown, CacheNode>();
      node.children = children;
      const child: CacheNode = children.get(arg) ?? {};
      children.set(arg, child);
      node = child;
    }

    // Tracked: the input reads are the selector's whole reactive surface.
    const values: readonly unknown[] = inputs.map((input) => input(state, ...args));

    const entry = node.entry;
    if (entry != null && values.every((value, i) => value === entry.inputs[i])) {
      return entry.result;
    }

    const result = untrack(() => combiner(...values));
    if (entry != null && resultEqualityCheck != null && resultEqualityCheck(entry.result, result)) {
      entry.inputs = values;
      return entry.result;
    }
    node.entry = { inputs: values, result };
    return result;
  };
}
