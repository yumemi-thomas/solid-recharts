// Ported from recharts 3.8.1 src/state/selectors/areaSelectors.ts (commit 7a23854).
// Solid-native plain selectors (no reselect). Stacked areas are wired:
// `selectGraphicalItemStackedData` reads this area's stack series off the numeric
// axis' stack groups, and computeArea turns it into a per-point baseLine.
import { RechartsRootState } from "../store";
import {
  selectAxisWithScale,
  selectStackGroups,
  selectTicksOfGraphicalItem,
  selectUnfilteredCartesianItems,
} from "./axisSelectors";
import { getBandSizeOfAxis, isCategoricalAxis } from "../../util/ChartUtils";
import { ChartData } from "../chartDataSlice";
import { selectChartLayout } from "../../context/chartLayoutContext";
import { selectChartDataWithIndexesIfNotInPanoramaPosition3 } from "./dataSelectors";
import { selectChartBaseValue } from "./rootPropsSelectors";
import { GraphicalItemId } from "../graphicalItemsSlice";
import {
  selectXAxisIdFromGraphicalItemId,
  selectYAxisIdFromGraphicalItemId,
} from "./graphicalItemSelectors";
import { AreaSettings } from "../types/AreaSettings";
import { computeArea, ComputedArea } from "../../cartesian/Area";
import { combineStackedData } from "./combiners/combineStackedData";
import { AllStackGroups, StackDataPoint } from "../../util/stacks/stackTypes";

const selectXAxisWithScale = (state: RechartsRootState, id: GraphicalItemId, isPanorama: boolean) =>
  selectAxisWithScale(state, "xAxis", selectXAxisIdFromGraphicalItemId(state, id), isPanorama);

const selectXAxisTicks = (state: RechartsRootState, id: GraphicalItemId, isPanorama: boolean) =>
  selectTicksOfGraphicalItem(
    state,
    "xAxis",
    selectXAxisIdFromGraphicalItemId(state, id),
    isPanorama,
  );

const selectYAxisWithScale = (state: RechartsRootState, id: GraphicalItemId, isPanorama: boolean) =>
  selectAxisWithScale(state, "yAxis", selectYAxisIdFromGraphicalItemId(state, id), isPanorama);

const selectYAxisTicks = (state: RechartsRootState, id: GraphicalItemId, isPanorama: boolean) =>
  selectTicksOfGraphicalItem(
    state,
    "yAxis",
    selectYAxisIdFromGraphicalItemId(state, id),
    isPanorama,
  );

const selectBandSize = (
  state: RechartsRootState,
  id: GraphicalItemId,
  isPanorama: boolean,
): number | undefined => {
  const layout = selectChartLayout(state);
  if (isCategoricalAxis(layout, "xAxis")) {
    return getBandSizeOfAxis(
      selectXAxisWithScale(state, id, isPanorama),
      selectXAxisTicks(state, id, isPanorama),
      false,
    );
  }
  return getBandSizeOfAxis(
    selectYAxisWithScale(state, id, isPanorama),
    selectYAxisTicks(state, id, isPanorama),
    false,
  );
};

const selectSynchronisedAreaSettings = (
  state: RechartsRootState,
  id: GraphicalItemId,
): AreaSettings | undefined => {
  const item = selectUnfilteredCartesianItems(state).find((it) => it.id === id);
  return item != null && item.type === "area" ? item : undefined;
};

// The numeric axis stacks against (the non-categorical axis): yAxis for a
// horizontal layout, xAxis for a vertical one.
const selectAreaStackGroups = (
  state: RechartsRootState,
  id: GraphicalItemId,
  isPanorama: boolean,
): AllStackGroups | undefined => {
  const layout = selectChartLayout(state);
  if (isCategoricalAxis(layout, "xAxis")) {
    return selectStackGroups(
      state,
      "yAxis",
      selectYAxisIdFromGraphicalItemId(state, id),
      isPanorama,
    );
  }
  return selectStackGroups(state, "xAxis", selectXAxisIdFromGraphicalItemId(state, id), isPanorama);
};

// This area's stack series as plain [start, end] tuples (or undefined when the
// area isn't stacked), matching recharts' selectGraphicalItemStackedData.
export const selectGraphicalItemStackedData = (
  state: RechartsRootState,
  id: GraphicalItemId,
  isPanorama: boolean,
): ReadonlyArray<StackDataPoint> | undefined => {
  const found = combineStackedData(
    selectAreaStackGroups(state, id, isPanorama),
    selectSynchronisedAreaSettings(state, id),
  );
  if (found == null) {
    return undefined;
  }
  return found.map((item): StackDataPoint => [item[0], item[1]]);
};

export const selectArea = (
  state: RechartsRootState,
  id: GraphicalItemId,
  isPanorama: boolean,
): ComputedArea | undefined => {
  const layout = selectChartLayout(state);
  const xAxis = selectXAxisWithScale(state, id, isPanorama);
  const yAxis = selectYAxisWithScale(state, id, isPanorama);
  const xAxisTicks = selectXAxisTicks(state, id, isPanorama);
  const yAxisTicks = selectYAxisTicks(state, id, isPanorama);
  const { chartData, dataStartIndex, dataEndIndex } =
    selectChartDataWithIndexesIfNotInPanoramaPosition3(state, id, isPanorama);
  const bandSize = selectBandSize(state, id, isPanorama);
  const areaSettings = selectSynchronisedAreaSettings(state, id);
  const chartBaseValue = selectChartBaseValue(state);
  const stackedData = selectGraphicalItemStackedData(state, id, isPanorama);

  if (
    areaSettings == null ||
    (layout !== "horizontal" && layout !== "vertical") ||
    xAxis == null ||
    yAxis == null ||
    xAxisTicks == null ||
    yAxisTicks == null ||
    xAxisTicks.length === 0 ||
    yAxisTicks.length === 0 ||
    bandSize == null
  ) {
    return undefined;
  }

  const { data } = areaSettings;
  let displayedData: ChartData | undefined;
  if (data && data.length > 0) {
    displayedData = data;
  } else {
    displayedData = chartData?.slice(dataStartIndex, dataEndIndex + 1);
  }

  if (displayedData == null) {
    return undefined;
  }

  return computeArea({
    layout,
    xAxis,
    yAxis,
    xAxisTicks,
    yAxisTicks,
    areaSettings,
    displayedData,
    stackedData,
    dataStartIndex,
    chartBaseValue,
    bandSize,
  });
};
