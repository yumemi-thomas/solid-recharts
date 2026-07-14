// Ported from recharts 3.8.1 test/state/throttling.spec.ts (commit 7a23854).
// Adapted: Redux dispatch → store.actions + dispatchMouseMove / dispatchKeyDown /
// dispatchExternalEvent; React act() → Solid flush().
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { HTMLMousePointer } from "../../src/util/types";
import { createRechartsStore } from "../../src/state/store";
import { dispatchMouseMove } from "../../src/state/mouseEventsMiddleware";
import { dispatchKeyDown } from "../../src/state/keyboardEventsMiddleware";
import { dispatchExternalEvent } from "../../src/state/externalEventsMiddleware";
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

describe("Throttling Middleware", () => {
  let store: ReturnType<typeof createRechartsStore>;

  beforeEach(() => {
    store = createRechartsStore();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useFakeTimers({
      toFake: ["requestAnimationFrame", "cancelAnimationFrame"],
    });
  });

  describe("mouseMoveMiddleware", () => {
    it("should use RAF by default", () => {
      store.actions.eventSettings.setEventSettings({
        throttleDelay: "raf",
        throttledEvents: "all",
      });
      const move1 = createMockMousePointer(50, 50);

      dispatchMouseMove(store, move1);
      expect(vi.getTimerCount()).toBe(1);
      vi.runAllTimers();
      expect(vi.getTimerCount()).toBe(0);
    });

    it("should use setTimeout when throttleDelay is a number", () => {
      store.actions.eventSettings.setEventSettings({ throttleDelay: 100, throttledEvents: "all" });
      const move1 = createMockMousePointer(50, 50);

      dispatchMouseMove(store, move1);
      expect(vi.getTimerCount()).toBe(1);
      vi.advanceTimersByTime(50);
      expect(vi.getTimerCount()).toBe(1);
      vi.advanceTimersByTime(50);
      expect(vi.getTimerCount()).toBe(0);
    });

    it("should run synchronously when throttledEvents does not include mousemove", () => {
      store.actions.eventSettings.setEventSettings({
        throttleDelay: "raf",
        throttledEvents: ["click"],
      });
      const move1 = createMockMousePointer(50, 50);

      dispatchMouseMove(store, move1);
      expect(vi.getTimerCount()).toBe(0);
    });

    it("should run synchronously when throttledEvents is empty", () => {
      store.actions.eventSettings.setEventSettings({ throttleDelay: "raf", throttledEvents: [] });
      const move1 = createMockMousePointer(50, 50);

      dispatchMouseMove(store, move1);
      expect(vi.getTimerCount()).toBe(0);
    });

    it("should throttle mousemove events (not debounce) when throttleDelay is a number", () => {
      store.actions.eventSettings.setEventSettings({ throttleDelay: 100, throttledEvents: "all" });
      const move1 = createMockMousePointer(50, 50);
      const move2 = createMockMousePointer(60, 60);

      dispatchMouseMove(store, move1);
      expect(vi.getTimerCount()).toBe(1);
      vi.advanceTimersByTime(50);
      dispatchMouseMove(store, move2);
      expect(vi.getTimerCount()).toBe(1);
      vi.advanceTimersByTime(60);
      expect(vi.getTimerCount()).toBe(0);
    });
  });

  describe("keyboardEventsMiddleware", () => {
    it("should throttle keydown events (not debounce) when throttleDelay is a number", () => {
      store.actions.eventSettings.setEventSettings({ throttleDelay: 100, throttledEvents: "all" });
      dispatchKeyDown(store, "ArrowRight");
      expect(vi.getTimerCount()).toBe(1);
      vi.advanceTimersByTime(50);
      dispatchKeyDown(store, "ArrowRight");
      expect(vi.getTimerCount()).toBe(1);
      vi.advanceTimersByTime(60);
      expect(vi.getTimerCount()).toBe(0);
    });
  });

  describe("externalEventsMiddleware", () => {
    const mockHandler = vi.fn();
    const mockEvent = {
      type: "click",
      currentTarget: document.createElement("div"),
    };

    beforeEach(() => {
      mockHandler.mockClear();
    });

    it("should execute first event immediately (leading edge) when throttleDelay is a number", () => {
      store.actions.eventSettings.setEventSettings({ throttleDelay: 100, throttledEvents: "all" });
      dispatchExternalEvent(store, {
        reactEvent: mockEvent,
        handler: mockHandler,
      });

      expect(mockHandler).toHaveBeenCalledTimes(1);
      expect(vi.getTimerCount()).toBe(1);
      vi.runAllTimers();
      expect(vi.getTimerCount()).toBe(0);
    });

    it("should throttle click event (leading + trailing) when configured", () => {
      store.actions.eventSettings.setEventSettings({ throttleDelay: 100, throttledEvents: "all" });
      dispatchExternalEvent(store, {
        reactEvent: mockEvent,
        handler: mockHandler,
      });
      expect(mockHandler).toHaveBeenCalledTimes(1);

      dispatchExternalEvent(store, {
        reactEvent: mockEvent,
        handler: mockHandler,
      });
      expect(mockHandler).toHaveBeenCalledTimes(1);
      vi.advanceTimersByTime(110);
      expect(mockHandler).toHaveBeenCalledTimes(2);
      expect(vi.getTimerCount()).toBe(0);
    });

    it("should NOT throttle click event when not in allowlist", () => {
      store.actions.eventSettings.setEventSettings({
        throttleDelay: 100,
        throttledEvents: ["mousemove"],
      });
      dispatchExternalEvent(store, {
        reactEvent: mockEvent,
        handler: mockHandler,
      });

      expect(vi.getTimerCount()).toBe(0);
      expect(mockHandler).toHaveBeenCalled();
    });
  });
});
