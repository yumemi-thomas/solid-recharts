// Ported from recharts 3.8.1 src/state/mouseEventsMiddleware.ts (commit 7a23854).
//
// Solid rewrite: redux listener middleware → `dispatchMouseMove(store, pointer)`.
// Throttling via eventSettings matches reference (raf / ms / allowlist).
import { getRelativeCoordinate } from "../util/getRelativeCoordinate";
import type { HTMLMousePointer, RelativePointer } from "../util/types";
import { selectActivePropsFromChartPointer } from "./selectors/tooltipSelectors";
import { selectTooltipEventType } from "./selectors/selectTooltipEventType";
import type { RechartsStore } from "./store";
import { isEventThrottled } from "./isEventThrottled";

/*
 * This single rafId is safe because:
 * 1. Each chart has its own store instance
 * 2. mouseMove only fires from one DOM element (the chart wrapper)
 * 3. Rapid mousemove events from the same element SHOULD throttle — we only care about the latest position
 */
let rafId: number | null = null;
let timeoutId: ReturnType<typeof setTimeout> | null = null;
let latestChartPointer: RelativePointer | null = null;

export function dispatchMouseClick(store: RechartsStore, mousePointer: HTMLMousePointer): void {
  const activeProps = selectActivePropsFromChartPointer(
    store.state,
    getRelativeCoordinate(mousePointer),
  );
  if (activeProps?.activeIndex != null) {
    store.actions.tooltip.setMouseClickAxisIndex({
      activeIndex: activeProps.activeIndex,
      activeDataKey: undefined,
      activeCoordinate: activeProps.activeCoordinate,
    });
  }
}

export function dispatchMouseMove(store: RechartsStore, mousePointer: HTMLMousePointer): void {
  const state = store.state;
  const { throttleDelay, throttledEvents } = state.eventSettings;
  const isThrottled = isEventThrottled(throttledEvents, "mousemove");

  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  if (timeoutId !== null && (typeof throttleDelay !== "number" || !isThrottled)) {
    clearTimeout(timeoutId);
    timeoutId = null;
  }

  latestChartPointer = getRelativeCoordinate(mousePointer);

  const callback = (): void => {
    const currentState = store.state;
    const tooltipEventType = selectTooltipEventType(
      currentState,
      currentState.tooltip.settings.shared,
    );
    if (!latestChartPointer) {
      rafId = null;
      timeoutId = null;
      return;
    }

    if (tooltipEventType === "axis") {
      const activeProps = selectActivePropsFromChartPointer(currentState, latestChartPointer);
      if (activeProps?.activeIndex != null) {
        store.actions.tooltip.setMouseOverAxisIndex({
          activeIndex: activeProps.activeIndex,
          activeDataKey: undefined,
          activeCoordinate: activeProps.activeCoordinate,
        });
      } else {
        store.actions.tooltip.mouseLeaveChart();
      }
    }
    rafId = null;
    timeoutId = null;
  };

  if (!isThrottled) {
    callback();
    return;
  }

  if (throttleDelay === "raf") {
    rafId = requestAnimationFrame(callback);
  } else if (typeof throttleDelay === "number") {
    if (timeoutId === null) {
      timeoutId = setTimeout(callback, throttleDelay);
    }
  }
}
