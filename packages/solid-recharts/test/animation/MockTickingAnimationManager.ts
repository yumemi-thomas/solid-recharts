// Ported from recharts 3.8.1 test/animation/MockTickingAnimationManager.ts
// (commit 7a23854). A low-level mock manager giving detailed control over the
// animation queue: assert a serializable view of it, step through it item-by-item
// with poll()/triggerNextTimeout(), and query whether it is currently running.
import { expect } from "vitest";
import { AnimationManager, ReactSmoothQueue } from "../../src/animation/AnimationManager";
import { MockAbstractAnimationManager } from "./MockAbstractAnimationManager";
import { assertNotNull } from "../helper/assertNotNull";

/**
 * A serializable view of the queue: functions are represented by their (mock) names
 * so that assertions are easy to write.
 */
export type SerializableQueue = ReadonlyArray<string | number | Record<string, unknown>>;

export class MockTickingAnimationManager
  extends MockAbstractAnimationManager
  implements AnimationManager
{
  /**
   * Assert against a serializable view of the current queue. Functions are rendered
   * as `[function <name>]`. Pass `null` to assert the queue is empty.
   */
  public assertQueue(expectedQueue: SerializableQueue | null): void {
    if (expectedQueue === null) {
      expect(this.queue).toBeNull();
      return;
    }
    assertNotNull(this.queue);
    const serializedQueue: SerializableQueue = this.queue.map((item) => {
      if (typeof item === "function") {
        // vi.fn() spies carry a `getMockName()`; plain functions expose `.name`.
        const mockName =
          "getMockName" in item && typeof item.getMockName === "function"
            ? item.getMockName()
            : undefined;
        const name = typeof mockName === "string" ? mockName : item.name;
        return `[function ${name || "anonymous"}]`;
      }
      return item;
    });
    expect(serializedQueue).toEqual(expectedQueue);
  }

  /**
   * Process `count` items from the queue (default 1): functions run immediately,
   * objects/strings are pushed to the subscriber, numbers resolve as if the timeout
   * elapsed. Easing functions in the queue run as regular functions; to step their
   * independent timing use `triggerNextTimeout`.
   */
  public override poll(count: number = 1): Promise<void> {
    return super.poll(count);
  }

  /** Trigger the next pending timeout (used to step the easing function's own clock). */
  public override async triggerNextTimeout(now: number): Promise<void> {
    return super.triggerNextTimeout(now);
  }

  private isRunningPrivate: boolean = false;

  override start(queue: ReactSmoothQueue): void {
    super.start(queue);
    this.isRunningPrivate = true;
  }

  override stop(): void {
    super.stop();
    this.isRunningPrivate = false;
  }

  isRunning(): boolean {
    return this.isRunningPrivate;
  }
}
