// Ported from recharts 3.9.0 test/animation/useAnimationStartSnapshot.spec.ts.
//
// Solid adaptation: the hook is reactive — `useAnimationStartSnapshot(inputAccessor, ref)`
// returns `startValue` as an `Accessor<T>`. React's `rerender({ animationInput })` becomes
// a signal write + `flush()`; a rerender with the SAME input has no Solid equivalent
// (signals don't re-fire on identical values), which matches the "frozen for the same
// cycle" contract — we just read the accessor again. The hook is created inside
// `createRoot` (the memo needs an owner); signal writes happen outside the owned scope.
import { describe, expect, it } from "vitest";
import { createRoot, createSignal, flush } from "solid-js";
import { useAnimationStartSnapshot } from "../../src/animation/useAnimationStartSnapshot";
import type { MutableRef } from "../../src/animation/useAnimationStartSnapshot";

function createMutableRef<T>(current: T): MutableRef<T> {
  return { current };
}

function setup(initialInput: string, previousValueRef: MutableRef<string>) {
  const [animationInput, setAnimationInput] = createSignal(initialInput);
  const { snapshot, dispose } = createRoot((d) => ({
    snapshot: useAnimationStartSnapshot(animationInput, previousValueRef),
    dispose: d,
  }));
  return { snapshot, setAnimationInput, dispose };
}

describe("useAnimationStartSnapshot", () => {
  it("should expose the current ref value as the initial startValue", () => {
    const previousValueRef = createMutableRef("frame-10");

    const { snapshot, dispose } = setup("animation-a", previousValueRef);

    expect(snapshot.startValue()).toBe("frame-10");
    dispose();
  });

  it("should keep startValue frozen for the duration of the same animation cycle", () => {
    const previousValueRef = createMutableRef("frame-10");

    const { snapshot, dispose } = setup("animation-a", previousValueRef);
    expect(snapshot.startValue()).toBe("frame-10");

    snapshot.syncStepValue("frame-40", 0.4);

    expect(previousValueRef.current).toBe("frame-40");
    expect(snapshot.startValue()).toBe("frame-10");
    dispose();
  });

  it("should capture the previous ref value as the new startValue when animationInput changes", () => {
    const previousValueRef = createMutableRef("frame-40");

    const { snapshot, setAnimationInput, dispose } = setup("animation-a", previousValueRef);
    expect(snapshot.startValue()).toBe("frame-40");

    setAnimationInput("animation-b");
    flush();

    expect(snapshot.startValue()).toBe("frame-40");

    snapshot.syncStepValue("frame-52", 0.4);

    expect(previousValueRef.current).toBe("frame-40");
    expect(snapshot.startValue()).toBe("frame-40");
    dispose();
  });

  it("should unlock commits at t=0 without mutating the live ref", () => {
    const previousValueRef = createMutableRef("frame-40");

    const { snapshot, setAnimationInput, dispose } = setup("animation-a", previousValueRef);
    expect(snapshot.startValue()).toBe("frame-40");

    setAnimationInput("animation-b");
    flush();
    expect(snapshot.startValue()).toBe("frame-40");

    snapshot.syncStepValue("frame-40", 0);

    expect(previousValueRef.current).toBe("frame-40");

    snapshot.syncStepValue("frame-41", 0.1);

    expect(previousValueRef.current).toBe("frame-41");
    dispose();
  });

  it("should honor canCommit=false even after the new animation has been armed", () => {
    const previousValueRef = createMutableRef("frame-40");

    const { snapshot, setAnimationInput, dispose } = setup("animation-a", previousValueRef);
    expect(snapshot.startValue()).toBe("frame-40");

    setAnimationInput("animation-b");
    flush();
    expect(snapshot.startValue()).toBe("frame-40");

    snapshot.syncStepValue("frame-40", 0);
    snapshot.syncStepValue("frame-41", 0.1, false);

    expect(previousValueRef.current).toBe("frame-40");

    snapshot.syncStepValue("frame-42", 0.2, true);

    expect(previousValueRef.current).toBe("frame-42");
    dispose();
  });

  it("should use the completed frame as the startValue for the next animation cycle", () => {
    const previousValueRef = createMutableRef("frame-10");

    const { snapshot, setAnimationInput, dispose } = setup("animation-a", previousValueRef);
    expect(snapshot.startValue()).toBe("frame-10");

    snapshot.syncStepValue("frame-100", 1);

    expect(previousValueRef.current).toBe("frame-100");

    setAnimationInput("animation-b");
    flush();

    expect(snapshot.startValue()).toBe("frame-100");
    dispose();
  });

  /*
   * DEVIATION from upstream "should update the frozen snapshot to the completed frame
   * after t=1 in the same cycle": React refreshes its ref-based snapshot on the render
   * AFTER t=1 within the SAME cycle; the Solid memo (keyed on animationInput) does not
   * recompute for an unchanged input. Parity for the observable behavior (settled frame
   * reports isEntrance=false) is handled centrally in AnimatedItems. Here we pin the
   * Solid contract: the in-cycle snapshot stays frozen, while the live ref carries the
   * completed frame forward for the next cycle (previous test).
   */
  it("keeps the in-cycle snapshot frozen after t=1 while the ref holds the completed frame", () => {
    const previousValueRef = createMutableRef("frame-10");

    const { snapshot, dispose } = setup("animation-a", previousValueRef);
    expect(snapshot.startValue()).toBe("frame-10");

    snapshot.syncStepValue("frame-100", 1);

    expect(previousValueRef.current).toBe("frame-100");
    expect(snapshot.startValue()).toBe("frame-10");
    dispose();
  });
});
