// Ported from recharts 3.8.1 src/state/eventSettingsSlice.ts (commit 7a23854).
// Solid-native slice; immer's `castDraft` is unnecessary with a Solid store.
import { createStore } from "solid-js";
import { EventThrottlingProps } from "../util/types";

export type EventSettingsState = Required<EventThrottlingProps>;

export const initialEventSettingsState: EventSettingsState = {
  throttleDelay: "raf",
  throttledEvents: ["mousemove", "touchmove", "pointermove", "scroll", "wheel"],
};

export interface EventSettingsActions {
  setEventSettings(payload: EventThrottlingProps): void;
}

export interface EventSettingsSlice {
  readonly state: EventSettingsState;
  readonly actions: EventSettingsActions;
}

export function createEventSettingsSlice(
  initialState: EventSettingsState = initialEventSettingsState,
): EventSettingsSlice {
  const [state, setState] = createStore<EventSettingsState>({ ...initialState });

  const actions: EventSettingsActions = {
    setEventSettings(payload) {
      setState((s) => {
        if (payload.throttleDelay != null) {
          s.throttleDelay = payload.throttleDelay;
        }
        if (payload.throttledEvents != null) {
          s.throttledEvents = payload.throttledEvents;
        }
      });
    },
  };

  return { state, actions };
}
