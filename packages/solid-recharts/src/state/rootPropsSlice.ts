// Ported from recharts 3.8.1 src/state/rootPropsSlice.ts (commit 7a23854).
// Solid-native slice. `BaseValue`/`SyncMethod` come from the (seeded) util/types.
import { createStore, produce } from "solid-js/store";
import { StackOffsetType, SyncMethod, BaseValue } from "../util/types";

/**
 * Chart options users can change at runtime (changing them re-renders the chart).
 */
export type UpdatableChartOptions = {
  accessibilityLayer: boolean;
  barCategoryGap: number | string;
  barGap: number | string;
  barSize: string | number | undefined;
  class: string | undefined;
  maxBarSize: number | undefined;
  stackOffset: StackOffsetType;
  syncId: number | string | undefined;
  syncMethod: SyncMethod;
  baseValue: BaseValue | undefined;
  reverseStackOrder: boolean;
};

export const initialRootPropsState: UpdatableChartOptions = {
  accessibilityLayer: true,
  barCategoryGap: "10%",
  barGap: 4,
  barSize: undefined,
  class: undefined,
  maxBarSize: undefined,
  stackOffset: "none",
  syncId: undefined,
  syncMethod: "index",
  baseValue: undefined,
  reverseStackOrder: false,
};

export interface RootPropsActions {
  updateOptions(payload: UpdatableChartOptions): void;
}

export interface RootPropsSlice {
  readonly state: UpdatableChartOptions;
  readonly actions: RootPropsActions;
}

export function createRootPropsSlice(
  initialState: UpdatableChartOptions = initialRootPropsState,
): RootPropsSlice {
  const [state, setState] = createStore<UpdatableChartOptions>({ ...initialState });

  const actions: RootPropsActions = {
    updateOptions(payload) {
      setState(
        produce((s) => {
          s.accessibilityLayer = payload.accessibilityLayer;
          s.barCategoryGap = payload.barCategoryGap;
          s.barGap = payload.barGap ?? initialRootPropsState.barGap;
          s.barSize = payload.barSize;
          s.maxBarSize = payload.maxBarSize;
          s.stackOffset = payload.stackOffset;
          s.syncId = payload.syncId;
          s.syncMethod = payload.syncMethod;
          s.class = payload.class;
          s.baseValue = payload.baseValue;
          s.reverseStackOrder = payload.reverseStackOrder;
        }),
      );
    },
  };

  return { state, actions };
}
