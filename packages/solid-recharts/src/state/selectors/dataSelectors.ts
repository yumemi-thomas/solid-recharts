// Ported from recharts 3.8.1 src/state/selectors/dataSelectors.ts (commit 7a23854).
//
// Solid-native: plain selector functions, no reselect. recharts wraps several of
// these in `createSelector` purely for memoization (to swallow spurious Immer
// reference churn); in the Solid store, memoization comes from `useAppSelector`'s
// `createMemo` at the consumer, so these stay plain functions. Behavior is
// identical.
import { RechartsRootState } from "../store";
import { ChartData, ChartDataState } from "../chartDataSlice";

/**
 * Always returns the data with the indexes set by a Brush. That might or might
 * not be what you want — in charts with Brush you sometimes want the full range
 * (e.g. the panorama inside the Brush). Prefer
 * {@link selectChartDataAndAlwaysIgnoreIndexes} or
 * {@link selectChartDataWithIndexesIfNotInPanoramaPosition4} when that matters.
 */
export const selectChartDataWithIndexes = (state: RechartsRootState): ChartDataState =>
  state.chartData;

/**
 * Always returns the full range of data, ignoring Brush indexes. Useful for the
 * Brush panorama, Legend, and Tooltip.
 */
export const selectChartDataAndAlwaysIgnoreIndexes = (state: RechartsRootState): ChartDataState => {
  const dataState = selectChartDataWithIndexes(state);
  const dataEndIndex = dataState.chartData != null ? dataState.chartData.length - 1 : 0;
  return {
    chartData: dataState.chartData,
    computedData: dataState.computedData,
    dataEndIndex,
    dataStartIndex: 0,
  };
};

export const selectChartDataWithIndexesIfNotInPanoramaPosition4 = (
  state: RechartsRootState,
  _unused1: unknown,
  _unused2: unknown,
  isPanorama: boolean,
): ChartDataState => {
  if (isPanorama) {
    return selectChartDataAndAlwaysIgnoreIndexes(state);
  }
  return selectChartDataWithIndexes(state);
};

export const selectChartDataWithIndexesIfNotInPanoramaPosition3 = (
  state: RechartsRootState,
  _unused1: unknown,
  isPanorama: boolean,
): ChartDataState => {
  if (isPanorama) {
    return selectChartDataAndAlwaysIgnoreIndexes(state);
  }
  return selectChartDataWithIndexes(state);
};

/**
 * Returns the chart-level data slice (respecting Brush indexes). Used when a
 * selector needs chart-level data.
 */
export const selectChartDataSliceIfNotInPanorama = (
  state: RechartsRootState,
  _unused1: unknown,
  _unused2: unknown,
  isPanorama: boolean,
): ChartData => {
  const { chartData, dataStartIndex, dataEndIndex } =
    selectChartDataWithIndexesIfNotInPanoramaPosition4(state, _unused1, _unused2, isPanorama);
  return chartData != null ? chartData.slice(dataStartIndex, dataEndIndex + 1) : [];
};

/**
 * Returns the chart-level data slice (ignoring Brush indexes). Used in tooltip
 * and polar selectors that always need the full data range.
 */
export const selectChartDataSliceIgnoringIndexes = (state: RechartsRootState): ChartData => {
  const { chartData, dataStartIndex, dataEndIndex } = selectChartDataAndAlwaysIgnoreIndexes(state);
  return chartData != null ? chartData.slice(dataStartIndex, dataEndIndex + 1) : [];
};

/**
 * Returns the chart-level data slice (with Brush indexes applied). Used in
 * tooltip selectors.
 */
export const selectChartDataSliceWithIndexes = (state: RechartsRootState): ChartData => {
  const { chartData, dataStartIndex, dataEndIndex } = selectChartDataWithIndexes(state);
  return chartData != null ? chartData.slice(dataStartIndex, dataEndIndex + 1) : [];
};
