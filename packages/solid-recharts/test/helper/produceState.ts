/**
 * Solid-native port of the reference's immer-based `produceState` helper.
 *
 * The Solid rewrite has no immer dependency. Instead of `produce`, we unwrap a
 * fresh store's state to a plain value, deep-clone it into a mutable object that
 * PRESERVES functions (the state holds function values such as
 * `options.tooltipPayloadSearcher`, which `structuredClone` would throw on), run
 * the recipe (which mutates the draft in place), and return the mutated draft.
 */
import { unwrap } from "solid-js/store";
import { createRechartsStore, type RechartsRootState } from "../../src/state/store";

function deepMutableClone<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((v) => deepMutableClone(v)) as unknown as T;
  }
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const k in value as Record<string, unknown>) {
      out[k] = deepMutableClone((value as Record<string, unknown>)[k]);
    }
    return out as T;
  }
  // primitives AND functions are kept by reference
  return value;
}

export function produceState(recipe: (draft: RechartsRootState) => void): RechartsRootState {
  const base = deepMutableClone(unwrap(createRechartsStore().state));
  recipe(base);
  return base;
}
