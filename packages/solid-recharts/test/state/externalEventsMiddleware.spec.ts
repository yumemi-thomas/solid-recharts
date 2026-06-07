import { flush } from "solid-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CategoricalChartFunc } from "../../src/chart/types";
import { dispatchExternalEvent } from "../../src/state/externalEventsMiddleware";
import { createRechartsStore } from "../../src/state/store";

function createMockEvent(type: string): MouseEvent {
  const event = new MouseEvent(type);
  Object.defineProperty(event, "currentTarget", {
    configurable: true,
    value: document.createElement("div"),
  });
  return event;
}

describe("externalEventsMiddleware", () => {
  let store: ReturnType<typeof createRechartsStore>;
  let mockHandler: ReturnType<typeof vi.fn<CategoricalChartFunc<MouseEvent>>>;
  let mockEvent: MouseEvent;

  beforeEach(() => {
    store = createRechartsStore();
    mockHandler = vi.fn<CategoricalChartFunc<MouseEvent>>();
    mockEvent = createMockEvent("mousemove");
    vi.clearAllTimers();
  });

  it("should not call handler when handler is undefined", () => {
    dispatchExternalEvent(store, {
      reactEvent: mockEvent,
      handler: undefined,
    });

    flush();
    vi.runAllTimers();

    expect(mockHandler).not.toHaveBeenCalled();
  });

  it("should call handler with state and event after requestAnimationFrame triggers", () => {
    dispatchExternalEvent(store, {
      reactEvent: mockEvent,
      handler: mockHandler,
    });

    expect(mockHandler).toHaveBeenCalledTimes(0);
    expect(vi.getTimerCount()).toBeGreaterThan(0);

    flush();
    vi.runAllTimers();

    expect(vi.getTimerCount()).toBe(0);
    expect(mockHandler).toHaveBeenCalledTimes(1);
    expect(mockHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        activeCoordinate: undefined,
        activeDataKey: undefined,
        activeIndex: null,
        activeLabel: undefined,
        activeTooltipIndex: null,
        isTooltipActive: false,
      }),
      expect.objectContaining({
        type: mockEvent.type,
      }),
    );
  });

  it("should not need to persist the event for Solid users", () => {
    dispatchExternalEvent(store, {
      reactEvent: mockEvent,
      handler: mockHandler,
    });

    expect(mockHandler).toHaveBeenCalledTimes(0);
    expect(vi.getTimerCount()).toBeGreaterThan(0);
  });

  it("should cancel previous animation frame when dispatched multiple times with same event type", () => {
    const firstEvent = createMockEvent("touchmove");
    const secondEvent = createMockEvent("touchmove");

    dispatchExternalEvent(store, {
      reactEvent: firstEvent,
      handler: mockHandler,
    });

    dispatchExternalEvent(store, {
      reactEvent: secondEvent,
      handler: mockHandler,
    });

    flush();
    vi.runAllTimers();

    expect(mockHandler).toHaveBeenCalledTimes(1);
  });

  it("should NOT cancel animation frames for different event types", () => {
    const touchEvent = createMockEvent("touchmove");
    const mouseMoveEvent = createMockEvent("mousemove");
    const handler1 = vi.fn<CategoricalChartFunc<MouseEvent>>();
    const handler2 = vi.fn<CategoricalChartFunc<MouseEvent>>();

    dispatchExternalEvent(store, {
      reactEvent: touchEvent,
      handler: handler1,
    });

    dispatchExternalEvent(store, {
      reactEvent: mouseMoveEvent,
      handler: handler2,
    });

    flush();
    vi.runAllTimers();

    expect(handler1).toHaveBeenCalledTimes(1);
    expect(handler2).toHaveBeenCalledTimes(1);
  });

  it("should handle multiple handlers with different events", () => {
    const handler1 = vi.fn<CategoricalChartFunc<MouseEvent>>();
    const handler2 = vi.fn<CategoricalChartFunc<MouseEvent>>();
    const event1 = createMockEvent("touchmove");
    const event2 = createMockEvent("mousemove");

    dispatchExternalEvent(store, {
      reactEvent: event1,
      handler: handler1,
    });

    dispatchExternalEvent(store, {
      reactEvent: event2,
      handler: handler2,
    });

    flush();
    vi.runAllTimers();

    expect(handler1).toHaveBeenCalledTimes(1);
    expect(handler2).toHaveBeenCalledTimes(1);
  });

  it("should have access to currentTarget in the async handler even if it is nullified on the original event", () => {
    let currentTarget: HTMLElement | null = document.createElement("div");
    const spy = vi.fn();
    const eventWithCurrentTarget = new MouseEvent("mousemove");
    Object.defineProperty(eventWithCurrentTarget, "currentTarget", {
      configurable: true,
      get() {
        return currentTarget;
      },
    });
    Object.defineProperty(eventWithCurrentTarget, "preventDefault", {
      configurable: true,
      value: spy,
    });

    dispatchExternalEvent(store, {
      reactEvent: eventWithCurrentTarget,
      handler: mockHandler,
    });

    currentTarget = null;

    flush();
    vi.runAllTimers();

    expect(mockHandler).toHaveBeenCalledTimes(1);
    const eventPassedToHandler = mockHandler.mock.calls[0]?.[1];
    expect(eventPassedToHandler?.currentTarget).not.toBeNull();
    expect(eventPassedToHandler?.currentTarget).toBeInstanceOf(HTMLDivElement);
    expect(spy).toHaveBeenCalledTimes(0);
    eventPassedToHandler?.preventDefault();
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
