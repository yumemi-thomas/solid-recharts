// Partial port of recharts 3.8.1 src/state/selectors/rootPropsSelectors.ts
// (commit 7a23854). Only the leaf accessors the axis vertical needs today; the
// module grows as more root props are consumed.
import { RechartsRootState } from "../store";
import { BaseValue, StackOffsetType, SyncMethod } from "../../util/types";

export const selectBarCategoryGap = (state: RechartsRootState): string | number =>
  state.rootProps.barCategoryGap;

export const selectBarGap = (state: RechartsRootState): string | number => state.rootProps.barGap;

export const selectRootBarSize = (state: RechartsRootState): string | number | undefined =>
  state.rootProps.barSize;

export const selectRootMaxBarSize = (state: RechartsRootState): number | undefined =>
  state.rootProps.maxBarSize;

export const selectStackOffsetType = (state: RechartsRootState): StackOffsetType =>
  state.rootProps.stackOffset;

export const selectReverseStackOrder = (state: RechartsRootState): boolean =>
  state.rootProps.reverseStackOrder;

export const selectChartName = (state: RechartsRootState): string => state.options.chartName;

export const selectChartBaseValue = (state: RechartsRootState): BaseValue | undefined =>
  state.rootProps.baseValue;

export const selectSyncMethod = (state: RechartsRootState): SyncMethod =>
  state.rootProps.syncMethod;

export const selectSyncId = (state: RechartsRootState): number | string | undefined =>
  state.rootProps.syncId;

export const selectEventEmitter = (state: RechartsRootState): symbol | undefined =>
  state.options.eventEmitter;
