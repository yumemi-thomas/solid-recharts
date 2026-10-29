// Opaque values for the chart stores.
//
// A Solid store hands out lazy proxies, so a computation that reads N rows of a data
// array through it subscribes to every row and every field it touches (3-6 sources
// per row in the tooltip/axis/series scopes). The data arrays of a chart are replaced
// wholesale (the slice immutability contract, ADR-0002) and never edited in place, so
// tracking each row buys nothing: the array's own reference is the one source that
// matters. `Object.isFrozen` values are not wrappable, so a frozen array is stored and
// returned as-is and its rows are read untracked.
import { deep } from "solid-js";

/**
 * The array to store for a wholesale-replaced data array. Already-frozen arrays are
 * kept (and keep their identity); anything else is shallow-copied and frozen, so the
 * caller's own array is never frozen or mutated.
 */
export function toOpaqueArray<T>(items: ReadonlyArray<T>): ReadonlyArray<T> {
  return Object.isFrozen(items) ? items : Object.freeze([...items]);
}

/**
 * The compute-phase read of a `data` prop that is about to be registered in a store.
 * For a plain array this is the identity (the prop is the one source). A Solid store
 * is tracked to every record and returned as an immutable snapshot, so an edit or a
 * push in the user's store reaches the chart as a new array — the same as passing a
 * new `data` — and the apply phase never reads the store untracked.
 */
export function trackData<T>(data: ReadonlyArray<T> | undefined): ReadonlyArray<T> | undefined {
  return data == null ? undefined : deep(data);
}
