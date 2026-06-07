// Tier-B port of recharts 3.8.1 test/util/useAnimationId.spec.tsx.
//
// recharts' hook detects input changes across React re-renders; the Solid port
// is reactive — `useAnimationId(inputAccessor, prefix)` returns an
// `Accessor<string>`. So this drives a signal + `flush()` instead of
// renderHook's `rerender({ input })`. The memo is created inside `createRoot`
// (it needs an owner), but the signal WRITES happen OUTSIDE the owned scope —
// writing a signal inside an owned scope throws SIGNAL_WRITE_IN_OWNED_SCOPE.
// Behavioral expectations are golden-anchored to recharts.
import { describe, it, expect } from "vitest";
import { createRoot, createSignal, flush, type Accessor } from "solid-js";
import { useAnimationId } from "../../src/util/useAnimationId";

describe("useAnimationId", () => {
  it("should return a unique animation id", () => {
    const [input] = createSignal<unknown>({ foo: "bar" });
    const prefix = "test-";
    const { id, dispose } = createRoot((d) => ({ id: useAnimationId(input, prefix), dispose: d }));

    expect(id()).toBeDefined();
    expect(id().startsWith(prefix)).toBe(true);
    dispose();
  });

  it("should change animation id when input changes", () => {
    const input1 = { foo: "bar" };
    const input2 = { foo: "baz" };
    const prefix = "test-";

    const [input, setInput] = createSignal<unknown>(input1);
    const { id, dispose } = createRoot((d) => ({ id: useAnimationId(input, prefix), dispose: d }));

    const animationId1 = id();

    setInput(input2);
    flush();

    const animationId2 = id();
    expect(animationId1).not.toEqual(animationId2);
    dispose();
  });

  it("should not change animation id when input does not change", () => {
    const input1 = { foo: "bar" };
    const prefix = "test-";

    const [input, setInput] = createSignal<unknown>(input1);
    const { id, dispose } = createRoot((d) => ({ id: useAnimationId(input, prefix), dispose: d }));

    const animationId1 = id();

    setInput(input1);
    flush();

    const animationId2 = id();
    expect(animationId1).toBe(animationId2);
    dispose();
  });
});
