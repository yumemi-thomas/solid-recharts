// Ported from recharts 3.8.1 src/state/externalEventsMiddleware.ts (commit 7a23854).
//
// Solid rewrite: redux listener middleware → `dispatchExternalEvent(store, payload)`.
import { createEventProxy } from "../util/createEventProxy";
import type { CategoricalChartFunc } from "../chart/types";
import type { MouseHandlerDataParam } from "../synchronisation/types";
import {
  selectActiveCoordinate,
  selectActiveLabel,
  selectActiveTooltipDataKey,
  selectActiveTooltipIndex,
  selectIsTooltipActive,
} from "./selectors/tooltipSelectors";
import { selectTooltipEventType } from "./selectors/selectTooltipEventType";
import type { RechartsStore } from "./store";
import { isEventThrottled } from "./isEventThrottled";

export type ExternalEventActionPayload<E = Event> = {
  reactEvent: E;
  handler: CategoricalChartFunc<E> | undefined;
};

const rafIdMap = new Map<string, number>();
const timeoutIdMap = new Map<string, ReturnType<typeof setTimeout>>();
const latestEventMap = new Map<
  string,
  {
    reactEvent: Event & { currentTarget: unknown };
    invoke: (state: MouseHandlerDataParam) => void;
  }
>();

export function dispatchExternalEvent<E extends Event & { currentTarget: unknown }>(
  store: RechartsStore,
  payload: ExternalEventActionPayload<E>,
): void {
  const { handler, reactEvent } = payload;
  if (handler == null) {
    return;
  }

  const eventType = reactEvent.type;
  const eventProxy = createEventProxy(reactEvent);

  latestEventMap.set(eventType, {
    reactEvent: eventProxy,
    invoke: (nextState) => {
      handler(nextState, eventProxy);
    },
  });

  const existingRafId = rafIdMap.get(eventType);
  if (existingRafId !== undefined) {
    cancelAnimationFrame(existingRafId);
    rafIdMap.delete(eventType);
  }

  const state = store.state;
  const { throttleDelay, throttledEvents } = state.eventSettings;
  const isThrottled = isEventThrottled(throttledEvents, eventType);

  const existingTimeoutId = timeoutIdMap.get(eventType);
  if (existingTimeoutId !== undefined && (typeof throttleDelay !== "number" || !isThrottled)) {
    clearTimeout(existingTimeoutId);
    timeoutIdMap.delete(eventType);
  }

  const callback = (): void => {
    const latestAction = latestEventMap.get(eventType);

    try {
      if (!latestAction) {
        return;
      }

      const { invoke } = latestAction;
      const currentState = store.state;
      const tooltipEventType = selectTooltipEventType(
        currentState,
        currentState.tooltip.settings.shared,
      );
      const { trigger, defaultIndex } = currentState.tooltip.settings;
      const nextState: MouseHandlerDataParam = {
        activeCoordinate: selectActiveCoordinate(
          currentState,
          tooltipEventType,
          trigger,
          defaultIndex,
        ),
        activeDataKey: selectActiveTooltipDataKey(currentState),
        activeIndex: selectActiveTooltipIndex(currentState),
        activeLabel: selectActiveLabel(currentState, tooltipEventType, trigger, defaultIndex),
        activeTooltipIndex: selectActiveTooltipIndex(currentState),
        isTooltipActive: selectIsTooltipActive(
          currentState,
          tooltipEventType,
          trigger,
          defaultIndex,
        ).isActive,
      };

      invoke(nextState);
    } finally {
      rafIdMap.delete(eventType);
      timeoutIdMap.delete(eventType);
      latestEventMap.delete(eventType);
    }
  };

  if (!isThrottled) {
    callback();
    return;
  }

  if (throttleDelay === "raf") {
    const rafId = requestAnimationFrame(callback);
    rafIdMap.set(eventType, rafId);
  } else if (typeof throttleDelay === "number") {
    if (!timeoutIdMap.has(eventType)) {
      callback();
      const timeoutId = setTimeout(callback, throttleDelay);
      timeoutIdMap.set(eventType, timeoutId);
    }
  } else {
    callback();
  }
}
