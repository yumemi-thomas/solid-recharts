// Unit spec for the keyed-collection array algebra (src/state/createCollectionActions.ts).
// No upstream counterpart — upstream inlines this per slice via immer; this pins
// the shared contract the array slices (graphicalItems, referenceElements, legend,
// tooltip) delegate to. The helper is pure over its read/write closures, so this
// exercises it against a plain array cell — the interface is the test surface, and
// the "new reference on every write" assertions are the ADR-0002 immutability
// contract the reference-equality selector caches depend on.
import { describe, expect, it } from "vitest";
import { createCollectionActions } from "../../src/state/createCollectionActions";

type Item = { id: string; v: number };

function harness(initial: ReadonlyArray<Item> = []) {
  let arr: ReadonlyArray<Item> = initial;
  const actions = createCollectionActions<Item>(
    (updater) => {
      const next = updater(arr);
      if (next !== arr) {
        arr = next;
      }
    },
    (it) => it.id,
  );
  return { actions, get: () => arr };
}

describe("createCollectionActions", () => {
  it("add appends and produces a new array reference", () => {
    const { actions, get } = harness();
    const before = get();
    actions.add({ id: "a", v: 1 });
    expect(get()).toEqual([{ id: "a", v: 1 }]);
    expect(get()).not.toBe(before);
  });

  it("replace swaps the matching element by key (new reference), keeping others and order", () => {
    const { actions, get } = harness([
      { id: "a", v: 1 },
      { id: "b", v: 2 },
    ]);
    const before = get();
    actions.replace({ prev: { id: "a", v: 1 }, next: { id: "a", v: 99 } });
    expect(get()).toEqual([
      { id: "a", v: 99 },
      { id: "b", v: 2 },
    ]);
    expect(get()).not.toBe(before);
  });

  it("replace is a no-op (same reference) when the key is absent", () => {
    const { actions, get } = harness([{ id: "a", v: 1 }]);
    const before = get();
    actions.replace({ prev: { id: "zzz", v: 0 }, next: { id: "zzz", v: 1 } });
    expect(get()).toBe(before);
  });

  it("remove filters by key, new reference", () => {
    const { actions, get } = harness([
      { id: "a", v: 1 },
      { id: "b", v: 2 },
    ]);
    const before = get();
    actions.remove({ id: "a", v: 1 });
    expect(get()).toEqual([{ id: "b", v: 2 }]);
    expect(get()).not.toBe(before);
  });

  it("matches by keyOf, not object identity (nested key supported)", () => {
    type Nested = { settings: { gid: string }; label: string };
    let arr: ReadonlyArray<Nested> = [{ settings: { gid: "g1" }, label: "old" }];
    const actions = createCollectionActions<Nested>(
      (updater) => {
        const next = updater(arr);
        if (next !== arr) {
          arr = next;
        }
      },
      (n) => n.settings.gid,
    );
    // A different object carrying the SAME nested key still matches.
    actions.replace({
      prev: { settings: { gid: "g1" }, label: "whatever" },
      next: { settings: { gid: "g1" }, label: "new" },
    });
    expect(arr).toEqual([{ settings: { gid: "g1" }, label: "new" }]);
  });
});
