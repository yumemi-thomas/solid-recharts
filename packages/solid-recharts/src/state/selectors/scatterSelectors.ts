// Ported from recharts 3.8.1 src/state/selectors/scatterSelectors.ts (commit 7a23854).
// Solid-native plain functions. The `cells` parameter (per-point <Cell> overrides)
// is wired — see [[cells-cellreader-port]].
import { computeScatterPoints, ScatterPointItem } from "../../cartesian/Scatter";
import type { CellProps } from "../../component/Cell";
import { RechartsRootState } from "../store";
import { AxisId } from "../cartesianAxisSlice";
import { selectChartDataWithIndexesIfNotInPanoramaPosition4 } from "./dataSelectors";
import { ChartData } from "../chartDataSlice";
import {
  selectAxisWithScale,
  selectTicksOfGraphicalItem,
  selectUnfilteredCartesianItems,
  selectZAxisWithScale,
} from "./axisSelectors";
import { ScatterSettings } from "../types/ScatterSettings";
import { GraphicalItemId } from "../graphicalItemsSlice";

const selectSynchronisedScatterSettings = (
  state: RechartsRootState,
  id: GraphicalItemId,
): ScatterSettings | undefined => {
  const item = selectUnfilteredCartesianItems(state).find((it) => it.id === id);
  return item != null && item.type === "scatter" ? item : undefined;
};

export const selectScatterPoints = (
  state: RechartsRootState,
  xAxisId: AxisId,
  yAxisId: AxisId,
  zAxisId: AxisId,
  id: GraphicalItemId,
  isPanorama: boolean,
  cells?: ReadonlyArray<CellProps>,
): ReadonlyArray<ScatterPointItem> | undefined => {
  const scatterSettings = selectSynchronisedScatterSettings(state, id);
  if (scatterSettings == null) {
    return undefined;
  }
  const xAxis = selectAxisWithScale(state, "xAxis", xAxisId, isPanorama);
  const yAxis = selectAxisWithScale(state, "yAxis", yAxisId, isPanorama);
  const xAxisTicks = selectTicksOfGraphicalItem(state, "xAxis", xAxisId, isPanorama);
  const yAxisTicks = selectTicksOfGraphicalItem(state, "yAxis", yAxisId, isPanorama);
  const zAxis = selectZAxisWithScale(state, "zAxis", zAxisId, false);
  const { chartData, dataStartIndex, dataEndIndex } =
    selectChartDataWithIndexesIfNotInPanoramaPosition4(state, undefined, undefined, isPanorama);

  let displayedData: ChartData | undefined;
  if (scatterSettings.data != null && scatterSettings.data.length > 0) {
    displayedData = scatterSettings.data;
  } else {
    displayedData = chartData?.slice(dataStartIndex, dataEndIndex + 1);
  }

  if (
    displayedData == null ||
    xAxis == null ||
    yAxis == null ||
    xAxisTicks == null ||
    yAxisTicks == null ||
    xAxisTicks.length === 0 ||
    yAxisTicks.length === 0
  ) {
    return undefined;
  }

  return computeScatterPoints({
    displayedData,
    xAxis,
    yAxis,
    zAxis,
    scatterSettings,
    xAxisTicks,
    yAxisTicks,
    cells,
  });
};
