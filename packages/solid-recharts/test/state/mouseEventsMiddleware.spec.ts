import { beforeEach, describe, expect, it, vi } from "vitest";
import type { HTMLMousePointer } from "../../src/util/types";
import { createRechartsStore } from "../../src/state/store";
import { dispatchMouseClick, dispatchMouseMove } from "../../src/state/mouseEventsMiddleware";
import { getMockDomRect } from "../helper/mockGetBoundingClientRect";

function createMockMousePointer(x: number, y: number): HTMLMousePointer {
  return {
    clientX: x,
    clientY: y,
    currentTarget: {
      getBoundingClientRect: () => getMockDomRect({ width: 500, height: 300 }),
      offsetWidth: 500,
      offsetHeight: 300,
    },
  };
}

describe("mouseClickMiddleware", () => {
  let store: ReturnType<typeof createRechartsStore>;

  beforeEach(() => {
    store = createRechartsStore();
  });

  it("should run immediately without requestAnimationFrame", () => {
    const mockMousePointer = createMockMousePointer(100, 100);
    expect(vi.getTimerCount()).toBe(0);

    dispatchMouseClick(store, mockMousePointer);

    expect(vi.getTimerCount()).toBe(0);
  });

  it("should handle multiple clicks without canceling each other", () => {
    const click1 = createMockMousePointer(50, 50);
    const click2 = createMockMousePointer(100, 100);
    const click3 = createMockMousePointer(150, 150);

    dispatchMouseClick(store, click1);
    dispatchMouseClick(store, click2);
    dispatchMouseClick(store, click3);

    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("mouseMoveMiddleware", () => {
  let store: ReturnType<typeof createRechartsStore>;

  beforeEach(() => {
    store = createRechartsStore();
  });

  it("should debounce rapid mousemove events using requestAnimationFrame", () => {
    const move1 = createMockMousePointer(50, 50);
    const move2 = createMockMousePointer(100, 100);
    const move3 = createMockMousePointer(150, 150);

    dispatchMouseMove(store, move1);
    expect(vi.getTimerCount()).toBe(1);

    dispatchMouseMove(store, move2);
    expect(vi.getTimerCount()).toBe(1);

    dispatchMouseMove(store, move3);
    expect(vi.getTimerCount()).toBe(1);
    vi.runOnlyPendingTimers();

    expect(vi.getTimerCount()).toBe(0);
  });
});
