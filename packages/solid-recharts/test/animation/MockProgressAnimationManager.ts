// Ported from recharts 3.8.1 test/animation/MockProgressAnimationManager.ts
// (commit 7a23854). A higher-level mock manager that steps an animation to an
// absolute progress percentage deterministically (no requestAnimationFrame).
import { MockAbstractAnimationManager } from "./MockAbstractAnimationManager";
import { AnimationManager, ReactSmoothQueue } from "../../src/animation/AnimationManager";

export interface MockAnimationManager {
  /** Step the eased progress to an absolute percentage in [0, 1] (no rewind). */
  setAnimationProgress(percent: number): Promise<void>;
  /** Finish everything in the queue immediately (does not call onAnimationEnd). */
  completeAnimation(): Promise<void>;
  isAnimating(): boolean;
}

export class MockProgressAnimationManager
  extends MockAbstractAnimationManager
  implements AnimationManager, MockAnimationManager
{
  private readonly onStop?: () => void;

  constructor(
    private animationId: string,
    onStop?: () => void,
  ) {
    super();
    this.onStop = onStop;
  }

  async setAnimationProgress(percent: number): Promise<void> {
    if (this.queue === null || this.queue.length === 0) {
      throw new Error(`[${this.animationId}] Queue is empty`);
    }
    if (percent < 0) {
      throw new Error("Percent must be greater than or equal to 0");
    }
    if (this.animationProgress >= 1) {
      throw new Error(
        "Animation is already complete. Call completeAnimation to finish the queue. MockProgressAnimationManager does not support rewinding.",
      );
    }

    this.animationProgress = percent;
    const animationDuration = await this.peekAnimationDuration();
    // The configUpdate easing tracks absolute start time internally, so advancing
    // to `duration * percent + firstTick` yields `percent` progress.
    const timeToAdvance = animationDuration * percent + this.firstTick;
    await this.triggerNextTimeout(timeToAdvance);
  }

  async completeAnimation(): Promise<void> {
    if (this.queue === null || this.queue.length === 0) {
      throw new Error("Queue is empty");
    }
    if (this.animationProgress < 1) {
      await this.setAnimationProgress(1);
    }
    const result = this.poll(this.queue.length);
    this.onStop?.();
    return result;
  }

  override start(queue: ReactSmoothQueue): void {
    super.start(queue);
    this.isPrimed = false;
    this.animationProgress = 0;
  }

  override stop(): void {
    super.stop();
    this.isPrimed = false;
    this.animationProgress = 0;
    this.onStop?.();
  }

  private isPrimed: boolean = false;

  /** Length of the priming tick (ms) the easing function needs to set up state. */
  private firstTick: number = 16;

  private animationProgress: number = 0;

  private async prime(): Promise<void> {
    if (this.isPrimed) {
      return;
    }
    this.isPrimed = true;
    // Queue layout (by Animate convention): [onStart, beginDelay, easingFn, duration, onEnd].
    await this.poll(2); // onStart + starting delay
    await this.poll(1); // the easing function
    // configUpdate's easing needs one non-zero tick to kickstart.
    await this.triggerNextTimeout(this.firstTick);
  }

  private async peekAnimationDuration(): Promise<number> {
    if (this.queue === null || this.queue.length === 0) {
      throw new Error(`[${this.animationId}] Queue is empty`);
    }
    await this.prime();
    const animationDuration = this.queue[0];
    if (typeof animationDuration !== "number") {
      throw new Error(
        `[${this.animationId}] Expected the first queue item to be the animation duration; found [${typeof animationDuration}].`,
      );
    }
    return animationDuration;
  }
}
