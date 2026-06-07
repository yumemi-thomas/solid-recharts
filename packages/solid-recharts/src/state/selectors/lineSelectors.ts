// Ported from recharts 3.8.1 src/state/selectors/lineSelectors.ts (commit 7a23854).
// Solid-native: plain selector functions (memoization comes from useAppSelector's
// createMemo at the consumer).
import { computeLinePoints, LinePointItem } from "../../cartesian/Line";
import { RechartsRootState } from "../store";
import { AxisId } from "../cartesianAxisSlice";
import { selectChartDataWithIndexesIfNotInPanoramaPosition4 } from "./dataSelectors";
import { selectChartLayout } from "../../context/chartLayoutContext";
import {
  selectAxisWithScale,
  selectTicksOfGraphicalItem,
  selectUnfilteredCartesianItems,
} from "./axisSelectors";
import { getBandSizeOfAxis, isCategoricalAxis } from "../../util/ChartUtils";
import { ChartData } from "../chartDataSlice";
import { CartesianGraphicalItemSettings, GraphicalItemId } from "../graphicalItemsSlice";
import { LineSettings } from "../types/LineSettings";

const selectBandSize = (
  state: RechartsRootState,
  xAxisId: AxisId,
  yAxisId: AxisId,
  isPanorama: boolean,
): number | undefined => {
  const layout = selectChartLayout(state);
  if (isCategoricalAxis(layout, "xAxis")) {
    return getBandSizeOfAxis(
      selectAxisWithScale(state, "xAxis", xAxisId, isPanorama),
      selectTicksOfGraphicalItem(state, "xAxis", xAxisId, isPanorama),
      false,
    );
  }
  return getBandSizeOfAxis(
    selectAxisWithScale(state, "yAxis", yAxisId, isPanorama),
    selectTicksOfGraphicalItem(state, "yAxis", yAxisId, isPanorama),
    false,
  );
};

function isLineSettings(item: CartesianGraphicalItemSettings): item is LineSettings {
  return item.type === "line";
}

/*
 * There is a race condition where we read some data from props and some from the
 * state. The state is updated through a dispatch and is one render behind, so we
 * always read the dataKey from the state here.
 */
const selectSynchronisedLineSettings = (
  state: RechartsRootState,
  id: GraphicalItemId,
): LineSettings | undefined =>
  selectUnfilteredCartesianItems(state)
    .filter(isLineSettings)
    .find((x) => x.id === id);

export const selectLinePoints = (
  state: RechartsRootState,
  xAxisId: AxisId,
  yAxisId: AxisId,
  isPanorama: boolean,
  id: GraphicalItemId,
): ReadonlyArray<LinePointItem> | undefined => {
  const layout = selectChartLayout(state);
  const xAxis = selectAxisWithScale(state, "xAxis", xAxisId, isPanorama);
  const yAxis = selectAxisWithScale(state, "yAxis", yAxisId, isPanorama);
  const xAxisTicks = selectTicksOfGraphicalItem(state, "xAxis", xAxisId, isPanorama);
  const yAxisTicks = selectTicksOfGraphicalItem(state, "yAxis", yAxisId, isPanorama);
  const lineSettings = selectSynchronisedLineSettings(state, id);
  const bandSize = selectBandSize(state, xAxisId, yAxisId, isPanorama);
  const { chartData, dataStartIndex, dataEndIndex } =
    selectChartDataWithIndexesIfNotInPanoramaPosition4(state, xAxisId, yAxisId, isPanorama);

  if (
    lineSettings == null ||
    xAxis == null ||
    yAxis == null ||
    xAxisTicks == null ||
    yAxisTicks == null ||
    xAxisTicks.length === 0 ||
    yAxisTicks.length === 0 ||
    bandSize == null ||
    (layout !== "horizontal" && layout !== "vertical")
  ) {
    return undefined;
  }

  const { dataKey, data } = lineSettings;
  let displayedData: ChartData | undefined;

  if (data != null && data.length > 0) {
    displayedData = data;
  } else {
    displayedData = chartData?.slice(dataStartIndex, dataEndIndex + 1);
  }

  if (displayedData == null) {
    return undefined;
  }

  return computeLinePoints({
    layout,
    xAxis,
    yAxis,
    xAxisTicks,
    yAxisTicks,
    dataKey,
    bandSize,
    displayedData,
  });
};
