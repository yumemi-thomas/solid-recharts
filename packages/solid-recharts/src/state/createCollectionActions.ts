// The add / replace / remove algebra for a store-held array collection.
//
// Several slices keep a keyed collection as an array and expose the same three
// writes: append on add, swap-by-key on replace, filter-by-key on remove. Each
// used to hand-write that algebra (once per collection: cartesian + polar
// graphical items, reference dots/areas/lines, legend payload, tooltip entries).
// This concentrates it so the slice immutability contract (ADR-0002) lives in one
// place: every change produces a NEW array reference, so reference-equality
// selector caches invalidate; a future in-place slip can only regress here.
//
// The slice supplies `update`, which MUST read the current array and assign the
// result inside its own `setState` draft — the current-array read has to happen
// in the write batch, not in the caller's scope. Actions register from inside
// registerInStore's effect apply phase; a store read there (outside setState)
// would trip STRICT_READ_UNTRACKED. `update` returning the same reference from its
// updater is a no-op (matches the hand-written `index > -1` guard on replace).
//
// `keyOf` extracts the match key (an id field for most collections, a nested
// `settings.graphicalItemId` for tooltip entries). Slices without a replace action
// (reference elements) simply wire `add` and `remove`.

export interface CollectionActions<T> {
  // Arrow-property signatures (not `add(item): void`) so consumers can reference
  // these without the unbound-method lint firing — they carry no `this`.
  add: (item: T) => void;
  replace: (payload: { prev: T; next: T }) => void;
  remove: (item: T) => void;
}

export function createCollectionActions<T>(
  update: (updater: (arr: ReadonlyArray<T>) => ReadonlyArray<T>) => void,
  // Match key — compared only with `===`, so any value type is fine (an id
  // field for most collections, a nested `settings.graphicalItemId` for tooltip).
  keyOf: (item: T) => unknown,
): CollectionActions<T> {
  return {
    add: (item) => update((arr) => [...arr, item]),
    replace: ({ prev, next }) =>
      update((arr) => {
        const index = arr.findIndex((it) => keyOf(it) === keyOf(prev));
        // Absent key → return the same reference so `update` writes nothing.
        if (index < 0) {
          return arr;
        }
        const nextItems = arr.slice();
        nextItems[index] = next;
        return nextItems;
      }),
    remove: (item) => update((arr) => arr.filter((it) => keyOf(it) !== keyOf(item))),
  };
}
