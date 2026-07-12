// Ported from recharts 3.8.1 src/state/selectors/polarAxisSelectors.ts (commit 7a23854).
//
// FULL SOLID-NATIVE REWRITE: reselect `createSelector` → plain functions
// (memoization is provided by `useAppSelector`'s `createMemo`).
//
// SCOPE: both the polar-VIEWBOX cluster (selectPolarOptions, selectMaxRadius,
// selectInnerRadius, selectOuterRadius, selectPolarViewBox) AND the angle/radius
// AXIS selectors (selectAngleAxis/selectRadiusAxis + ranges, implicitAngle/
// RadiusAxis) are ported in this file.
import { RechartsRootState } from "../store";
import { PolarChartState } from "../polarOptionsSlice";
import { AxisId } from "../cartesianAxisSlice";
import { AngleAxisSettings, RadiusAxisSettings } from "../polarAxisSlice";
import { selectChartHeight, selectChartWidth } from "./containerSelectors";
import { selectChartOffsetInternal } from "./selectChartOffsetInternal";
import { getMaxRadius } from "../../util/PolarUtils";
import { getPercentValue } from "../../util/DataUtils";
import { AxisDomainTypeInput, PolarLayout, PolarViewBoxRequired } from "../../util/types";
import { selectChartLayout, selectPolarChartLayout } from "../../context/chartLayoutContext";
import { getAxisTypeBasedOnLayout } from "../../util/getAxisTypeBasedOnLayout";
import { defaultPolarAngleAxisProps } from "../../polar/defaultPolarAngleAxisProps";
import { defaultPolarRadiusAxisProps } from "../../polar/defaultPolarRadiusAxisProps";
// Value-import cycle with axisSelectors (it imports selectAngleAxis/… back),
// resolved lazily at call time — same shape recharts uses.
import { AxisRange } from "./axisSelectors";
import { combineAxisRangeWithReverse } from "./combiners/combineAxisRangeWithReverse";

/**
 * If an angle/radius axis is not explicitly declared we still need defaults to
 * hold the domain. Mirrors recharts' implicitAngleAxis/implicitRadiusAxis;
 * `type` is the unresolved `AxisDomainTypeInput` ("auto") — `selectAngleAxis`/
 * `selectRadiusAxis` resolve it against the layout.
 */
export const implicitAngleAxis: Omit<AngleAxisSettings, "type"> & { type: AxisDomainTypeInput } = {
  allowDataOverflow: defaultPolarAngleAxisProps.allowDataOverflow,
  allowDecimals: defaultPolarAngleAxisProps.allowDecimals,
  // recharts: false here on purpose (axis calc behaves as if false), despite the
  // PolarAngleAxis default being true (which Tooltip sync needs).
  allowDuplicatedCategory: false,
  dataKey: undefined,
  domain: undefined,
  id: defaultPolarAngleAxisProps.angleAxisId,
  includeHidden: false,
  name: undefined,
  reversed: defaultPolarAngleAxisProps.reversed,
  scale: defaultPolarAngleAxisProps.scale,
  tick: defaultPolarAngleAxisProps.tick,
  tickCount: undefined,
  ticks: undefined,
  type: defaultPolarAngleAxisProps.type,
  unit: undefined,
  niceTicks: "auto",
};

export const implicitRadiusAxis: Omit<RadiusAxisSettings, "type"> & {
  type: AxisDomainTypeInput;
} = {
  allowDataOverflow: defaultPolarRadiusAxisProps.allowDataOverflow,
  allowDecimals: defaultPolarRadiusAxisProps.allowDecimals,
  allowDuplicatedCategory: defaultPolarRadiusAxisProps.allowDuplicatedCategory,
  dataKey: undefined,
  domain: undefined,
  id: defaultPolarRadiusAxisProps.radiusAxisId,
  includeHidden: defaultPolarRadiusAxisProps.includeHidden,
  name: undefined,
  reversed: defaultPolarRadiusAxisProps.reversed,
  scale: defaultPolarRadiusAxisProps.scale,
  tick: defaultPolarRadiusAxisProps.tick,
  tickCount: defaultPolarRadiusAxisProps.tickCount,
  ticks: undefined,
  type: defaultPolarRadiusAxisProps.type,
  unit: undefined,
  niceTicks: "auto",
};

const selectAngleAxisNoDefaults = (
  state: RechartsRootState,
  angleAxisId: AxisId | undefined,
): AngleAxisSettings | undefined => {
  if (angleAxisId == null) {
    return undefined;
  }
  return state.polarAxis.angleAxis[angleAxisId];
};

export const selectAngleAxis = (
  state: RechartsRootState,
  angleAxisId: AxisId | undefined,
): AngleAxisSettings => {
  const angleAxisSettings = selectAngleAxisNoDefaults(state, angleAxisId);
  if (angleAxisSettings != null) {
    return angleAxisSettings;
  }
  const layout: PolarLayout | undefined = selectPolarChartLayout(state);
  const evaluatedType =
    getAxisTypeBasedOnLayout(layout, "angleAxis", implicitAngleAxis.type) ?? "category";
  return { ...implicitAngleAxis, type: evaluatedType };
};

const selectRadiusAxisNoDefaults = (
  state: RechartsRootState,
  radiusAxisId: AxisId,
): RadiusAxisSettings | undefined => state.polarAxis.radiusAxis[radiusAxisId];

export const selectRadiusAxis = (
  state: RechartsRootState,
  radiusAxisId: AxisId,
): RadiusAxisSettings => {
  const radiusAxisSettings = selectRadiusAxisNoDefaults(state, radiusAxisId);
  if (radiusAxisSettings != null) {
    return radiusAxisSettings;
  }
  const layout: PolarLayout | undefined = selectPolarChartLayout(state);
  const evaluatedType =
    getAxisTypeBasedOnLayout(layout, "radiusAxis", implicitRadiusAxis.type) ?? "category";
  return { ...implicitRadiusAxis, type: evaluatedType };
};

export const selectPolarOptions = (state: RechartsRootState): PolarChartState => state.polarOptions;

export const selectMaxRadius = (state: RechartsRootState): number =>
  getMaxRadius(selectChartWidth(state), selectChartHeight(state), selectChartOffsetInternal(state));

export const selectInnerRadius = (state: RechartsRootState): number | undefined => {
  const polarChartOptions = selectPolarOptions(state);
  if (polarChartOptions == null) {
    return undefined;
  }
  return getPercentValue(polarChartOptions.innerRadius, selectMaxRadius(state), 0);
};

export const selectOuterRadius = (state: RechartsRootState): number | undefined => {
  const polarChartOptions = selectPolarOptions(state);
  if (polarChartOptions == null) {
    return undefined;
  }
  const maxRadius = selectMaxRadius(state);
  return getPercentValue(polarChartOptions.outerRadius, maxRadius, maxRadius * 0.8);
};

export const selectPolarViewBox = (state: RechartsRootState): PolarViewBoxRequired | undefined => {
  const layout = selectChartLayout(state);
  const polarOptions = selectPolarOptions(state);
  const innerRadius = selectInnerRadius(state);
  const outerRadius = selectOuterRadius(state);
  if (
    (layout !== "centric" && layout !== "radial") ||
    polarOptions == null ||
    innerRadius == null ||
    outerRadius == null
  ) {
    return undefined;
  }
  const width = selectChartWidth(state);
  const height = selectChartHeight(state);
  const { cx, cy, startAngle, endAngle } = polarOptions;
  return {
    cx: getPercentValue(cx, width, width / 2),
    cy: getPercentValue(cy, height, height / 2),
    innerRadius,
    outerRadius,
    startAngle,
    endAngle,
    clockWise: false,
  };
};

export const selectAngleAxisRange = (state: RechartsRootState): AxisRange => {
  const polarOptions = selectPolarOptions(state);
  if (polarOptions == null) {
    return [0, 0];
  }
  return [polarOptions.startAngle, polarOptions.endAngle];
};

export const selectAngleAxisRangeWithReversed = (
  state: RechartsRootState,
  angleAxisId: AxisId,
): AxisRange | undefined =>
  combineAxisRangeWithReverse(selectAngleAxis(state, angleAxisId), selectAngleAxisRange(state));

export const selectRadiusAxisRange = (
  state: RechartsRootState,
  _radiusAxisId: AxisId,
): AxisRange | undefined => {
  const maxRadius = selectMaxRadius(state);
  const innerRadius = selectInnerRadius(state);
  const outerRadius = selectOuterRadius(state);
  if (maxRadius == null || innerRadius == null || outerRadius == null) {
    return undefined;
  }
  return [innerRadius, outerRadius];
};

export const selectRadiusAxisRangeWithReversed = (
  state: RechartsRootState,
  radiusAxisId: AxisId,
): AxisRange | undefined =>
  combineAxisRangeWithReverse(
    selectRadiusAxis(state, radiusAxisId),
    selectRadiusAxisRange(state, radiusAxisId),
  );
