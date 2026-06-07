// Ported from recharts 3.8.1 test/animation/MockAbstractAnimationManager.ts
// (commit 7a23854). Adapted: the React `act(async () => …)` wrapper is dropped
// (no React here; the queue callbacks contain no Solid reactive primitives that
// need batching — same rationale as mockTimeoutController).
import {
  AnimationManager,
  HandleChangeFn,
  ReactSmoothQueue,
  ReactSmoothStyle,
} from "../../src/animation/AnimationManager";
import { TimeoutController } from "../../src/animation/timeoutController";
import { MockTimeoutController } from "./mockTimeoutController";

/**
 * Abstract base for the mock animation managers. Use a concrete subclass.
 */
export abstract class MockAbstractAnimationManager implements AnimationManager {
  /**
   * Processes `count` items from the queue: functions run immediately, objects/
   * strings are pushed to the subscriber, numbers are treated as resolved timeouts.
   */
  protected async poll(count: number = 1): Promise<void> {
    for (let i = 0; i < count; i++) {
      // eslint-disable-next-line no-await-in-loop
      await this.pollPrivate();
    }
  }

  protected async triggerNextTimeout(now: number): Promise<void> {
    if (this.timeoutController.getCallbacksCount() === 0) {
      return;
    }
    await this.timeoutController.triggerNextTimeout(now);
  }

  public isAnimating(): boolean {
    return this.queue !== null && this.queue.length > 0;
  }

  protected queue: ReactSmoothQueue | null = null;

  protected readonly timeoutController: MockTimeoutController = new MockTimeoutController();

  private listener: HandleChangeFn | null = null;

  start(queue: ReactSmoothQueue): void {
    this.queue = queue;
    this.timeoutController.clear();
  }

  stop(): void {
    this.queue = null;
  }

  subscribe(handleChange: (style: ReactSmoothStyle) => void): () => void {
    this.listener = handleChange;
    return () => {
      this.listener = null;
    };
  }

  getTimeoutController(): TimeoutController {
    return this.timeoutController;
  }

  private async pollPrivate(): Promise<void> {
    if (this.queue === null || this.queue.length === 0) {
      throw new Error("Queue is empty");
    }
    const head = this.queue[0];

    this.queue = this.queue.slice(1);
    if (typeof head === "function") {
      head();
    } else if (typeof head === "object" || typeof head === "string") {
      this.listener?.(head);
    } else if (typeof head === "number") {
      // pretend a timeout elapsed — good enough for testing
      await Promise.resolve();
    }
  }
}
