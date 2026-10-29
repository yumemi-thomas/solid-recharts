// Not a recharts port: pins the opaque data arrays of ADR-0002 ("Diagnostics").
import { describe, expect, it } from "vitest";
import { createMemo, createRoot, createStore, flush, untrack } from "solid-js";
import { toOpaqueArray, trackData } from "../../src/state/opaque";

type Row = { x: number };

/** Runs `create` in a root so its memos are owned; the writes stay outside the root. */
function inRoot<T>(create: () => T): { value: T; dispose: () => void } {
  let dispose = (): void => undefined;
  const value = createRoot((rootDispose) => {
    dispose = rootDispose;
    return create();
  });
  return { value, dispose };
}

describe("toOpaqueArray", () => {
  it("stores a frozen copy and leaves the caller's array alone", () => {
    const rows: Row[] = [{ x: 1 }, { x: 2 }];
    const opaque = toOpaqueArray(rows);
    expect(opaque).toEqual(rows);
    expect(opaque).not.toBe(rows);
    expect(Object.isFrozen(opaque)).toBe(true);
    expect(Object.isFrozen(rows)).toBe(false);
    rows.push({ x: 3 });
    expect(opaque).toHaveLength(2);
  });

  it("keeps the identity of an array that is already frozen", () => {
    const frozen = Object.freeze([{ x: 1 }]);
    expect(toOpaqueArray(frozen)).toBe(frozen);
  });

  it("keeps the rows themselves (no deep copy)", () => {
    const row = { x: 1 };
    expect(toOpaqueArray([row])[0]).toBe(row);
  });

  it("makes the store hand the array back unwrapped, so a row edit is not tracked", () => {
    const rows: Row[] = [{ x: 1 }, { x: 2 }];
    const opaque = toOpaqueArray(rows);
    const [state, setState] = createStore<{ data: ReadonlyArray<Row> }>({ data: opaque });
    expect(untrack(() => state.data)).toBe(opaque);

    let runs = 0;
    const { value: sum, dispose } = inRoot(() =>
      createMemo(() => {
        runs += 1;
        return state.data.reduce((total, row) => total + row.x, 0);
      }),
    );
    expect(sum()).toBe(3);
    expect(runs).toBe(1);

    // Editing a row in place is invisible to the memo (the row is not behind a proxy)...
    const first = rows[0];
    if (first) {
      first.x = 100;
    }
    flush();
    expect(sum()).toBe(3);
    expect(runs).toBe(1);

    // ...replacing the array, as the slices do, is the signal.
    setState((s) => {
      s.data = toOpaqueArray(rows);
    });
    flush();
    expect(sum()).toBe(102);
    expect(runs).toBe(2);
    dispose();
  });

  it("is what a plain array is not: an unfrozen array's rows are tracked through the store", () => {
    const [state, setState] = createStore<{ data: Row[] }>({ data: [{ x: 1 }] });
    let runs = 0;
    const { value: first, dispose } = inRoot(() =>
      createMemo(() => {
        runs += 1;
        return state.data[0]?.x;
      }),
    );
    expect(first()).toBe(1);
    setState((s) => {
      const row = s.data[0];
      if (row) {
        row.x = 5;
      }
    });
    flush();
    expect(first()).toBe(5);
    expect(runs).toBe(2);
    dispose();
  });
});

describe("trackData", () => {
  it("is the identity for undefined and for a plain array", () => {
    const rows: Row[] = [{ x: 1 }];
    expect(trackData(undefined)).toBeUndefined();
    expect(trackData(rows)).toBe(rows);
  });

  it("snapshots a Solid store and re-runs its reader on an edit and on a push", () => {
    const [rows, setRows] = createStore<Row[]>([{ x: 1 }]);
    const { value: snapshots, dispose } = inRoot(() => createMemo(() => trackData(rows)));
    const first = snapshots();
    expect(first).toEqual([{ x: 1 }]);
    expect(first).not.toBe(rows);

    setRows((draft) => {
      const row = draft[0];
      if (row) {
        row.x = 2;
      }
    });
    flush();
    const edited = snapshots();
    expect(edited).toEqual([{ x: 2 }]);
    expect(edited).not.toBe(first);

    setRows((draft) => {
      draft.push({ x: 3 });
    });
    flush();
    expect(snapshots()).toEqual([{ x: 2 }, { x: 3 }]);
    dispose();
  });
});
