// Not a recharts port: pins the slice write helper of ADR-0002.
import { describe, expect, it } from "vitest";
import { patched } from "../../src/state/patched";

type Interaction = {
  active: boolean;
  index: string | null;
  coordinate: { x: number; y: number } | undefined;
};

const base: Interaction = { active: true, index: "1", coordinate: { x: 10, y: 20 } };

describe("patched", () => {
  it("returns the current object when every patched field is the same value", () => {
    expect(patched(base, { active: true, index: "1" })).toBe(base);
  });

  it("returns the current object when a patched object is equal by value (a fresh coordinate)", () => {
    expect(patched(base, { coordinate: { x: 10, y: 20 } })).toBe(base);
  });

  it("returns a new object when a primitive differs, keeping the other fields", () => {
    const next = patched(base, { index: "2" });
    expect(next).not.toBe(base);
    expect(next).toEqual({ active: true, index: "2", coordinate: { x: 10, y: 20 } });
  });

  it("keeps the current reference of an equal object when another field changes", () => {
    const next = patched(base, { active: false, coordinate: { x: 10, y: 20 } });
    expect(next).not.toBe(base);
    expect(next.coordinate).toBe(base.coordinate);
  });

  it("replaces an object that differs", () => {
    const next = patched(base, { coordinate: { x: 11, y: 20 } });
    expect(next.coordinate).toEqual({ x: 11, y: 20 });
    expect(next.coordinate).not.toBe(base.coordinate);
  });

  it("treats undefined and an object as different", () => {
    const withoutCoordinate: Interaction = { ...base, coordinate: undefined };
    const next = patched(withoutCoordinate, { coordinate: { x: 1, y: 2 } });
    expect(next.coordinate).toEqual({ x: 1, y: 2 });
  });

  it("compares nested patched nodes through their references", () => {
    const state = { hover: base, click: { active: false, index: null, coordinate: undefined } };
    const same = patched(state, { hover: patched(state.hover, { active: true }) });
    expect(same).toBe(state);
    const changed = patched(state, { hover: patched(state.hover, { active: false }) });
    expect(changed).not.toBe(state);
    expect(changed.click).toBe(state.click);
  });

  it("compares functions, arrays and class instances by reference", () => {
    const fn = (): void => undefined;
    const list = [1, 2];
    const date = new Date(0);
    const state = { fn, list, date };
    expect(patched(state, { fn, list, date })).toBe(state);
    expect(patched(state, { list: [1, 2] })).not.toBe(state);
    expect(patched(state, { date: new Date(0) })).not.toBe(state);
  });
});
