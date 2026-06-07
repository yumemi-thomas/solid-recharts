// Ported from recharts 3.8.1 src/state/selectors/polarScaleSelectors.ts (commit 7a23854).
//
// FULL SOLID-NATIVE REWRITE: reselect `createSelector` → plain functions. Reuses
// the cartesian scale/tick combiners keyed by the polar axis type+id.
import { RechartsRootState } from "../store";
import { AxisId } from "../cartesianAxisSlice";
import { CartesianTickItem, TickItem } from "../../util/types";
import { selectChartLayout } from "../../context/chartLayoutContext";
import { RechartsScale, rechartsScaleFactory } from "../../util/scale/RechartsScale";
import { CustomScaleDefinition } from "../../util/scale/CustomScaleDefinition";
import { pickAxisType } from "./pickAxisType";
import { combineConfiguredScale } from "./combiners/combineConfiguredScale";
import {
  combineAxisTicks,
  combineCategoricalDomain,
  combineGraphicalItemTicks,
  selectDuplicateDomain,
  selectRealScaleType,
  selectRenderableAxisSettings,
} from "./axisSelectors";
import {
  selectAngleAxis,
  selectAngleAxisRangeWithReversed,
  selectRadiusAxis,
  selectRadiusAxisRangeWithReversed,
} from "./polarAxisSelectors";
import {
  selectPolarAppliedValues,
  selectPolarAxisCheckedDomain,
  selectPolarNiceTicks,
  type PolarAxisType,
} from "./polarSelectors";

export const selectPolarAxis = (
  state: RechartsRootState,
  axisType: PolarAxisType,
  axisId: AxisId,
) => {
  switch (axisType) {
    case "angleAxis":
      return selectAngleAxis(state, axisId);
    case "radiusAxis":
      return selectRadiusAxis(state, axisId);
    default:
      throw new Error(`Unexpected axis type: ${String(axisType)}`);
  }
};

const selectPolarAxisRangeWithReversed = (
  state: RechartsRootState,
  axisType: PolarAxisType,
  axisId: AxisId,
) => {
  switch (axisType) {
    case "angleAxis":
      return selectAngleAxisRangeWithReversed(state, axisId);
    case "radiusAxis":
      return selectRadiusAxisRangeWithReversed(state, axisId);
    default:
      throw new Error(`Unexpected axis type: ${String(axisType)}`);
  }
};

const selectPolarConfiguredScale = (
  state: RechartsRootState,
  axisType: PolarAxisType,
  polarAxisId: AxisId,
): CustomScaleDefinition | undefined =>
  combineConfiguredScale(
    selectPolarAxis(state, axisType, polarAxisId),
    selectRealScaleType(state, axisType, polarAxisId),
    selectPolarAxisCheckedDomain(state, axisType, polarAxisId),
    selectPolarAxisRangeWithReversed(state, axisType, polarAxisId),
  );

export const selectPolarAxisScale = (
  state: RechartsRootState,
  axisType: PolarAxisType,
  polarAxisId: AxisId,
): RechartsScale | undefined =>
  rechartsScaleFactory(selectPolarConfiguredScale(state, axisType, polarAxisId));

export const selectPolarCategoricalDomain = (
  state: RechartsRootState,
  axisType: PolarAxisType,
  polarAxisId: AxisId,
): ReadonlyArray<unknown> | undefined =>
  combineCategoricalDomain(
    selectChartLayout(state),
    selectPolarAppliedValues(state, axisType, polarAxisId),
    selectRenderableAxisSettings(state, axisType, polarAxisId),
    pickAxisType(state, axisType),
  );

export const selectPolarAxisTicks = (
  state: RechartsRootState,
  axisType: PolarAxisType,
  polarAxisId: AxisId,
  isPanorama: boolean,
): ReadonlyArray<TickItem> | undefined =>
  combineAxisTicks(
    selectChartLayout(state),
    selectPolarAxis(state, axisType, polarAxisId),
    selectRealScaleType(state, axisType, polarAxisId),
    selectPolarAxisScale(state, axisType, polarAxisId),
    selectPolarNiceTicks(state, axisType, polarAxisId),
    selectPolarAxisRangeWithReversed(state, axisType, polarAxisId),
    selectDuplicateDomain(state, axisType, polarAxisId, isPanorama),
    selectPolarCategoricalDomain(state, axisType, polarAxisId),
    pickAxisType(state, axisType),
  );

export const selectPolarAngleAxisTicks = (
  state: RechartsRootState,
  axisType: "angleAxis",
  polarAxisId: AxisId,
  isPanorama: boolean,
): ReadonlyArray<TickItem> | undefined => {
  const ticks = selectPolarAxisTicks(state, axisType, polarAxisId, isPanorama);
  // The angle axis is circular; ticks that overlap (e.g. 0° and 360°) must be
  // de-duplicated to avoid rendering the same tick twice.
  if (!ticks) {
    return undefined;
  }
  const uniqueTicksMap = new Map<number, TickItem>();
  ticks.forEach((tick) => {
    const normalizedCoordinate = (tick.coordinate + 360) % 360;
    if (!uniqueTicksMap.has(normalizedCoordinate)) {
      uniqueTicksMap.set(normalizedCoordinate, tick);
    }
  });
  return Array.from(uniqueTicksMap.values());
};

export const selectPolarGraphicalItemAxisTicks = (
  state: RechartsRootState,
  axisType: PolarAxisType,
  polarAxisId: AxisId,
  _isPanorama: boolean,
): ReadonlyArray<CartesianTickItem> | undefined =>
  combineGraphicalItemTicks(
    selectChartLayout(state),
    selectPolarAxis(state, axisType, polarAxisId),
    selectPolarAxisScale(state, axisType, polarAxisId),
    selectPolarAxisRangeWithReversed(state, axisType, polarAxisId),
    selectDuplicateDomain(state, axisType, polarAxisId, _isPanorama),
    selectPolarCategoricalDomain(state, axisType, polarAxisId),
    pickAxisType(state, axisType),
  );
