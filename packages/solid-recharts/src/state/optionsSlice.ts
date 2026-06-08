// Ported from recharts 3.8.1 src/state/optionsSlice.ts (commit 7a23854).
// Solid-native slice.
import { createStore } from "solid-js";
import { TooltipEventType } from "../util/types";
import { TooltipIndex, TooltipPayloadSearcher } from "./tooltipSlice";
import { isNan } from "../util/DataUtils";

/**
 * These chart options are decided internally by Recharts and do not change
 * during the chart's lifetime (changing them swaps the root element → a new store).
 */
export type ChartOptions = {
  chartName: string;
  defaultTooltipEventType: TooltipEventType;
  validateTooltipEventTypes?: ReadonlyArray<TooltipEventType>;
  tooltipPayloadSearcher: TooltipPayloadSearcher;
  /** Identifies which chart is emitting events when synchronising. */
  eventEmitter: symbol | undefined;
};

export const arrayTooltipSearcher: TooltipPayloadSearcher = (
  data: unknown,
  strIndex: TooltipIndex,
): unknown => {
  if (!strIndex) return undefined;
  if (!Array.isArray(data)) return undefined;
  const numIndex = Number.parseInt(strIndex, 10);
  if (isNan(numIndex)) {
    return undefined;
  }
  return data[numIndex];
};

export const initialOptionsState: ChartOptions = {
  chartName: "",
  tooltipPayloadSearcher: () => undefined,
  eventEmitter: undefined,
  defaultTooltipEventType: "axis",
};

export interface OptionsActions {
  createEventEmitter(): void;
}

export interface OptionsSlice {
  readonly state: ChartOptions;
  readonly actions: OptionsActions;
}

export function createOptionsSlice(initialState: ChartOptions = initialOptionsState): OptionsSlice {
  const [state, setState] = createStore<ChartOptions>({ ...initialState });

  const actions: OptionsActions = {
    createEventEmitter() {
      setState((s) => {
        if (s.eventEmitter == null) {
          s.eventEmitter = Symbol("rechartsEventEmitter");
        }
      });
    },
  };

  return { state, actions };
}
