// Ported from recharts 3.9.0 test/animation/mockAnimationController.ts.
import type {
  AnimationController,
  AnimationHandle,
  CancelableTimeout,
  OnAnimationStateUpdate,
  TimeoutController,
} from "../../src";

/**
 * Animation controller that does NOT automatically complete when reaching 100%.
 * That is the default useful behavior, but a lot of our unit tests assume
 * "100% progress" and "completed" are two different states, so it's easier to
 * provide a controller that stops at 100% and lets the test call `complete()`.
 */
export const mockAnimationController: AnimationController = (
  timeoutController: TimeoutController,
  animationHandle: AnimationHandle,
  listener: OnAnimationStateUpdate,
): CancelableTimeout => {
  let cancellable: CancelableTimeout | undefined;
  const nextUpdate = (now: number): void => {
    const timeRemaining = animationHandle.tick(now);
    if (animationHandle.getState() === "active") {
      listener(animationHandle.getInterpolated());
      if (animationHandle.getProgress() === 1) {
        // don't complete! (the test drives completion explicitly)
        cancellable = undefined;
        return;
      }
      cancellable = timeoutController.setTimeout(nextUpdate, timeRemaining);
      return;
    }
    cancellable = timeoutController.setTimeout(nextUpdate, timeRemaining);
  };

  cancellable = timeoutController.setTimeout(nextUpdate, 0);

  return () => cancellable?.();
};
