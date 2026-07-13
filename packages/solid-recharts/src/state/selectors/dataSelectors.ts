// Ported from recharts 3.8.1 src/state/selectors/dataSelectors.ts (commit 7a23854).
//
// The chartData-projecting selectors below are wrapped in the Solid-native
// `createSelector` (ADR-0002) so they present a stable reference when the data
// is unchanged — the leaf-input fix the memoized selector graph depends on. The
// remaining `slice`-returning helpers stay plain (they intentionally produce a
// fresh window each call and their wrapped consumers absorb the churn).
import { RechartsRootState } from "../store";
import { ChartData, ChartDataState } from "../chartDataSlice";
import { createSelector } from "../createSelector";

// LEAF-INPUT rule (ADR-0002 "Known constraint"): these read the individual
// leaves of the chartData slice — never the slice root `state.chartData`, whose
// proxy reference is permanently stable in Solid and so can never invalidate a
// reference-keyed cache. Reading the leaves (the `chartData` array is replaced
// wholesale by `setChartData`; the indexes are primitives) lets `createSelector`
// return a stable projected object when nothing changed and a fresh one when it
// did — the reselect semantics the downstream selector graph relies on.
const pickChartData = (state: RechartsRootState): ChartData | undefined =>
  state.chartData.chartData;
const pickComputedData = (state: RechartsRootState): unknown => state.chartData.computedData;
const pickDataStartIndex = (state: RechartsRootState): number => state.chartData.dataStartIndex;
const pickDataEndIndex = (state: RechartsRootState): number => state.chartData.dataEndIndex;

/**
 * Always returns the data with the indexes set by a Brush. That might or might
 * not be what you want — in charts with Brush you sometimes want the full range
 * (e.g. the panorama inside the Brush). Prefer
 * {@link selectChartDataAndAlwaysIgnoreIndexes} or
 * {@link selectChartDataWithIndexesIfNotInPanoramaPosition4} when that matters.
 */
export const selectChartDataWithIndexes: (state: RechartsRootState) => ChartDataState =
  createSelector(
    [pickChartData, pickComputedData, pickDataStartIndex, pickDataEndIndex],
    (chartData, computedData, dataStartIndex, dataEndIndex) => ({
      chartData,
      computedData,
      dataStartIndex,
      dataEndIndex,
    }),
  );

/**
 * Always returns the full range of data, ignoring Brush indexes. Useful for the
 * Brush panorama, Legend, and Tooltip.
 */
export const selectChartDataAndAlwaysIgnoreIndexes: (state: RechartsRootState) => ChartDataState =
  createSelector([pickChartData, pickComputedData], (chartData, computedData) => ({
    chartData,
    computedData,
    dataEndIndex: chartData != null ? chartData.length - 1 : 0,
    dataStartIndex: 0,
  }));

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
