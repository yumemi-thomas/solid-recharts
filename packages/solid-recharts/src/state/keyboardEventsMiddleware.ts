// Ported from recharts 3.8.1 src/state/keyboardEventsMiddleware.ts (commit 7a23854).
//
// Solid rewrite: redux listener middleware → dispatchKeyDown / handleFocusEvent /
// handleBlurEvent. Throttling via eventSettings matches reference.
import { RechartsStore } from "./store";
import { TooltipInteractionState } from "./tooltipSlice";
import {
  selectTooltipAxisDataKey,
  selectTooltipAxisDomain,
  selectTooltipAxisTicks,
  selectTooltipDisplayedData,
  selectCoordinateForDefaultIndex,
} from "./selectors/tooltipSelectors";
import { selectChartDirection } from "./selectors/axisSelectors";
import { combineActiveTooltipIndex } from "./selectors/combiners/combineActiveTooltipIndex";
import { selectTooltipEventType } from "./selectors/selectTooltipEventType";
import { isEventThrottled } from "./isEventThrottled";

const mkInteraction = (index: number): TooltipInteractionState => ({
  active: false,
  index: String(index),
  dataKey: undefined,
  graphicalItemId: undefined,
  coordinate: undefined,
});

let rafId: number | null = null;
let timeoutId: ReturnType<typeof setTimeout> | null = null;
let latestKeyboardActionPayload: KeyboardEvent["key"] | null = null;

export function dispatchKeyDown(store: RechartsStore, key: KeyboardEvent["key"]): void {
  latestKeyboardActionPayload = key;

  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }

  const state = store.state;
  const { throttleDelay, throttledEvents } = state.eventSettings;
  const isThrottled = isEventThrottled(throttledEvents, "keydown");

  if (timeoutId !== null && (typeof throttleDelay !== "number" || !isThrottled)) {
    clearTimeout(timeoutId);
    timeoutId = null;
  }

  const callback = (): void => {
    try {
      const keyPayload = latestKeyboardActionPayload;
      if (keyPayload != null) {
        handleKeyboardEvent(store, keyPayload);
      }
    } finally {
      rafId = null;
      timeoutId = null;
    }
  };

  if (!isThrottled) {
    callback();
    return;
  }

  if (throttleDelay === "raf") {
    rafId = requestAnimationFrame(callback);
  } else if (typeof throttleDelay === "number") {
    if (timeoutId === null) {
      callback();
      latestKeyboardActionPayload = null;

      timeoutId = setTimeout(() => {
        if (latestKeyboardActionPayload) {
          callback();
        } else {
          timeoutId = null;
          rafId = null;
        }
      }, throttleDelay);
    }
  }
}

export function handleKeyboardEvent(store: RechartsStore, key: string): void {
  const state = store.state;
  if (state.rootProps.accessibilityLayer === false) {
    return;
  }
  if (key !== "ArrowRight" && key !== "ArrowLeft" && key !== "Enter") {
    return;
  }
  const { keyboardInteraction } = state.tooltip;

  const resolvedIndex = combineActiveTooltipIndex(
    keyboardInteraction,
    selectTooltipDisplayedData(state),
    selectTooltipAxisDataKey(state),
    selectTooltipAxisDomain(state),
  );
  const currentIndex = resolvedIndex == null ? -1 : Number(resolvedIndex);
  const isOutsideDomain = !Number.isFinite(currentIndex) || currentIndex < 0;
  const tooltipTicks = selectTooltipAxisTicks(state);
  const displayedData = selectTooltipDisplayedData(state);
  const tooltipEventType = selectTooltipEventType(state, state.tooltip.settings.shared);

  if (key === "Enter") {
    if (isOutsideDomain) {
      return;
    }
    const coordinate = selectCoordinateForDefaultIndex(
      state,
      tooltipEventType,
      "hover",
      String(keyboardInteraction.index),
    );
    store.actions.tooltip.setKeyboardInteraction({
      active: !keyboardInteraction.active,
      activeIndex: keyboardInteraction.index,
      activeCoordinate: coordinate,
    });
    return;
  }

  const direction = selectChartDirection(state);
  const directionMultiplier = direction === "left-to-right" ? 1 : -1;
  const movement = key === "ArrowRight" ? 1 : -1;
  let nextIndex: number;
  if (isOutsideDomain) {
    const axisDataKey = selectTooltipAxisDataKey(state);
    const domain = selectTooltipAxisDomain(state);
    const effectiveMovement = movement * directionMultiplier;
    nextIndex = -1;
    if (effectiveMovement > 0) {
      for (let i = 0; i < displayedData.length; i++) {
        if (
          combineActiveTooltipIndex(mkInteraction(i), displayedData, axisDataKey, domain) != null
        ) {
          nextIndex = i;
          break;
        }
      }
    } else {
      for (let i = displayedData.length - 1; i >= 0; i--) {
        if (
          combineActiveTooltipIndex(mkInteraction(i), displayedData, axisDataKey, domain) != null
        ) {
          nextIndex = i;
          break;
        }
      }
    }
    if (nextIndex < 0) {
      return;
    }
  } else {
    nextIndex = currentIndex + movement * directionMultiplier;
    const dataLength = tooltipTicks?.length || displayedData.length;
    if (dataLength === 0 || nextIndex >= dataLength || nextIndex < 0) {
      return;
    }
  }
  const coordinate = selectCoordinateForDefaultIndex(
    state,
    tooltipEventType,
    "hover",
    String(nextIndex),
  );
  store.actions.tooltip.setKeyboardInteraction({
    active: true,
    activeIndex: nextIndex.toString(),
    activeCoordinate: coordinate,
  });
}

export function handleFocusEvent(store: RechartsStore): void {
  const state = store.state;
  if (state.rootProps.accessibilityLayer === false) {
    return;
  }
  const { keyboardInteraction } = state.tooltip;
  if (keyboardInteraction.active || keyboardInteraction.index != null) {
    return;
  }
  const nextIndex = "0";
  const tooltipEventType = selectTooltipEventType(state, state.tooltip.settings.shared);
  const coordinate = selectCoordinateForDefaultIndex(state, tooltipEventType, "hover", nextIndex);
  store.actions.tooltip.setKeyboardInteraction({
    active: true,
    activeIndex: nextIndex,
    activeCoordinate: coordinate,
  });
}

export function handleBlurEvent(store: RechartsStore): void {
  const state = store.state;
  if (state.rootProps.accessibilityLayer === false) {
    return;
  }
  const { keyboardInteraction } = state.tooltip;
  if (keyboardInteraction.active) {
    store.actions.tooltip.setKeyboardInteraction({
      active: false,
      activeIndex: keyboardInteraction.index,
      activeCoordinate: keyboardInteraction.coordinate,
    });
  }
}
