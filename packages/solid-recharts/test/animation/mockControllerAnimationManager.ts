// Ported from recharts 3.9.0 test/animation/MockProgressAnimationManager.ts.
//
// The v3.9 new-engine equivalent of the legacy MockProgressAnimationManager:
// it drives an AnimationHandle deterministically (no requestAnimationFrame) via
// mockAnimationController + MockTimeoutController, and exposes a `factory`
// (an AnimationController) to inject through <AnimationControllerProvider.Provider>.
//
// Solid deviation: React's `act()` (used upstream around `complete()`) is dropped
// — this repo has no React; the spec calls `flush()` after each step instead.
import type { AnimationController, AnimationHandle, OnAnimationStateUpdate } from "../../src";
import { mockAnimationController } from "./mockAnimationController";
import { MockTimeoutController } from "./mockTimeoutController";

export interface MockAnimationManager {
  /** Step the eased progress to an absolute percentage in [0, 1] (no rewind). */
  setAnimationProgress(percent: number): Promise<void>;
  /** Finish everything in the queue immediately. */
  completeAnimation(): Promise<void>;
  isAnimating(): boolean;
}

/**
 * A higher-level mock manager that steps a (new-engine) AnimationHandle to an
 * absolute progress percentage. Wire it via `<AnimationControllerProvider.Provider value={manager.factory}>`.
 */
export class MockControllerAnimationManager implements MockAnimationManager {
  private readonly onStop?: () => void;

  private animation: AnimationHandle | null = null;

  private readonly timeoutController: MockTimeoutController = new MockTimeoutController();

  private cancelController: undefined | (() => void);

  private isPrimed: boolean = false;

  /**
   * The easing animation previously required a non-zero first tick to set up
   * internal state. The new engine does not, but the existing assertions are all
   * `firstTick`ms off, so we keep the same delay to avoid rewriting them.
   */
  private firstTick: number = 16;

  constructor(
    private animationId: string,
    onStop?: () => void,
  ) {
    this.onStop = onStop;
  }

  /** AnimationController to inject through `<AnimationControllerProvider.Provider>`. */
  readonly factory: AnimationController = (_timeoutController, animationHandle, listener) => {
    this.start(animationHandle, listener);
    return () => this.stop();
  };

  start(animation: AnimationHandle, listener: OnAnimationStateUpdate): void {
    this.animation = animation;
    this.isPrimed = false;
    this.cancelController = mockAnimationController(
      this.timeoutController,
      this.animation,
      listener,
    );
  }

  stop(): void {
    this.cancelController?.();
    this.cancelController = undefined;
    this.animation = null;
    this.isPrimed = false;
    this.onStop?.();
  }

  async setAnimationProgress(percent: number): Promise<void> {
    if (this.animation === null) {
      throw new Error(`[${this.animationId}] Animation not available`);
    }
    if (percent < 0) {
      throw new Error("Percent must be greater than or equal to 0");
    }
    if (this.animation.getState() === "completed") {
      throw new Error(
        "Animation is already complete. Call completeAnimation to finish the queue. MockControllerAnimationManager does not support rewinding.",
      );
    }

    const animationDuration = await this.peekAnimationDuration();
    // Absolute time: duration*percent + begin + firstTick → `percent` eased progress.
    const timeToAdvance =
      animationDuration * percent + this.animation.getAnimationBegin() + this.firstTick;
    await this.timeoutController.triggerNextTimeout(timeToAdvance);
  }

  async completeAnimation(): Promise<void> {
    if (this.animation === null) {
      throw new Error("Queue is empty");
    }
    if (this.animation.getProgress() < 1) {
      await this.setAnimationProgress(1);
    }
    this.animation?.complete();
    this.onStop?.();
  }

  isAnimating(): boolean {
    return this.animation !== null && this.animation.getState() !== "completed";
  }

  private async prime(): Promise<void> {
    if (this.animation === null) {
      throw new Error("No animation available");
    }
    if (this.isPrimed) {
      return;
    }
    this.isPrimed = true;

    if (this.animation.getState() === "completed") {
      return;
    }
    if (this.animation.getState() === "init") {
      await this.timeoutController.triggerNextTimeout(0);
    }
    if (this.animation.getState() === "pending") {
      await this.timeoutController.triggerNextTimeout(
        this.animation.getAnimationBegin() + this.firstTick,
      );
    }
    if (this.animation.getState() === "active") {
      return;
    }
    throw new Error(`Unexpected animation state: ${this.animation.getState()}`);
  }

  private async peekAnimationDuration(): Promise<number> {
    if (this.animation === null) {
      throw new Error(`[${this.animationId}] Animation not available`);
    }
    await this.prime();
    return this.animation.getAnimationDuration();
  }
}
