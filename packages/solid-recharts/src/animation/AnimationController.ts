// Ported from recharts 3.9.0 src/animation/AnimationController.ts. Pure types.
import type { CancelableTimeout, TimeoutController } from "./timeoutController";
import type { AnimationHandle } from "./AnimationHandle";

/**
 * JavaScript-based animations produce numbers, and CSS transition-based animations produce strings.
 *
 * @since 3.9
 */
export type OnAnimationStateUpdate = (newState: number | string) => void;

/**
 * AnimationController accepts the animation state machine (= RechartsAnimation) plus a timeout controller,
 * and manages the animation by calling the tick method of the animation state machine at the right time.
 *
 * One controller is only responsible for one animation. Every new animation creates a new controller.
 *
 * @since 3.9
 */
export type AnimationController = (
  timeoutController: TimeoutController,
  animationHandle: AnimationHandle,
  listener: OnAnimationStateUpdate,
) => CancelableTimeout;
