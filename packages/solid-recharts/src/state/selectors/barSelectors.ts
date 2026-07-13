// Ported from recharts 3.8.1 src/state/selectors/barSelectors.ts (commit 7a23854).
// Solid-native plain selectors (no reselect). Stacks are deferred:
// `selectBarStackGroups`/`selectStackedDataOfItem` return undefined, so
// computeBarRectangles runs the unstacked path. Cells deferred (passed undefined).
import { RechartsRootState } from "../store";
import {
  BaseAxisWithScale,
  selectAxisWithScale,
  selectCartesianAxisSize,
  selectStackGroups,
  selectTicksOfGraphicalItem,
  selectUnfilteredCartesianItems,
} from "./axisSelectors";
import { combineStackedData } from "./combiners/combineStackedData";
import type { StackSeries } from "../../util/stacks/stackTypes";
import { isNullish } from "../../util/DataUtils";
import { BarPositionPosition, getBandSizeOfAxis, StackId } from "../../util/ChartUtils";
import { DataKey, LayoutType, TickItem } from "../../util/types";
import { BarRectangleItem, computeBarRectangles } from "../../cartesian/Bar";
import type { CellProps } from "../../component/Cell";
import { selectChartLayout } from "../../context/chartLayoutContext";
import { ChartData } from "../chartDataSlice";
import { selectChartDataWithIndexesIfNotInPanoramaPosition3 } from "./dataSelectors";
import { selectAxisViewBox, selectChartOffsetInternal } from "./selectChartOffsetInternal";
import {
  selectBarCategoryGap,
  selectBarGap,
  selectRootBarSize,
  selectRootMaxBarSize,
} from "./rootPropsSelectors";
import { BarSettings } from "../types/BarSettings";
import { GraphicalItemId } from "../graphicalItemsSlice";
import { BarCategory, combineBarSizeList } from "./combiners/combineBarSizeList";
import { combineAllBarPositions } from "./combiners/combineAllBarPositions";
import {
  selectXAxisIdFromGraphicalItemId,
  selectYAxisIdFromGraphicalItemId,
} from "./graphicalItemSelectors";
import { combineBarPosition } from "./combiners/combineBarPosition";
import {
  selectAxisWithScaleForGraphicalItem,
  selectTicksForGraphicalItem,
} from "./selectAxisForGraphicalItem";

const selectSynchronisedBarSettings = (
  state: RechartsRootState,
  id: GraphicalItemId,
): BarSettings | undefined => {
  const item = selectUnfilteredCartesianItems(state).find((it) => it.id === id);
  return item != null && item.type === "bar" ? item : undefined;
};

export const selectMaxBarSize = (
  state: RechartsRootState,
  id: GraphicalItemId,
): number | undefined => selectSynchronisedBarSettings(state, id)?.maxBarSize;

export const selectAllVisibleBars = (
  state: RechartsRootState,
  id: GraphicalItemId,
  isPanorama: boolean,
): ReadonlyArray<BarSettings> => {
  const layout = selectChartLayout(state);
  const xAxisId = selectXAxisIdFromGraphicalItemId(state, id);
  const yAxisId = selectYAxisIdFromGraphicalItemId(state, id);
  const bars: BarSettings[] = [];
  for (const item of selectUnfilteredCartesianItems(state)) {
    if (item.type !== "bar") {
      continue;
    }
    const matchesAxis =
      layout === "horizontal" ? item.xAxisId === xAxisId : item.yAxisId === yAxisId;
    if (matchesAxis && item.isPanorama === isPanorama && item.hide === false) {
      bars.push(item);
    }
  }
  return bars;
};

export type SizeList = ReadonlyArray<BarCategory>;

export type BarWithPosition = {
  stackId: StackId | undefined;
  dataKeys: ReadonlyArray<DataKey<unknown>>;
  /** Position of this stack in absolute pixels from the start of the chart. */
  position: BarPositionPosition;
};

export const selectBarCartesianAxisSize = (
  state: RechartsRootState,
  id: GraphicalItemId,
): number | undefined => {
  const layout = selectChartLayout(state);
  const xAxisId = selectXAxisIdFromGraphicalItemId(state, id);
  const yAxisId = selectYAxisIdFromGraphicalItemId(state, id);
  if (xAxisId == null || yAxisId == null) {
    return undefined;
  }
  if (layout === "horizontal") {
    return selectCartesianAxisSize(state, "xAxis", xAxisId);
  }
  return selectCartesianAxisSize(state, "yAxis", yAxisId);
};

export const selectBarSizeList = (
  state: RechartsRootState,
  id: GraphicalItemId,
  isPanorama: boolean,
): SizeList =>
  combineBarSizeList(
    selectAllVisibleBars(state, id, isPanorama),
    selectRootBarSize(state),
    selectBarCartesianAxisSize(state, id),
  );

export const selectBarBandSize = (
  state: RechartsRootState,
  id: GraphicalItemId,
  isPanorama: boolean,
): number => {
  const barSettings = selectSynchronisedBarSettings(state, id);
  if (barSettings == null) {
    return 0;
  }
  const xAxisId = selectXAxisIdFromGraphicalItemId(state, id);
  const yAxisId = selectYAxisIdFromGraphicalItemId(state, id);
  if (xAxisId == null || yAxisId == null) {
    return 0;
  }
  const layout = selectChartLayout(state);
  const globalMaxBarSize = selectRootMaxBarSize(state);
  const { maxBarSize: childMaxBarSize } = barSettings;
  const maxBarSize = isNullish(childMaxBarSize) ? globalMaxBarSize : childMaxBarSize;
  let axis: BaseAxisWithScale | undefined;
  let ticks: ReadonlyArray<TickItem> | undefined;
  if (layout === "horizontal") {
    axis = selectAxisWithScale(state, "xAxis", xAxisId, isPanorama);
    ticks = selectTicksOfGraphicalItem(state, "xAxis", xAxisId, isPanorama);
  } else {
    axis = selectAxisWithScale(state, "yAxis", yAxisId, isPanorama);
    ticks = selectTicksOfGraphicalItem(state, "yAxis", yAxisId, isPanorama);
  }
  return getBandSizeOfAxis(axis, ticks, true) ?? maxBarSize ?? 0;
};

export const selectAxisBandSize = (
  state: RechartsRootState,
  id: GraphicalItemId,
  isPanorama: boolean,
): number | undefined => {
  const layout = selectChartLayout(state);
  const xAxisId = selectXAxisIdFromGraphicalItemId(state, id);
  const yAxisId = selectYAxisIdFromGraphicalItemId(state, id);
  if (xAxisId == null || yAxisId == null) {
    return undefined;
  }
  let axis: BaseAxisWithScale | undefined;
  let ticks: ReadonlyArray<TickItem> | undefined;
  if (layout === "horizontal") {
    axis = selectAxisWithScale(state, "xAxis", xAxisId, isPanorama);
    ticks = selectTicksOfGraphicalItem(state, "xAxis", xAxisId, isPanorama);
  } else {
    axis = selectAxisWithScale(state, "yAxis", yAxisId, isPanorama);
    ticks = selectTicksOfGraphicalItem(state, "yAxis", yAxisId, isPanorama);
  }
  return getBandSizeOfAxis(axis, ticks);
};

export const selectAllBarPositions = (
  state: RechartsRootState,
  id: GraphicalItemId,
  isPanorama: boolean,
): ReadonlyArray<BarWithPosition> | undefined =>
  combineAllBarPositions(
    selectBarSizeList(state, id, isPanorama),
    selectRootMaxBarSize(state),
    selectBarGap(state),
    selectBarCategoryGap(state),
    selectBarBandSize(state, id, isPanorama),
    selectAxisBandSize(state, id, isPanorama),
    selectMaxBarSize(state, id),
  );

export const selectBarPosition = (
  state: RechartsRootState,
  id: GraphicalItemId,
  isPanorama: boolean,
): BarPositionPosition | undefined =>
  combineBarPosition(
    selectAllBarPositions(state, id, isPanorama),
    selectSynchronisedBarSettings(state, id),
  );

const selectBarStackGroups = (
  state: RechartsRootState,
  id: GraphicalItemId,
  isPanorama: boolean,
) => {
  const layout = selectChartLayout(state);
  const xAxisId = selectXAxisIdFromGraphicalItemId(state, id);
  const yAxisId = selectYAxisIdFromGraphicalItemId(state, id);
  if (xAxisId == null || yAxisId == null) {
    return undefined;
  }
  return layout === "horizontal"
    ? selectStackGroups(state, "yAxis", yAxisId, isPanorama)
    : selectStackGroups(state, "xAxis", xAxisId, isPanorama);
};

export const selectStackedDataOfItem = (
  state: RechartsRootState,
  id: GraphicalItemId,
  isPanorama: boolean,
): StackSeries | undefined =>
  combineStackedData(
    selectBarStackGroups(state, id, isPanorama),
    selectSynchronisedBarSettings(state, id),
  );

export const selectBarRectangles = (
  state: RechartsRootState,
  id: GraphicalItemId,
  isPanorama: boolean,
  cells: ReadonlyArray<CellProps> | undefined,
): ReadonlyArray<BarRectangleItem> | undefined => {
  const axisViewBox = selectAxisViewBox(state);
  const offset = selectChartOffsetInternal(state);
  const xAxis = selectAxisWithScaleForGraphicalItem(state, "xAxis", id, isPanorama);
  const yAxis = selectAxisWithScaleForGraphicalItem(state, "yAxis", id, isPanorama);
  const xAxisTicks = selectTicksForGraphicalItem(state, "xAxis", id, isPanorama);
  const yAxisTicks = selectTicksForGraphicalItem(state, "yAxis", id, isPanorama);
  const pos = selectBarPosition(state, id, isPanorama);
  const layout: LayoutType = selectChartLayout(state);
  const { chartData, dataStartIndex, dataEndIndex } =
    selectChartDataWithIndexesIfNotInPanoramaPosition3(state, id, isPanorama);
  const bandSize = selectAxisBandSize(state, id, isPanorama);
  const barSettings = selectSynchronisedBarSettings(state, id);
  const stackedData = selectStackedDataOfItem(state, id, isPanorama);

  if (
    barSettings == null ||
    pos == null ||
    axisViewBox == null ||
    offset == null ||
    (layout !== "horizontal" && layout !== "vertical") ||
    xAxis == null ||
    yAxis == null ||
    xAxisTicks == null ||
    yAxisTicks == null ||
    bandSize == null
  ) {
    return undefined;
  }

  const { data } = barSettings;
  let displayedData: ChartData | undefined;
  if (data != null && data.length > 0) {
    displayedData = data;
  } else {
    displayedData = chartData?.slice(dataStartIndex, dataEndIndex + 1);
  }

  if (displayedData == null) {
    return undefined;
  }

  // Stacked bars: each bar spans the [start, end] range from the stacked data
  // (truncated to the numeric axis domain). The numeric axis is Y (horizontal) / X.
  const numericAxis = layout === "horizontal" ? yAxis : xAxis;
  const stackedDomain: ReadonlyArray<number> | null = stackedData
    ? numericAxis.scale.domain().filter((d): d is number => typeof d === "number")
    : null;

  return computeBarRectangles({
    layout,
    barSettings,
    pos,
    offset,
    parentViewBox: axisViewBox,
    bandSize,
    xAxis,
    yAxis,
    xAxisTicks,
    yAxisTicks,
    displayedData,
    stackedData,
    stackedDomain,
    cells,
    dataStartIndex,
  });
};
