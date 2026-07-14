// Unit spec for the hand-rolled reselect-lite (ADR-0002). No upstream
// counterpart to port — upstream gets this contract from reselect itself; this
// spec pins the same contract for our implementation.
import { describe, expect, it, vi } from "vitest";
import { createMemo } from "solid-js";
import { createStore } from "solid-js/store";
import { renderHook } from "@solidjs/testing-library";
import { createSelector } from "../../src/state/createSelector";

type TestState = {
  axis: { domain: readonly number[] };
  data: { points: readonly number[] };
  unrelated: { counter: number };
};

const makeState = (): TestState => ({
  axis: { domain: [0, 1] },
  data: { points: [1, 2, 3] },
  unrelated: { counter: 0 },
});

describe("createSelector", () => {
  it("shares one combiner run across repeated calls with the same state and args", () => {
    const combiner = vi.fn((points: readonly number[], axisId: string) => ({
      axisId,
      total: points.reduce((a, b) => a + b, 0),
    }));
    const selector = createSelector(
      [(s: TestState) => s.data.points, (_s: TestState, axisId: string) => axisId],
      combiner,
    );

    const state = makeState();
    const first = selector(state, "x");
    const second = selector(state, "x");

    expect(combiner).toHaveBeenCalledTimes(1);
    expect(second).toBe(first);
  });

  it("keeps separate cache nodes per argument combination (SameValueZero keys)", () => {
    const combiner = vi.fn((points: readonly number[], axisId: string | number) => ({
      axisId,
      count: points.length,
    }));
    const selector = createSelector(
      [(s: TestState) => s.data.points, (_s: TestState, axisId: string | number) => axisId],
      combiner,
    );

    const state = makeState();
    const zeroNumber = selector(state, 0);
    const zeroString = selector(state, "0");

    // `0` and `"0"` are distinct axis ids — distinct nodes.
    expect(combiner).toHaveBeenCalledTimes(2);
    expect(selector(state, 0)).toBe(zeroNumber);
    expect(selector(state, "0")).toBe(zeroString);
    expect(combiner).toHaveBeenCalledTimes(2);
  });

  it("isolates caches per store: alternating stores never thrash each other", () => {
    const combiner = vi.fn((points: readonly number[]) => points.length);
    const selector = createSelector([(s: TestState) => s.data.points], combiner);

    const a = makeState();
    const b = makeState();
    selector(a);
    selector(b);
    selector(a);
    selector(b);

    expect(combiner).toHaveBeenCalledTimes(2);
  });

  it("recomputes when an input reference changes, and only then", () => {
    const combiner = vi.fn((domain: readonly number[]) => [...domain]);
    const selector = createSelector([(s: TestState) => s.axis.domain], combiner);

    const state = makeState();
    const first = selector(state);
    expect(combiner).toHaveBeenCalledTimes(1);

    // Unrelated branch replaced: input reference unchanged → cache hit.
    state.unrelated = { counter: 1 };
    expect(selector(state)).toBe(first);
    expect(combiner).toHaveBeenCalledTimes(1);

    // Input path replaced (slice immutability contract) → recompute.
    state.axis = { domain: [0, 2] };
    const second = selector(state);
    expect(combiner).toHaveBeenCalledTimes(2);
    expect(second).toEqual([0, 2]);
    expect(second).not.toBe(first);
  });

  it("resultEqualityCheck preserves the previous reference on value-equal recomputes", () => {
    const combiner = vi.fn((points: readonly number[]) => points.map((p) => p * 2));
    const selector = createSelector([(s: TestState) => s.data.points], combiner, {
      resultEqualityCheck: (prev, next) =>
        prev.length === next.length && prev.every((v, i) => v === next[i]),
    });

    const state = makeState();
    const first = selector(state);

    // New input reference, same values → combiner runs, previous reference survives.
    state.data = { points: [1, 2, 3] };
    expect(selector(state)).toBe(first);
    expect(combiner).toHaveBeenCalledTimes(2);

    // And the value-equal result is cached: the next call is a pure cache hit.
    expect(selector(state)).toBe(first);
    expect(combiner).toHaveBeenCalledTimes(2);

    // Genuinely different values → new reference.
    state.data = { points: [4, 5] };
    expect(selector(state)).toEqual([8, 10]);
    expect(selector(state)).not.toBe(first);
  });

  it("propagates reactively through input reads, including after cache hits", () => {
    const [state, setState] = createStore<TestState>(makeState());
    const combiner = vi.fn((domain: readonly number[]) => domain[1]);
    const selector = createSelector([(s: TestState) => s.axis.domain], combiner);

    const { result: upper } = renderHook(() => createMemo(() => selector(state)));
    expect(upper()).toBe(1);

    // A cache-hit evaluation in between must not drop the input subscription.
    expect(selector(state)).toBe(1);

    setState("axis", { domain: [0, 5] });
    expect(upper()).toBe(5);
    expect(combiner).toHaveBeenCalledTimes(2);
  });

  it("runs the combiner untracked: state read only inside a combiner does not subscribe", () => {
    const [state, setState] = createStore<TestState>(makeState());
    // Contract violation on purpose: the combiner reads state directly.
    const impure = createSelector([(s: TestState) => s.axis.domain], () => state.unrelated.counter);

    const { result } = renderHook(() => createMemo(() => impure(state)));
    expect(result()).toBe(0);

    setState("unrelated", { counter: 7 });
    // No input reference changed and the combiner's read was untracked:
    // the memo must NOT have re-run. This documents the purity contract.
    expect(result()).toBe(0);
  });
});
