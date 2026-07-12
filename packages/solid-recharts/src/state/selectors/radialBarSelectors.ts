// Ported from recharts 3.8.1 src/state/selectors/radialBarSelectors.ts (commit 7a23854).
//
// FULL SOLID-NATIVE REWRITE: reselect `createSelector` → plain functions. Reuses
// the cartesian bar-position machinery (combineBarSizeList / combineAllBarPositions
// / combineBarPosition) keyed by the polar axes.
//
// STACKS wired (reference selectStackedRadialBars → selectPolarCombinedStackedData →
// selectStackGroups → selectPolarStackedData, inlined into selectRadialBarSectors):
// stacked RadialBars sharing a stackId render adjacent arcs from the shared d3 stack
// series. `selectRadialBarLegendPayload` (per-row legend) IS wired here.
import { RechartsRootState } from "../store";
import { AxisId } from "../cartesianAxisSlice";
import { ChartData } from "../chartDataSlice";
import { LayoutType, LegendType, TickItem } from "../../util/types";
import { LegendPayload } from "../../component/DefaultLegendContent";
import { selectChartDataAndAlwaysIgnoreIndexes } from "./dataSelectors";
import {
  selectPolarAxisScale,
  selectPolarAxisTicks,
  selectPolarGraphicalItemAxisTicks,
} from "./polarScaleSelectors";
import { selectAngleAxis, selectPolarViewBox, selectRadiusAxis } from "./polarAxisSelectors";
import { selectChartDataWithIndexes } from "./dataSelectors";
import { BaseAxisWithScale } from "./axisSelectors";
import { selectChartLayout } from "../../context/chartLayoutContext";
import {
  getBandSizeOfAxis,
  getBaseValueOfBar,
  getValueByDataKey,
  isCategoricalAxis,
} from "../../util/ChartUtils";
import { BarWithPosition, SizeList } from "./barSelectors";
import {
  selectBarCategoryGap,
  selectBarGap,
  selectRootBarSize,
  selectRootMaxBarSize,
} from "./rootPropsSelectors";
import { PolarGraphicalItemSettings } from "../graphicalItemsSlice";
import { selectPolarStackGroups, selectUnfilteredPolarItems } from "./polarSelectors";
import { combineStackedData } from "./combiners/combineStackedData";
import { isNullish, isNumOrStr } from "../../util/DataUtils";
import { combineBarSizeList } from "./combiners/combineBarSizeList";
import { combineAllBarPositions } from "./combiners/combineAllBarPositions";
import { combineBarPosition } from "./combiners/combineBarPosition";
import { BarPositionPosition } from "../../util/ChartUtils";
import { RadialBarSettings } from "../types/RadialBarSettings";
import { computeRadialBarDataItems, RadialBarDataItem } from "../../polar/RadialBar";
import type { CellProps } from "../../component/Cell";

export const selectRadiusAxisWithScale = (
  state: RechartsRootState,
  radiusAxisId: AxisId,
): BaseAxisWithScale | undefined => {
  const axis = selectRadiusAxis(state, radiusAxisId);
  const scale = selectPolarAxisScale(state, "radiusAxis", radiusAxisId);
  if (axis == null || scale == null) {
    return undefined;
  }
  return { ...axis, scale };
};

export const selectRadiusAxisTicks = (
  state: RechartsRootState,
  radiusAxisId: AxisId,
): ReadonlyArray<TickItem> | undefined =>
  selectPolarGraphicalItemAxisTicks(state, "radiusAxis", radiusAxisId, false);

export const selectAngleAxisWithScale = (
  state: RechartsRootState,
  angleAxisId: AxisId,
): BaseAxisWithScale | undefined => {
  const axis = selectAngleAxis(state, angleAxisId);
  const scale = selectPolarAxisScale(state, "angleAxis", angleAxisId);
  if (axis == null || scale == null) {
    return undefined;
  }
  return { ...axis, scale };
};

const selectAngleAxisTicks = (
  state: RechartsRootState,
  angleAxisId: AxisId,
): ReadonlyArray<TickItem> | undefined =>
  selectPolarAxisTicks(state, "angleAxis", angleAxisId, false);

const isRadialBar = (item: PolarGraphicalItemSettings): item is RadialBarSettings =>
  item.type === "radialBar";

const selectSynchronisedRadialBarSettings = (
  state: RechartsRootState,
  radialBarSettings: RadialBarSettings,
): RadialBarSettings | undefined => {
  const items = selectUnfilteredPolarItems(state);
  if (
    items.some(
      (pgis) =>
        pgis.type === "radialBar" &&
        radialBarSettings.dataKey === pgis.dataKey &&
        radialBarSettings.stackId === pgis.stackId,
    )
  ) {
    return radialBarSettings;
  }
  return undefined;
};

export const selectBandSizeOfPolarAxis = (
  state: RechartsRootState,
  radiusAxisId: AxisId,
  angleAxisId: AxisId,
): number | undefined => {
  const layout = selectChartLayout(state);
  if (isCategoricalAxis(layout, "radiusAxis")) {
    return getBandSizeOfAxis(
      selectRadiusAxisWithScale(state, radiusAxisId),
      selectRadiusAxisTicks(state, radiusAxisId),
      false,
    );
  }
  return getBandSizeOfAxis(
    selectAngleAxisWithScale(state, angleAxisId),
    selectAngleAxisTicks(state, angleAxisId),
    false,
  );
};

export const selectBaseValue = (
  state: RechartsRootState,
  radiusAxisId: AxisId,
  angleAxisId: AxisId,
): unknown => {
  const layout = selectChartLayout(state);
  const numericAxis =
    layout === "radial"
      ? selectAngleAxisWithScale(state, angleAxisId)
      : selectRadiusAxisWithScale(state, radiusAxisId);
  if (numericAxis == null || numericAxis.scale == null) {
    return undefined;
  }
  return getBaseValueOfBar({ numericAxis });
};

const selectAllVisibleRadialBars = (
  state: RechartsRootState,
  radiusAxisId: AxisId,
  angleAxisId: AxisId,
): ReadonlyArray<RadialBarSettings> => {
  const layout = selectChartLayout(state);
  return selectUnfilteredPolarItems(state)
    .filter((i) =>
      layout === "centric" ? i.angleAxisId === angleAxisId : i.radiusAxisId === radiusAxisId,
    )
    .filter((i) => i.hide === false)
    .filter(isRadialBar);
};

// The generator never returns a total size for polar charts → percent barSize
// is unsupported (recharts note).
const selectPolarBarAxisSize = (): undefined => undefined;

export const selectPolarBarSizeList = (
  state: RechartsRootState,
  radiusAxisId: AxisId,
  angleAxisId: AxisId,
): SizeList =>
  combineBarSizeList(
    selectAllVisibleRadialBars(state, radiusAxisId, angleAxisId),
    selectRootBarSize(state),
    selectPolarBarAxisSize(),
  );

export const selectPolarBarBandSize = (
  state: RechartsRootState,
  radiusAxisId: AxisId,
  angleAxisId: AxisId,
  radialBarSettings: RadialBarSettings,
): number => {
  const layout = selectChartLayout(state);
  const globalMaxBarSize = selectRootMaxBarSize(state);
  const childMaxBarSize = radialBarSettings.maxBarSize;
  const maxBarSize = isNullish(childMaxBarSize) ? globalMaxBarSize : childMaxBarSize;
  if (layout === "centric") {
    return (
      getBandSizeOfAxis(
        selectAngleAxisWithScale(state, angleAxisId),
        selectAngleAxisTicks(state, angleAxisId),
        true,
      ) ??
      maxBarSize ??
      0
    );
  }
  return (
    getBandSizeOfAxis(
      selectRadiusAxisWithScale(state, radiusAxisId),
      selectRadiusAxisTicks(state, radiusAxisId),
      true,
    ) ??
    maxBarSize ??
    0
  );
};

export const selectAllPolarBarPositions = (
  state: RechartsRootState,
  radiusAxisId: AxisId,
  angleAxisId: AxisId,
  radialBarSettings: RadialBarSettings,
): ReadonlyArray<BarWithPosition> | undefined =>
  combineAllBarPositions(
    selectPolarBarSizeList(state, radiusAxisId, angleAxisId),
    selectRootMaxBarSize(state),
    selectBarGap(state),
    selectBarCategoryGap(state),
    selectPolarBarBandSize(state, radiusAxisId, angleAxisId, radialBarSettings),
    selectBandSizeOfPolarAxis(state, radiusAxisId, angleAxisId),
    radialBarSettings.maxBarSize,
  );

export const selectPolarBarPosition = (
  state: RechartsRootState,
  radiusAxisId: AxisId,
  angleAxisId: AxisId,
  radialBarSettings: RadialBarSettings,
): BarPositionPosition | undefined =>
  combineBarPosition(
    selectAllPolarBarPositions(state, radiusAxisId, angleAxisId, radialBarSettings),
    selectSynchronisedRadialBarSettings(state, radialBarSettings),
  );

export const selectRadialBarSectors = (
  state: RechartsRootState,
  radiusAxisId: AxisId,
  angleAxisId: AxisId,
  radialBarSettings: RadialBarSettings,
  cells?: ReadonlyArray<CellProps>,
): ReadonlyArray<RadialBarDataItem> => {
  const angleAxis = selectAngleAxisWithScale(state, angleAxisId);
  const angleAxisTicks = selectAngleAxisTicks(state, angleAxisId);
  const radiusAxis = selectRadiusAxisWithScale(state, radiusAxisId);
  const radiusAxisTicks = selectRadiusAxisTicks(state, radiusAxisId);
  const { chartData, dataStartIndex, dataEndIndex } = selectChartDataWithIndexes(state);
  const settings = selectSynchronisedRadialBarSettings(state, radialBarSettings);
  const bandSize = selectBandSizeOfPolarAxis(state, radiusAxisId, angleAxisId);
  const layout: LayoutType = selectChartLayout(state);
  const baseValue = selectBaseValue(state, radiusAxisId, angleAxisId);
  const polarViewBox = selectPolarViewBox(state);
  const pos = selectPolarBarPosition(state, radiusAxisId, angleAxisId, radialBarSettings);

  if (
    settings == null ||
    radiusAxis == null ||
    angleAxis == null ||
    chartData == null ||
    bandSize == null ||
    pos == null ||
    (layout !== "centric" && layout !== "radial") ||
    radiusAxisTicks == null ||
    polarViewBox == null
  ) {
    return [];
  }
  // Stack chain (reference selectPolarStackedData): the polar stack groups on the
  // numeric axis (radius axis in centric layout, angle axis in radial layout) →
  // this item's stack series.
  const stackAxisType = layout === "centric" ? ("radiusAxis" as const) : ("angleAxis" as const);
  const stackAxisId = layout === "centric" ? radiusAxisId : angleAxisId;
  const stackedData = combineStackedData(
    selectPolarStackGroups(state, stackAxisType, stackAxisId),
    settings,
  );
  const numericAxis = layout === "centric" ? radiusAxis : angleAxis;
  const stackedDomain: ReadonlyArray<unknown> | null =
    stackedData != null ? numericAxis.scale.domain() : null;

  const { dataKey, minPointSize } = settings;
  const { cx, cy, startAngle, endAngle } = polarViewBox;
  const displayedData: ChartData = chartData.slice(dataStartIndex, dataEndIndex + 1);
  return computeRadialBarDataItems({
    angleAxis,
    angleAxisTicks,
    bandSize,
    baseValue,
    cx,
    cy,
    dataKey,
    dataStartIndex,
    displayedData,
    endAngle,
    layout,
    minPointSize,
    pos,
    radiusAxis,
    radiusAxisTicks,
    stackedData,
    stackedDomain,
    startAngle,
    cells,
  });
};

// One legend entry per displayed data row (recharts' selectRadialBarLegendPayload).
// Faithful to reference: reads `name`/`fill` straight off each row — RadialBar's
// legend does NOT merge <Cell> props (unlike the sectors / Pie legend).
export const selectRadialBarLegendPayload = (
  state: RechartsRootState,
  legendType: LegendType | undefined,
): ReadonlyArray<LegendPayload> => {
  const { chartData, dataStartIndex, dataEndIndex } = selectChartDataAndAlwaysIgnoreIndexes(state);
  if (chartData == null) {
    return [];
  }
  const displayedData = chartData.slice(dataStartIndex, dataEndIndex + 1);
  if (displayedData.length === 0) {
    return [];
  }
  return displayedData.map((entry): LegendPayload => {
    const nameRaw: unknown = getValueByDataKey(entry, "name");
    const fillRaw: unknown = getValueByDataKey(entry, "fill");
    return {
      type: legendType,
      value: isNumOrStr(nameRaw) ? String(nameRaw) : undefined,
      color: typeof fillRaw === "string" ? fillRaw : undefined,
      payload: typeof entry === "object" && entry != null ? entry : undefined,
    };
  });
};
