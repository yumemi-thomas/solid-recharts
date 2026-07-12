// Ported from recharts 3.9.0 src/animation/useAnimationStartSnapshot.ts.
//
// Solid 2.0 deviations: React renders many times and mutates refs during render;
// Solid components run once and re-run reactive computations. So the "capture a
// frozen snapshot when the animation cycle changes" step becomes a `createMemo`
// keyed on `animationInput` (it recomputes exactly when the cycle id changes,
// snapshotting the mutable ref untracked at that instant). `syncStepValue` stays
// an imperative callback invoked from the animation render-prop; it mutates a
// plain ref object (not a signal), so it triggers no reactive-graph diagnostics.
import { createMemo, untrack } from "solid-js";
import type { Accessor } from "solid-js";

/** A minimal mutable ref, mirroring React's `MutableRefObject`. */
export type MutableRef<T> = { current: T };

export type AnimationStartSnapshot<T> = {
  /**
   * The frozen value captured at the start of the current animation cycle.
   * It does not drift while the same animation is in progress.
   */
  startValue: Accessor<T>;
  /**
   * Feed each rendered animation frame back into the snapshot state machine:
   * 1. "arm" the hook once the new animation renders its `animationElapsedTime=0` frame, and
   * 2. optionally commit later in-flight frames into the mutable ref so future
   *    animations resume smoothly from the latest visible geometry.
   */
  syncStepValue: (stepValue: T, animationElapsedTime: number, canCommit?: boolean) => void;
};

export function useAnimationStartSnapshot<T>(
  animationInput: Accessor<unknown>,
  previousValueRef: MutableRef<T>,
): AnimationStartSnapshot<T> {
  /*
   * Blocks writes back into the live ref until the new animation has actually
   * rendered its own `animationElapsedTime=0` frame, so pre-start renders cannot
   * rebase the next animation onto already-shifted geometry. The INITIAL cycle
   * starts armed (recharts parity): only a cycle *change* requires the t=0
   * handshake before commits resume.
   */
  let isReadyToCommit = true;
  let isFirstCycle = true;

  // A new cycle begins whenever `animationInput` changes by reference: capture
  // exactly one frozen starting snapshot from the live ref and block commits.
  const startValue = createMemo<T>(() => {
    animationInput();
    if (isFirstCycle) {
      isFirstCycle = false;
    } else {
      isReadyToCommit = false;
    }
    return untrack(() => previousValueRef.current);
  });

  const syncStepValue = (stepValue: T, animationElapsedTime: number, canCommit = true): void => {
    if (animationElapsedTime === 0) {
      // Handshake: the new animation has rendered its starting frame. We do not
      // write anything yet; we only allow later in-flight frames to commit.
      isReadyToCommit = true;
      return;
    }

    if (animationElapsedTime > 0 && isReadyToCommit && canCommit) {
      // Commit the latest visible frame so a future interruption resumes from
      // exactly what the user saw most recently.
      previousValueRef.current = stepValue;
    }
  };

  return { startValue, syncStepValue };
}
