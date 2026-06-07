// Ported from recharts 3.8.1 src/state/selectors/radarSelectors.ts (commit 7a23854).
//
// FULL SOLID-NATIVE REWRITE: reselect `createSelector` → plain functions
// (memoization via `useAppSelector`'s `createMemo`).
import { RechartsRootState } from "../store";
import { AxisId } from "../cartesianAxisSlice";
import { GraphicalItemId } from "../graphicalItemsSlice";
import {
  AngleAxisForRadar,
  computeRadarPoints,
  RadarComposedData,
  RadiusAxisForRadar,
} from "../../polar/Radar";
import { BaseAxisWithScale } from "./axisSelectors";
import { selectPolarAxisScale, selectPolarAxisTicks } from "./polarScaleSelectors";
import { selectAngleAxis, selectPolarViewBox, selectRadiusAxis } from "./polarAxisSelectors";
import { selectChartDataAndAlwaysIgnoreIndexes } from "./dataSelectors";
import { DataKey, TickItem } from "../../util/types";
import { selectChartLayout } from "../../context/chartLayoutContext";
import { getBandSizeOfAxis, isCategoricalAxis } from "../../util/ChartUtils";
import { RechartsScale } from "../../util/scale/RechartsScale";
import { selectUnfilteredPolarItems } from "./polarSelectors";

const selectRadiusAxisScale = (
  state: RechartsRootState,
  radiusAxisId: AxisId,
): RechartsScale | undefined => selectPolarAxisScale(state, "radiusAxis", radiusAxisId);

const selectRadiusAxisForRadar = (
  state: RechartsRootState,
  radiusAxisId: AxisId,
): RadiusAxisForRadar | undefined => {
  const scale = selectRadiusAxisScale(state, radiusAxisId);
  return scale == null ? undefined : { scale };
};

export const selectRadiusAxisForBandSize = (
  state: RechartsRootState,
  radiusAxisId: AxisId,
): BaseAxisWithScale | undefined => {
  const axisSettings = selectRadiusAxis(state, radiusAxisId);
  const scale = selectRadiusAxisScale(state, radiusAxisId);
  if (axisSettings == null || scale == null) {
    return undefined;
  }
  return { ...axisSettings, scale };
};

const selectRadiusAxisTicks = (
  state: RechartsRootState,
  radiusAxisId: AxisId,
  isPanorama: boolean,
): ReadonlyArray<TickItem> | undefined =>
  selectPolarAxisTicks(state, "radiusAxis", radiusAxisId, isPanorama);

const selectPolarAxisScaleForAngle = (
  state: RechartsRootState,
  angleAxisId: AxisId,
): RechartsScale | undefined => selectPolarAxisScale(state, "angleAxis", angleAxisId);

export const selectAngleAxisForBandSize = (
  state: RechartsRootState,
  angleAxisId: AxisId,
): BaseAxisWithScale | undefined => {
  const axisSettings = selectAngleAxis(state, angleAxisId);
  const scale = selectPolarAxisScaleForAngle(state, angleAxisId);
  if (axisSettings == null || scale == null) {
    return undefined;
  }
  return { ...axisSettings, scale };
};

const selectAngleAxisTicks = (
  state: RechartsRootState,
  angleAxisId: AxisId,
  isPanorama: boolean,
): ReadonlyArray<TickItem> | undefined =>
  selectPolarAxisTicks(state, "angleAxis", angleAxisId, isPanorama);

export const selectAngleAxisWithScaleAndViewport = (
  state: RechartsRootState,
  angleAxisId: AxisId,
): AngleAxisForRadar | undefined => {
  const axisOptions = selectAngleAxis(state, angleAxisId);
  const scale = selectPolarAxisScaleForAngle(state, angleAxisId);
  const polarViewBox = selectPolarViewBox(state);
  if (polarViewBox == null || scale == null) {
    return undefined;
  }
  return {
    scale,
    type: axisOptions.type,
    dataKey: axisOptions.dataKey,
    cx: polarViewBox.cx,
    cy: polarViewBox.cy,
  };
};

const selectBandSizeOfAxis = (
  state: RechartsRootState,
  radiusAxisId: AxisId,
  angleAxisId: AxisId,
  isPanorama: boolean,
): number | undefined => {
  const layout = selectChartLayout(state);
  if (isCategoricalAxis(layout, "radiusAxis")) {
    return getBandSizeOfAxis(
      selectRadiusAxisForBandSize(state, radiusAxisId),
      selectRadiusAxisTicks(state, radiusAxisId, isPanorama),
      false,
    );
  }
  return getBandSizeOfAxis(
    selectAngleAxisForBandSize(state, angleAxisId),
    selectAngleAxisTicks(state, angleAxisId, isPanorama),
    false,
  );
};

const selectSynchronisedRadarDataKey = (
  state: RechartsRootState,
  radarId: GraphicalItemId,
): DataKey<unknown> | undefined => {
  const items = selectUnfilteredPolarItems(state);
  const pgis = items.find((item) => item.type === "radar" && radarId === item.id);
  return pgis?.dataKey;
};

export const selectRadarPoints = (
  state: RechartsRootState,
  radiusAxisId: AxisId,
  angleAxisId: AxisId,
  isPanorama: boolean,
  radarId: GraphicalItemId,
): RadarComposedData | undefined => {
  const radiusAxis = selectRadiusAxisForRadar(state, radiusAxisId);
  const angleAxis = selectAngleAxisWithScaleAndViewport(state, angleAxisId);
  const { chartData, dataStartIndex, dataEndIndex } = selectChartDataAndAlwaysIgnoreIndexes(state);
  const dataKey = selectSynchronisedRadarDataKey(state, radarId);
  const bandSize = selectBandSizeOfAxis(state, radiusAxisId, angleAxisId, isPanorama);
  if (
    radiusAxis == null ||
    angleAxis == null ||
    chartData == null ||
    bandSize == null ||
    dataKey == null
  ) {
    return undefined;
  }
  const displayedData = chartData.slice(dataStartIndex, dataEndIndex + 1);
  return computeRadarPoints({ radiusAxis, angleAxis, displayedData, dataKey, bandSize });
};
