// Ported from recharts 3.9.0 src/animation/AnimationHandle.ts.
// Pure state machine — no framework surface — so behavior is byte-identical to recharts.
import { interpolate } from "../util/DataUtils";
import type { ProgressEasingFn, NamedBezier } from "./easing";

const INIT = "init" as const;
const PENDING = "pending" as const;
const ACTIVE = "active" as const;
const COMPLETED = "completed" as const;

export type AnimationState = typeof INIT | typeof PENDING | typeof ACTIVE | typeof COMPLETED;

type AnimationStateCallback = () => void;

function duration(time: number): number {
  return Math.max(0, time);
}

abstract class RechartsAnimation<T, E> {
  /**
   * Returns the absolute time after the animationBegin delay has been completed,
   * and when the animationDuration started ticking.
   */
  public getAnimationStartedTime(): number | undefined {
    return this.animationStartedTime;
  }

  /**
   * Returns the absolute time of when the animation began - now it will wait for {animationBegin} ms before the transition starts
   */
  public getBeginStartedTime(): number | undefined {
    return this.beginStartedTime;
  }

  private readonly onAnimationEnd: undefined | AnimationStateCallback;

  private progress: number;

  private animationStartedTime: number | undefined;

  private beginStartedTime: number | undefined;

  protected readonly animationDuration: number;

  private readonly animationBegin: number;

  private readonly from: T;

  private readonly to: T;

  protected readonly easing: E;

  private readonly animationId: string;

  constructor(param: {
    animationId: string;
    onAnimationStart: undefined | AnimationStateCallback;
    onAnimationEnd: undefined | AnimationStateCallback;
    animationDuration: number;
    animationBegin: number;
    from: T;
    to: T;
    easing: E;
  }) {
    this.animationId = param.animationId;
    this.onAnimationEnd = param.onAnimationEnd;
    this.animationDuration = duration(param.animationDuration);
    this.animationBegin = duration(param.animationBegin);
    this.progress = 0;
    this.from = param.from;
    this.to = param.to;
    this.easing = param.easing;
    // Mimic what the previous animationManager was doing - call onAnimationStart immediately and synchronously
    param.onAnimationStart?.();
  }

  private state: AnimationState = INIT;

  /**
   * Returns the state machine current state
   * - `init`:       animation had just been created. It immediately calls `onAnimationStart`
   * - `pending`:    animation is now paused for `animationBegin` milliseconds until the transition begins
   * - `active`:     animation is transitioning items on screen
   * - `completed`:  animation has completed its transition and executed `onAnimationEnd`.
   */
  public getState(): AnimationState {
    return this.state;
  }

  /**
   * Returns the easing input or function
   */
  public getEasing(): E {
    return this.easing;
  }

  /**
   * Returns the configuration - the duration of the transition.
   */
  public getAnimationDuration(): number {
    return this.animationDuration;
  }

  /**
   * Sets the current time of the animation. The animation sets its internal state and progress accordingly.
   * This is current, absolute time; not additive!
   *
   * Returns the (relative) time remaining until the current activity is over — the same number you can
   * put into setTimeout(fn, X) to wait until the next state transition happens.
   */
  public tick(now: number): number {
    if (this.getState() === INIT) {
      this.state = PENDING;
      this.beginStartedTime = now;
      return this.animationBegin;
    }

    if (this.getState() === PENDING) {
      if (this.beginStartedTime == null) {
        throw new Error();
      }
      const timeElapsed = now - this.beginStartedTime;
      if (timeElapsed >= this.animationBegin) {
        this.state = ACTIVE;
        this.animationStartedTime = now;
        // The state flipped just now so the elapsed time is zero
        return this.nextAnimationUpdate(0);
      }
      return duration(this.animationBegin - timeElapsed);
    }

    if (this.getState() === ACTIVE) {
      if (this.animationStartedTime == null) {
        throw new Error();
      }
      const timeElapsed = now - this.animationStartedTime;
      this.setProgress(timeElapsed / this.animationDuration);
      return this.nextAnimationUpdate(timeElapsed);
    }

    // state === COMPLETED, nothing interesting is going to happen
    return 0;
  }

  private setProgress(newProgress: number): void {
    this.progress = Math.min(1, Math.max(0, newProgress));
  }

  /**
   * Returns an abstract "progress" which is a number between 0 and 1 showing the distance of transition.
   * - `init`: 0
   * - `pending`: 0
   * - `active`: transitioning between [0, 1] based on the time elapsed
   * - `completed`: 1
   *
   * The progress is hard-capped to [0, 1] to avoid overshooting caused by coarse timers,
   * so the easing function must be applied _after_ this animation state.
   *
   * The progress is linear with time. If you wish for easing, use `getInterpolated()` instead.
   */
  public getProgress(): number {
    return this.progress;
  }

  /**
   * Completes the animation. A completed animation cannot be manipulated anymore, its progress is set
   * to 1, the tick function is a no-op and getState() always returns 'completed'.
   */
  public complete(): void {
    this.progress = 1;
    if (this.state === "active") {
      // Do not call callbacks if the animation was interrupted before it even started!
      this.onAnimationEnd?.();
    }
    this.state = COMPLETED;
  }

  /**
   * Returns the starting value of the animation (no progress, easing, or interpolation).
   */
  public getFrom(): T {
    return this.from;
  }

  /**
   * Returns the end value of the animation (no progress, easing, or interpolation).
   */
  public getTo(): T {
    return this.to;
  }

  /**
   * Unique identifier of an animation
   */
  public getAnimationId(): string {
    return this.animationId;
  }

  /**
   * Returns the configuration - the duration of delay between animation initialization and transition.
   */
  getAnimationBegin(): number {
    return this.animationBegin;
  }

  /**
   * Returns value of the transition at the current time. Details differ by animation type.
   */
  public abstract getInterpolated(): T;

  /**
   * Returns the duration of time after which the controller should ask for the next update.
   */
  protected abstract nextAnimationUpdate(timeElapsed: number): number;
}

/**
 * Animation handle representing a Javascript-based animation.
 * This animation requires one render cycle for each frame, and it calls setTimeout as quickly as possible.
 *
 * @since 3.9
 */
export class JavascriptAnimation extends RechartsAnimation<number, ProgressEasingFn> {
  protected nextAnimationUpdate(): number {
    /*
     * JavaScript-based animations have to update as soon as possible,
     * so we return 0 here to indicate that the next update should be scheduled immediately.
     */
    return 0;
  }

  /**
   * Returns value of the animation after its easing function had been applied.
   * This value, unlike getProgress(), can escape the [0..1] range because that is
   * entirely within the easing function's control. Spring typically does this.
   */
  public getInterpolated(): number {
    return this.easing(interpolate(this.getFrom(), this.getTo(), this.getProgress()));
  }
}

/**
 * Animation handle representing a CSS transition.
 * This animation requires only one render, and the actual transition is then handled by the browser.
 *
 * @since 3.9
 */
export class CSSTransitionAnimation extends RechartsAnimation<string, NamedBezier> {
  protected nextAnimationUpdate(timeElapsed: number): number {
    /**
     * CSS transitions do not need DOM updates past the initial render
     * so here we just instruct the controller to wait until the animation duration is over.
     */
    return duration(this.animationDuration - timeElapsed);
  }

  /**
   * Returns the final value of the animation (the `to`).
   *
   * CSS transitions leave both interpolation and easing to the browser,
   * so all we need to do here is return the final state and let the browser handle the rest.
   */
  public getInterpolated(): string {
    return this.getTo();
  }
}

/**
 * Recharts animation state machine handle.
 *
 * @since 3.9
 */
export type AnimationHandle = JavascriptAnimation | CSSTransitionAnimation;
