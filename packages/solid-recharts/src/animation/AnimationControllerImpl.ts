// Ported from recharts 3.9.0 src/animation/AnimationControllerImpl.ts. Pure logic.
import type { AnimationController, OnAnimationStateUpdate } from "./AnimationController";
import type { AnimationHandle } from "./AnimationHandle";
import type { CancelableTimeout, TimeoutController } from "./timeoutController";

/**
 * JavaScript animations require triggering a repaint as soon as possible, so this
 * uses the timeoutController to trigger updates as quickly as the controller allows.
 *
 * JavaScript animation progress is represented as a stream of values; the exact type
 * depends on the animationHandle type. Each consumer maps those values onto a component.
 */
export const animationControllerImpl: AnimationController = (
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
        animationHandle.complete();
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
