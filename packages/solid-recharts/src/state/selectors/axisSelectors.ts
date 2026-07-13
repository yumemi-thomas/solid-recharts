// Ported from recharts 3.8.1 src/state/selectors/axisSelectors.ts (commit 7a23854).
//
// This is the scale spine every cartesian graphical item depends on: it turns
// registered axis settings + data into a domain, a scale function, and ticks.
//
// SOLID-NATIVE: recharts composes these with reselect `createSelector`; here they
// are plain functions composing other plain functions — memoization comes from
// `useAppSelector`'s `createMemo` at the consumer. Behavior is identical.
//
// SCOPE: this port covers the path needed to draw a <Line> from a <LineChart data>
// (category/number cartesian axes, point/band/linear scales). Branches that need
// not-yet-ported slices are stubbed with a clear marker and a behavior note:
//   - stacks (stackGroups)        → selectDomainOfStackGroups returns undefined
//   - error bars (errorBarSlice)  → selectAllErrorBarSettings returns {}
//   - Brush panorama range        → selectX/YAxisRange returns undefined when isPanorama
//   - polar axes (angle/radius)   → selectBaseAxis throws for them
// Each stub is the correct value for a chart that doesn't use that feature, so the
// non-stacked, no-error-bar, no-Brush <Line> path is exact.
// PORTED: reference elements (selectReferenceElementsDomain + the dots/lines/areas
// ByAxis selectors + combine*Domain) extend the numerical domain for
// ifOverflow='extendDomain' elements (referenceElementsSlice is wired in).
import { range } from "../../util/collectionUtils";
import { selectChartLayout } from "../../context/chartLayoutContext";
import {
  getDomainOfStackGroups,
  getStackedData,
  getValueByDataKey,
  isCategoricalAxis,
  type StackId,
} from "../../util/ChartUtils";
import { type DefinitelyStackedGraphicalItem, isStacked } from "../types/StackedGraphicalItem";
import type { ErrorBarsSettings, ErrorBarsState } from "../errorBarSlice";
import { type AllStackGroups, type StackGroup } from "../../util/stacks/stackTypes";
import { getStackSeriesIdentifier } from "../../util/stacks/getStackSeriesIdentifier";
import {
  combineDisplayedStackedData,
  type DisplayedStackedData,
} from "./combiners/combineDisplayedStackedData";
import {
  AxisDomain,
  AxisTick,
  AxisType,
  CartesianTickItem,
  CategoricalDomain,
  CategoricalDomainItem,
  ChartOffsetInternal,
  Coordinate,
  LayoutType,
  NumberDomain,
  RechartsScaleType,
  Size,
  StackOffsetType,
  TickItem,
} from "../../util/types";
import {
  AxisId,
  BaseCartesianAxis,
  CartesianAxisSettings,
  XAxisOrientation,
  XAxisSettings,
  YAxisOrientation,
  YAxisSettings,
  ZAxisSettings,
} from "../cartesianAxisSlice";
import { AngleAxisSettings, RadiusAxisSettings } from "../polarAxisSlice";
import { RechartsRootState } from "../store";
import { CartesianGraphicalItemSettings } from "../graphicalItemsSlice";
import type { GraphicalItemSettings } from "../graphicalItemsSlice";
import {
  selectChartDataWithIndexes,
  selectChartDataWithIndexesIfNotInPanoramaPosition4,
  selectChartDataSliceIfNotInPanorama,
} from "./dataSelectors";
import {
  isWellFormedNumberDomain,
  numericalDomainSpecifiedWithoutRequiringData,
  parseNumericalUserDomain,
} from "../../util/isDomainSpecifiedByUser";
import { AppliedChartData, ChartData, ChartDataState } from "../chartDataSlice";
import {
  getPercentValue,
  hasDuplicate,
  isNan,
  isNotNil,
  isNumOrStr,
  mathSign,
} from "../../util/DataUtils";
import { selectChartHeight, selectChartWidth } from "./containerSelectors";
import { selectAllXAxes, selectAllYAxes } from "./selectAllAxes";
import { pickAxisType } from "./pickAxisType";
import { pickAxisId } from "./pickAxisId";
import { createSelector } from "../createSelector";
import { arrayContentsAreEqualCheck, emptyArraysAreEqualCheck } from "./arrayEqualityCheck";
import { numberDomainEqualityCheck } from "./numberDomainEqualityCheck";
import { isWellBehavedNumber } from "../../util/isWellBehavedNumber";

// `pickAxisType` is generic (`<T>(state, axisType: T) => T`), so as a bare input
// selector its return infers to `unknown`. These typed picks pin it to the axis
// arg shape each combiner expects — used wherever it feeds a wrapped selector.
const pickAxisTypeArg = (_state: RechartsRootState, axisType: AllAxisTypes): AllAxisTypes =>
  axisType;
const pickRenderableAxisType = (
  _state: RechartsRootState,
  axisType: RenderableAxisType,
): RenderableAxisType => axisType;
import { getNiceTickValues, getTickValuesFixedDomain } from "../../util/scale";
import { selectChartOffsetInternal } from "./selectChartOffsetInternal";
import { selectBrushDimensions } from "./brushSelectors";
import { combineAxisRangeWithReverse } from "./combiners/combineAxisRangeWithReverse";
import { DEFAULT_Y_AXIS_WIDTH } from "../../util/Constants";
import { RechartsScale, rechartsScaleFactory } from "../../util/scale/RechartsScale";
import { combineCheckedDomain } from "./combiners/combineCheckedDomain";
import { CustomScaleDefinition } from "../../util/scale/CustomScaleDefinition";
import { combineConfiguredScale } from "./combiners/combineConfiguredScale";
import { combineInverseScaleFunction } from "./combiners/combineInverseScaleFunction";
import type { InverseScaleFunction } from "../../hooks";
import { combineRealScaleType } from "./combiners/combineRealScaleType";
import { AllAxisTypes, RenderableAxisType, selectTooltipAxisType } from "./selectTooltipAxisType";
// Polar axis selectors — value-import cycle with this module (polarAxisSelectors
// imports AxisRange + combineAxisRangeWithReverse back), resolved lazily at call
// time, the same shape recharts uses.
import {
  selectAngleAxis,
  selectAngleAxisRange,
  selectRadiusAxis,
  selectRadiusAxisRange,
} from "./polarAxisSelectors";
import {
  selectBarCategoryGap,
  selectChartName,
  selectReverseStackOrder,
  selectStackOffsetType,
} from "./rootPropsSelectors";
import { selectTooltipAxisId } from "./selectTooltipAxisId";
import type {
  ReferenceAreaSettings,
  ReferenceDotSettings,
  ReferenceElementSettings,
  ReferenceLineSettings,
} from "../referenceElementsSlice";

/**
 * A pixel range `[start, end]` an axis maps its domain onto. Lives here in
 * recharts too; consumers (e.g. ZAxisSettings) import it from this module.
 */
export type AxisRange = readonly [number, number];

/**
 * A {@link BaseCartesianAxis} after its scale has been constructed: the external
 * `scale` definition (string/custom) is replaced with a concrete
 * {@link RechartsScale}. Consumers (ChartUtils band/coordinate helpers) import
 * it from this module, matching the reference.
 */
export type BaseAxisWithScale = Omit<BaseCartesianAxis, "scale"> & { scale: RechartsScale };

export const defaultNumericDomain: AxisDomain = [0, "auto"];

export type RenderableAxisSettings =
  | XAxisSettings
  | YAxisSettings
  | AngleAxisSettings
  | RadiusAxisSettings;
export type AllAxisSettings =
  | XAxisSettings
  | YAxisSettings
  | ZAxisSettings
  | AngleAxisSettings
  | RadiusAxisSettings;

/**
 * All registered cartesian graphical items, before any axis/hide filtering.
 */
export const selectUnfilteredCartesianItems = (
  state: RechartsRootState,
): ReadonlyArray<CartesianGraphicalItemSettings> => state.graphicalItems.cartesianItems;

/**
 * If an axis is not explicitly defined as an element, we still need something to
 * hold the domain and default settings.
 */
export const implicitXAxis: XAxisSettings = {
  allowDataOverflow: false,
  allowDecimals: true,
  allowDuplicatedCategory: true,
  angle: 0,
  dataKey: undefined,
  domain: undefined,
  height: 30,
  hide: true,
  id: 0,
  includeHidden: false,
  interval: "preserveEnd",
  minTickGap: 5,
  mirror: false,
  name: undefined,
  orientation: "bottom",
  padding: { left: 0, right: 0 },
  reversed: false,
  scale: "auto",
  tick: true,
  tickCount: 5,
  tickFormatter: undefined,
  ticks: undefined,
  type: "category",
  unit: undefined,
  niceTicks: "auto",
};

export const selectXAxisSettingsNoDefaults = (
  state: RechartsRootState,
  axisId: AxisId,
): XAxisSettings | undefined => state.cartesianAxis.xAxis[axisId];

export const selectXAxisSettings = (state: RechartsRootState, axisId: AxisId): XAxisSettings => {
  const axis = selectXAxisSettingsNoDefaults(state, axisId);
  if (axis == null) {
    return implicitXAxis;
  }
  return axis;
};

export const implicitYAxis: YAxisSettings = {
  allowDataOverflow: false,
  allowDecimals: true,
  allowDuplicatedCategory: true,
  angle: 0,
  dataKey: undefined,
  domain: defaultNumericDomain,
  hide: true,
  id: 0,
  includeHidden: false,
  interval: "preserveEnd",
  minTickGap: 5,
  mirror: false,
  name: undefined,
  orientation: "left",
  padding: { top: 0, bottom: 0 },
  reversed: false,
  scale: "auto",
  tick: true,
  tickCount: 5,
  tickFormatter: undefined,
  ticks: undefined,
  type: "number",
  unit: undefined,
  niceTicks: "auto",
  width: DEFAULT_Y_AXIS_WIDTH,
};

export const selectYAxisSettingsNoDefaults = (
  state: RechartsRootState,
  axisId: AxisId,
): YAxisSettings | undefined => state.cartesianAxis.yAxis[axisId];

export const selectYAxisSettings = (state: RechartsRootState, axisId: AxisId): YAxisSettings => {
  const axis = selectYAxisSettingsNoDefaults(state, axisId);
  if (axis == null) {
    return implicitYAxis;
  }
  return axis;
};

export const implicitZAxis: ZAxisSettings = {
  domain: [0, "auto"],
  includeHidden: false,
  reversed: false,
  allowDataOverflow: false,
  allowDuplicatedCategory: false,
  dataKey: undefined,
  id: 0,
  name: "",
  range: [64, 64],
  scale: "auto",
  type: "number",
  unit: "",
};

export const selectZAxisSettings = (state: RechartsRootState, axisId: AxisId): ZAxisSettings => {
  const axis = state.cartesianAxis.zAxis[axisId];
  if (axis == null) {
    return implicitZAxis;
  }
  return axis;
};

export const selectBaseAxis = (
  state: RechartsRootState,
  axisType: AllAxisTypes,
  axisId: AxisId,
): AllAxisSettings => {
  switch (axisType) {
    case "xAxis":
      return selectXAxisSettings(state, axisId);
    case "yAxis":
      return selectYAxisSettings(state, axisId);
    case "zAxis":
      return selectZAxisSettings(state, axisId);
    case "angleAxis":
      return selectAngleAxis(state, axisId);
    case "radiusAxis":
      return selectRadiusAxis(state, axisId);
    default:
      // Exhaustive: all axis types handled above, so `axisType` is `never` here.
      throw new Error(`Unexpected axis type: ${String(axisType)}`);
  }
};

/**
 * Selects an X or Y axis (with implicit defaults). Z, angle and radius axes are
 * handled by {@link selectBaseAxis} / the polar vertical.
 */
export const selectRenderableAxisSettings = (
  state: RechartsRootState,
  axisType: RenderableAxisType,
  axisId: AxisId,
): RenderableAxisSettings => {
  switch (axisType) {
    case "xAxis":
      return selectXAxisSettings(state, axisId);
    case "yAxis":
      return selectYAxisSettings(state, axisId);
    case "angleAxis":
      return selectAngleAxis(state, axisId);
    case "radiusAxis":
      return selectRadiusAxis(state, axisId);
    default:
      // Exhaustive: all axis types handled above, so `axisType` is `never` here.
      throw new Error(`Unexpected axis type: ${String(axisType)}`);
  }
};

export const selectTooltipAxis = (state: RechartsRootState): RenderableAxisSettings =>
  selectRenderableAxisSettings(state, selectTooltipAxisType(state), selectTooltipAxisId(state));

/**
 * @return true if there is at least one Bar or RadialBar.
 *
 */
export const selectHasBar = (state: RechartsRootState): boolean =>
  state.graphicalItems.cartesianItems.some((item) => item.type === "bar") ||
  state.graphicalItems.polarItems.some((item) => item.type === "radialBar");

export type AxisDirection = "left-to-right" | "right-to-left" | "top-to-bottom" | "bottom-to-top";

/**
 * The reading direction the keyboard tooltip navigation follows. Deviation:
 * recharts derives this from selectAllXAxes/selectAllYAxes; the port reads the
 * registered axis records directly (the implicit axis has `reversed: false`, so
 * an empty record yields the default direction).
 */
export const selectChartDirection = (state: RechartsRootState): AxisDirection | undefined => {
  const layout = selectChartLayout(state);
  switch (layout) {
    case "horizontal":
      return Object.values(state.cartesianAxis.xAxis).some((axis) => axis.reversed)
        ? "right-to-left"
        : "left-to-right";
    case "vertical":
      return Object.values(state.cartesianAxis.yAxis).some((axis) => axis.reversed)
        ? "bottom-to-top"
        : "top-to-bottom";
    case "centric":
    case "radial":
      return "left-to-right";
    default:
      return undefined;
  }
};

/**
 * @returns predicate that returns true for graphical items relevant to the axis.
 */
// An item that may carry any of the cartesian or polar axis ids; the `in`
// guards narrow per axis type (cartesian items lack angle/radius ids and vice
// versa, so the wrong-family branch returns false harmlessly).
type AnyAxisGraphicalItem = GraphicalItemSettings &
  Partial<{
    xAxisId: AxisId;
    yAxisId: AxisId;
    zAxisId: AxisId;
    angleAxisId: AxisId;
    radiusAxisId: AxisId;
  }>;

export function itemAxisPredicate(axisType: AllAxisTypes, axisId: AxisId) {
  return (item: AnyAxisGraphicalItem): boolean => {
    switch (axisType) {
      case "xAxis":
        return "xAxisId" in item && item.xAxisId === axisId;
      case "yAxis":
        return "yAxisId" in item && item.yAxisId === axisId;
      case "zAxis":
        return "zAxisId" in item && item.zAxisId === axisId;
      case "angleAxis":
        return "angleAxisId" in item && item.angleAxisId === axisId;
      case "radiusAxis":
        return "radiusAxisId" in item && item.radiusAxisId === axisId;
      default:
        return false;
    }
  };
}

// Wrapped (ADR-0002) so the predicate reference is stable per (axisType, axisId)
// — an unwrapped fresh closure per call would defeat downstream item-settings
// caching. Mirrors upstream `createSelector([pickAxisType, pickAxisId], itemAxisPredicate)`.
const selectAxisPredicate: (
  state: RechartsRootState,
  axisType: AllAxisTypes,
  axisId: AxisId,
) => (item: CartesianGraphicalItemSettings) => boolean = createSelector(
  [pickAxisTypeArg, pickAxisId],
  itemAxisPredicate,
);

export const combineGraphicalItemsSettings = <T extends GraphicalItemSettings>(
  graphicalItems: ReadonlyArray<T>,
  axisSettings: BaseCartesianAxis,
  axisPredicate: (item: T) => boolean,
): ReadonlyArray<T> =>
  graphicalItems.filter(axisPredicate).filter((item) => {
    if (axisSettings?.includeHidden === true) {
      return true;
    }
    return !item.hide;
  });

export const selectCartesianItemsSettings: (
  state: RechartsRootState,
  axisType: AllAxisTypes,
  axisId: AxisId,
) => ReadonlyArray<CartesianGraphicalItemSettings> = createSelector(
  [selectUnfilteredCartesianItems, selectBaseAxis, selectAxisPredicate],
  combineGraphicalItemsSettings,
  { resultEqualityCheck: emptyArraysAreEqualCheck },
);

export const filterGraphicalNotStackedItems = (
  cartesianItems: ReadonlyArray<GraphicalItemSettings>,
): ReadonlyArray<GraphicalItemSettings> =>
  cartesianItems.filter((item) => !("stackId" in item) || item.stackId === undefined);

const selectCartesianItemsSettingsExceptStacked: (
  state: RechartsRootState,
  axisType: AllAxisTypes,
  axisId: AxisId,
) => ReadonlyArray<GraphicalItemSettings> = createSelector(
  [selectCartesianItemsSettings],
  filterGraphicalNotStackedItems,
);

export const combineGraphicalItemsData = (
  cartesianItems: ReadonlyArray<GraphicalItemSettings>,
): ChartData =>
  cartesianItems
    .map((item) => item.data)
    .filter(isNotNil)
    .flat(1);

/**
 * True if at least one graphical item relies on the chart-level data (no own
 * `data` prop).
 */
export const selectAnyCartesianItemsUsesChartData: (
  state: RechartsRootState,
  axisType: AllAxisTypes,
  axisId: AxisId,
) => boolean = createSelector([selectCartesianItemsSettings], (items) =>
  items.some((item) => !item.data),
);

/**
 * Data defined on the chart graphical items (Line/Scatter/etc.), filtered by axis.
 */
export const selectCartesianGraphicalItemsData: (
  state: RechartsRootState,
  axisType: AllAxisTypes,
  axisId: AxisId,
) => ChartData = createSelector([selectCartesianItemsSettings], combineGraphicalItemsData, {
  resultEqualityCheck: emptyArraysAreEqualCheck,
});

export const combineDisplayedData = (
  graphicalItemsData: ChartData,
  { chartData = [], dataStartIndex, dataEndIndex }: ChartDataState,
): ChartData => {
  if (graphicalItemsData.length > 0) {
    return graphicalItemsData;
  }
  return chartData.slice(dataStartIndex, dataEndIndex + 1);
};

/**
 * All data in the chart (graphical items + chart root), useful for figuring out
 * an axis domain. Discards original indexes, so not useful for ordering.
 */
export const selectDisplayedData: (
  state: RechartsRootState,
  axisType: AllAxisTypes,
  axisId: AxisId,
  isPanorama: boolean,
) => ChartData = createSelector(
  [selectCartesianGraphicalItemsData, selectChartDataWithIndexesIfNotInPanoramaPosition4],
  combineDisplayedData,
);

export const combineAppliedValues = (
  data: ChartData,
  axisSettings: BaseCartesianAxis,
  items: ReadonlyArray<GraphicalItemSettings>,
): AppliedChartData => {
  if (axisSettings?.dataKey != null) {
    return data.map((item) => ({ value: getValueByDataKey(item, axisSettings.dataKey) }));
  }
  if (items.length > 0) {
    return items
      .map((item) => item.dataKey)
      .flatMap((dataKey) => data.map((entry) => ({ value: getValueByDataKey(entry, dataKey) })));
  }
  return data.map((entry) => ({ value: entry }));
};

export const combineAllAppliedValues = (
  displayedData: ChartData,
  axisSettings: BaseCartesianAxis,
  items: ReadonlyArray<GraphicalItemSettings>,
  { chartData = [], dataStartIndex, dataEndIndex }: ChartDataState,
  anyItemUsesChartData: boolean,
  graphicalItemsData: ChartData,
): AppliedChartData => {
  const appliedValues = combineAppliedValues(displayedData, axisSettings, items);
  if (anyItemUsesChartData && axisSettings?.dataKey != null && graphicalItemsData.length > 0) {
    const chartDataSlice = chartData.slice(dataStartIndex, dataEndIndex + 1);
    const chartAppliedValues: AppliedChartData = chartDataSlice
      .map((item) => ({ value: getValueByDataKey(item, axisSettings.dataKey) }))
      .filter((av) => av.value != null);
    return [...chartAppliedValues, ...appliedValues];
  }
  return appliedValues;
};

/**
 * All values with the appropriate dataKey applied. Expensive — iterates all data.
 */
export const selectAllAppliedValues: (
  state: RechartsRootState,
  axisType: AllAxisTypes,
  axisId: AxisId,
  isPanorama: boolean,
) => AppliedChartData = createSelector(
  [
    selectDisplayedData,
    selectBaseAxis,
    selectCartesianItemsSettings,
    selectChartDataWithIndexesIfNotInPanoramaPosition4,
    selectAnyCartesianItemsUsesChartData,
    selectCartesianGraphicalItemsData,
  ],
  combineAllAppliedValues,
);

function makeNumber(val: unknown): number | undefined {
  if (isNumOrStr(val) || val instanceof Date) {
    const n = Number(val);
    if (isWellBehavedNumber(n)) {
      return n;
    }
  }
  return undefined;
}

function makeDomain(val: unknown): NumberDomain | undefined {
  if (Array.isArray(val)) {
    const arr: ReadonlyArray<unknown> = val;
    const attempt = [makeNumber(arr[0]), makeNumber(arr[1])];
    if (isWellFormedNumberDomain(attempt)) {
      return attempt;
    }
    return undefined;
  }
  const n = makeNumber(val);
  if (n == null) {
    return undefined;
  }
  return [n, n];
}

function onlyAllowNumbers(data: ReadonlyArray<unknown>): ReadonlyArray<number> {
  return data.map(makeNumber).filter(isNotNil);
}

// ----- Error bars ----------------------------------------------------------
// The ErrorBarsSettings/State types live in the errorBarSlice (re-homed). The
// domain math below extends the numerical domain by each ErrorBar's value.

export function isErrorBarRelevantForAxisType(
  axisType: AllAxisTypes,
  errorBar: ErrorBarsSettings,
): boolean {
  switch (axisType) {
    case "xAxis":
      return errorBar.direction === "x";
    case "yAxis":
      return errorBar.direction === "y";
    default:
      return false;
  }
}

export function getErrorDomainByDataKey(
  entry: unknown,
  appliedValue: unknown,
  relevantErrorBars: ReadonlyArray<ErrorBarsSettings> | undefined,
): ReadonlyArray<number> {
  if (!relevantErrorBars || !relevantErrorBars.length) {
    return [];
  }

  let appliedNumericValue: number | undefined;
  if (typeof appliedValue === "number" && !isNan(appliedValue)) {
    appliedNumericValue = appliedValue;
  } else if (Array.isArray(appliedValue)) {
    const numericRangeValues = onlyAllowNumbers(appliedValue);
    if (numericRangeValues.length > 0) {
      appliedNumericValue = Math.max(...numericRangeValues);
    }
  }

  if (appliedNumericValue == null) {
    return [];
  }
  const baseValue = appliedNumericValue;

  return onlyAllowNumbers(
    relevantErrorBars.flatMap((eb) => {
      const errorValue = getValueByDataKey(entry, eb.dataKey);
      let lowBound: unknown;
      let highBound: unknown;

      if (Array.isArray(errorValue)) {
        const arr: ReadonlyArray<unknown> = errorValue;
        lowBound = arr[0];
        highBound = arr[1];
      } else {
        lowBound = errorValue;
        highBound = errorValue;
      }
      if (!isWellBehavedNumber(lowBound) || !isWellBehavedNumber(highBound)) {
        return [undefined];
      }
      return [baseValue - lowBound, baseValue + highBound];
    }),
  );
}

export const selectAllErrorBarSettings = (state: RechartsRootState): ErrorBarsState =>
  state.errorBars;

// Ported from recharts combineRelevantErrorBarSettings + selectErrorBarsSettings
// (axisSelectors.ts): the ErrorBars registered against the cartesian items on the
// given axis, filtered to those whose direction is relevant for that axis type.
// reselect createSelector → plain function (memoization from useAppSelector).
export const selectErrorBarsSettings = (
  state: RechartsRootState,
  axisType: AllAxisTypes,
  axisId: AxisId,
): ReadonlyArray<ErrorBarsSettings> => {
  const cartesianItemsSettings = selectCartesianItemsSettings(state, axisType, axisId);
  const allErrorBarSettings = selectAllErrorBarSettings(state);
  return cartesianItemsSettings
    .flatMap((item) => allErrorBarSettings[item.id])
    .filter((e): e is ErrorBarsSettings => Boolean(e))
    .filter((e) => isErrorBarRelevantForAxisType(axisType, e));
};

export const mergeDomains = (
  ...domains: ReadonlyArray<ReadonlyArray<number> | undefined>
): NumberDomain | undefined => {
  const allDomains = domains.filter(isNotNil);
  if (allDomains.length === 0) {
    return undefined;
  }
  const allValues = allDomains.flat();
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  return [min, max];
};

export const combineDomainOfAllAppliedNumericalValuesIncludingErrorValues = (
  displayedData: ChartData,
  axisSettings: BaseCartesianAxis,
  items: ReadonlyArray<GraphicalItemSettings>,
  errorBars: ErrorBarsState,
  axisType: AllAxisTypes,
  chartDataSlice: ChartData = [],
): NumberDomain | undefined => {
  let lowerEnd: number | undefined;
  let upperEnd: number | undefined;
  if (items.length > 0) {
    items.forEach((item) => {
      const itemData: ChartData = item.data != null ? [...item.data] : chartDataSlice;
      const relevantErrorBars = errorBars[item.id]?.filter((errorBar) =>
        isErrorBarRelevantForAxisType(axisType, errorBar),
      );
      itemData.forEach((entry) => {
        const valueByDataKey = getValueByDataKey(entry, axisSettings.dataKey ?? item.dataKey);
        const errorDomain = getErrorDomainByDataKey(entry, valueByDataKey, relevantErrorBars);
        if (errorDomain.length >= 2) {
          const localLower = Math.min(...errorDomain);
          const localUpper = Math.max(...errorDomain);
          if (lowerEnd == null || localLower < lowerEnd) {
            lowerEnd = localLower;
          }
          if (upperEnd == null || localUpper > upperEnd) {
            upperEnd = localUpper;
          }
        }
        const dataValueDomain = makeDomain(valueByDataKey);
        if (dataValueDomain != null) {
          lowerEnd = lowerEnd == null ? dataValueDomain[0] : Math.min(lowerEnd, dataValueDomain[0]);
          upperEnd = upperEnd == null ? dataValueDomain[1] : Math.max(upperEnd, dataValueDomain[1]);
        }
      });
    });
  }
  if (axisSettings?.dataKey != null && items.length === 0) {
    displayedData.forEach((item) => {
      const dataValueDomain = makeDomain(getValueByDataKey(item, axisSettings.dataKey));
      if (dataValueDomain != null) {
        lowerEnd = lowerEnd == null ? dataValueDomain[0] : Math.min(lowerEnd, dataValueDomain[0]);
        upperEnd = upperEnd == null ? dataValueDomain[1] : Math.max(upperEnd, dataValueDomain[1]);
      }
    });
  }

  if (isWellBehavedNumber(lowerEnd) && isWellBehavedNumber(upperEnd)) {
    return [lowerEnd, upperEnd];
  }
  return undefined;
};

// NOT wrapped (ADR-0002 leaf-input constraint): `selectAllErrorBarSettings`
// returns the `errorBars` slice root and the combiner iterates its nested,
// dynamically-keyed entries. Under a wrapped selector the combiner runs
// untracked and the input reads only the root, so an ErrorBar registering after
// first compute is never tracked → the domain stays stale (missed the error-bar
// extension). Kept as a plain function so its combiner runs tracked inside its
// wrapped consumer `selectNumericalDomain`, whose numberDomainEqualityCheck
// still stabilizes the domain reference downstream.
export const selectDomainOfAllAppliedNumericalValuesIncludingErrorValues = (
  state: RechartsRootState,
  axisType: AllAxisTypes,
  axisId: AxisId,
  isPanorama: boolean,
): NumberDomain | undefined =>
  combineDomainOfAllAppliedNumericalValuesIncludingErrorValues(
    selectDisplayedData(state, axisType, axisId, isPanorama),
    selectBaseAxis(state, axisType, axisId),
    selectCartesianItemsSettingsExceptStacked(state, axisType, axisId),
    selectAllErrorBarSettings(state),
    axisType,
    selectChartDataSliceIfNotInPanorama(state, axisType, axisId, isPanorama),
  );

function onlyAllowNumbersAndStringsAndDates(item: {
  value: unknown;
}): string | number | Date | undefined {
  const { value } = item;
  if (isNumOrStr(value) || value instanceof Date) {
    return value;
  }
  return undefined;
}

const computeDomainOfTypeCategory = (
  allDataSquished: AppliedChartData,
  axisSettings: BaseCartesianAxis,
  isCategorical: boolean,
): CategoricalDomain => {
  const categoricalDomain = allDataSquished
    .map(onlyAllowNumbersAndStringsAndDates)
    .filter(isNotNil);
  if (
    isCategorical &&
    (axisSettings.dataKey == null ||
      (axisSettings.allowDuplicatedCategory && hasDuplicate(categoricalDomain)))
  ) {
    return range(0, allDataSquished.length);
  }
  if (axisSettings.allowDuplicatedCategory) {
    return categoricalDomain;
  }
  return Array.from(new Set(categoricalDomain));
};

// Reference elements (dots/lines/areas) with ifOverflow='extendDomain' extend
// the numerical domain so the element fits inside the plot area. Ported from
// recharts' selectReferenceDots/Lines/Areas → ...ByAxis → ...Domain chain; the
// reselect `createSelector`s become plain functions (memoization comes from
// useAppSelector's createMemo).
export const selectReferenceDots = (
  state: RechartsRootState,
): ReadonlyArray<ReferenceDotSettings> => state.referenceElements.dots;

export const selectReferenceAreas = (
  state: RechartsRootState,
): ReadonlyArray<ReferenceAreaSettings> => state.referenceElements.areas;

export const selectReferenceLines = (
  state: RechartsRootState,
): ReadonlyArray<ReferenceLineSettings> => state.referenceElements.lines;

export const filterReferenceElements = <T extends ReferenceElementSettings>(
  elements: ReadonlyArray<T>,
  axisType: AllAxisTypes,
  axisId: AxisId,
): ReadonlyArray<T> =>
  elements
    .filter((el) => el.ifOverflow === "extendDomain")
    .filter((el) => (axisType === "xAxis" ? el.xAxisId === axisId : el.yAxisId === axisId));

export const selectReferenceDotsByAxis = (
  state: RechartsRootState,
  axisType: AllAxisTypes,
  axisId: AxisId,
): ReadonlyArray<ReferenceDotSettings> =>
  filterReferenceElements(selectReferenceDots(state), axisType, axisId);

export const selectReferenceAreasByAxis = (
  state: RechartsRootState,
  axisType: AllAxisTypes,
  axisId: AxisId,
): ReadonlyArray<ReferenceAreaSettings> =>
  filterReferenceElements(selectReferenceAreas(state), axisType, axisId);

export const selectReferenceLinesByAxis = (
  state: RechartsRootState,
  axisType: AllAxisTypes,
  axisId: AxisId,
): ReadonlyArray<ReferenceLineSettings> =>
  filterReferenceElements(selectReferenceLines(state), axisType, axisId);

export const combineDotsDomain = (
  dots: ReadonlyArray<ReferenceDotSettings> | undefined,
  axisType: AllAxisTypes,
): NumberDomain | undefined => {
  if (dots == null) {
    return undefined;
  }
  const allCoords = onlyAllowNumbers(dots.map((dot) => (axisType === "xAxis" ? dot.x : dot.y)));
  if (allCoords.length === 0) {
    return undefined;
  }
  return [Math.min(...allCoords), Math.max(...allCoords)];
};

export const combineAreasDomain = (
  areas: ReadonlyArray<ReferenceAreaSettings> | undefined,
  axisType: AllAxisTypes,
): NumberDomain | undefined => {
  if (areas == null) {
    return undefined;
  }
  const allCoords = onlyAllowNumbers(
    areas.flatMap((area) => [
      axisType === "xAxis" ? area.x1 : area.y1,
      axisType === "xAxis" ? area.x2 : area.y2,
    ]),
  );
  if (allCoords.length === 0) {
    return undefined;
  }
  return [Math.min(...allCoords), Math.max(...allCoords)];
};

function extractXCoordinates(line: ReferenceLineSettings): ReadonlyArray<number> {
  if (line.x != null) {
    return onlyAllowNumbers([line.x]);
  }
  const segmentCoordinates = line.segment?.map((s) => s.x);
  if (segmentCoordinates == null || segmentCoordinates.length === 0) {
    return [];
  }
  return onlyAllowNumbers(segmentCoordinates);
}

function extractYCoordinates(line: ReferenceLineSettings): ReadonlyArray<number> {
  if (line.y != null) {
    return onlyAllowNumbers([line.y]);
  }
  const segmentCoordinates = line.segment?.map((s) => s.y);
  if (segmentCoordinates == null || segmentCoordinates.length === 0) {
    return [];
  }
  return onlyAllowNumbers(segmentCoordinates);
}

export const combineLinesDomain = (
  lines: ReadonlyArray<ReferenceLineSettings> | undefined,
  axisType: AllAxisTypes,
): NumberDomain | undefined => {
  if (lines == null) {
    return undefined;
  }
  const allCoords: ReadonlyArray<number> = lines.flatMap((line) =>
    axisType === "xAxis" ? extractXCoordinates(line) : extractYCoordinates(line),
  );
  if (allCoords.length === 0) {
    return undefined;
  }
  return [Math.min(...allCoords), Math.max(...allCoords)];
};

const selectReferenceElementsDomain = (
  state: RechartsRootState,
  axisType: AllAxisTypes,
  axisId: AxisId,
): NumberDomain | undefined => {
  const dotsDomain = combineDotsDomain(
    selectReferenceDotsByAxis(state, axisType, axisId),
    axisType,
  );
  const areasDomain = combineAreasDomain(
    selectReferenceAreasByAxis(state, axisType, axisId),
    axisType,
  );
  const linesDomain = combineLinesDomain(
    selectReferenceLinesByAxis(state, axisType, axisId),
    axisType,
  );
  return mergeDomains(dotsDomain, areasDomain, linesDomain);
};

export const getDomainDefinition = (axisSettings: AllAxisSettings): AxisDomain => {
  if (axisSettings == null || !("domain" in axisSettings)) {
    return defaultNumericDomain;
  }

  if (axisSettings.domain != null) {
    return axisSettings.domain;
  }
  if ("ticks" in axisSettings && axisSettings.ticks != null) {
    if (axisSettings.type === "number") {
      const allValues = onlyAllowNumbers(axisSettings.ticks);
      return [Math.min(...allValues), Math.max(...allValues)];
    }
    if (axisSettings.type === "category") {
      return axisSettings.ticks.map(String);
    }
  }
  return axisSettings?.domain ?? defaultNumericDomain;
};

export const selectDomainDefinition = (
  state: RechartsRootState,
  axisType: AllAxisTypes,
  axisId: AxisId,
): AxisDomain => getDomainDefinition(selectBaseAxis(state, axisType, axisId));

const selectAllowsDataOverflow = (
  state: RechartsRootState,
  axisType: AllAxisTypes,
  axisId: AxisId,
): boolean => selectBaseAxis(state, axisType, axisId).allowDataOverflow;

export const selectDomainFromUserPreference = (
  state: RechartsRootState,
  axisType: AllAxisTypes,
  axisId: AxisId,
): NumberDomain | undefined =>
  numericalDomainSpecifiedWithoutRequiringData(
    selectDomainDefinition(state, axisType, axisId),
    selectAllowsDataOverflow(state, axisType, axisId),
  );

// Stacks: graphical items sharing a `stackId` stack on each other, extending the
// numerical domain. Ported from recharts' selectStackedCartesianItemsSettings →
// selectDisplayedStackedData → selectStackGroups → selectDomainOfStackGroups chain
// (reselect createSelectors → plain functions; memoization from useAppSelector).

/** Cartesian items (Bar/Area) that are actually stacked (have stackId + dataKey). */
export const selectStackedCartesianItemsSettings: (
  state: RechartsRootState,
  axisType: AllAxisTypes,
  axisId: AxisId,
) => ReadonlyArray<DefinitelyStackedGraphicalItem> = createSelector(
  [selectCartesianItemsSettings],
  (cartesianItems): ReadonlyArray<DefinitelyStackedGraphicalItem> =>
    cartesianItems.filter((item) => item.type === "area" || item.type === "bar").filter(isStacked),
);

const selectTooltipAxisForStacks = (state: RechartsRootState): BaseCartesianAxis =>
  selectRenderableAxisSettings(state, selectTooltipAxisType(state), selectTooltipAxisId(state));

export const selectDisplayedStackedData: (
  state: RechartsRootState,
  axisType: AllAxisTypes,
  axisId: AxisId,
  isPanorama: boolean,
) => DisplayedStackedData = createSelector(
  [
    selectStackedCartesianItemsSettings,
    selectChartDataWithIndexesIfNotInPanoramaPosition4,
    selectTooltipAxisForStacks,
  ],
  combineDisplayedStackedData,
);

export const combineStackGroups = (
  displayedData: DisplayedStackedData,
  items: ReadonlyArray<DefinitelyStackedGraphicalItem>,
  stackOffsetType: StackOffsetType,
  reverseStackOrder: boolean,
): AllStackGroups => {
  const itemsGroup: Record<StackId, Array<DefinitelyStackedGraphicalItem>> = {};
  items.forEach((item) => {
    if (item.stackId == null) {
      return;
    }
    const stack = itemsGroup[item.stackId] ?? [];
    stack.push(item);
    itemsGroup[item.stackId] = stack;
  });

  return Object.fromEntries(
    Object.entries(itemsGroup).map(([stackId, graphicalItems]): [StackId, StackGroup] => {
      const orderedGraphicalItems = reverseStackOrder
        ? [...graphicalItems].reverse()
        : graphicalItems;
      const dataKeys = orderedGraphicalItems.map((item) => getStackSeriesIdentifier(item));
      return [
        stackId,
        {
          stackedData: getStackedData(displayedData, dataKeys, stackOffsetType),
          graphicalItems: orderedGraphicalItems,
        },
      ];
    }),
  );
};

/**
 * Stack groups are groups of graphical items that stack on each other, keyed by
 * stack ID. Items without a stack ID do not appear.
 */
export const selectStackGroups: (
  state: RechartsRootState,
  axisType: AllAxisTypes,
  axisId: AxisId,
  isPanorama: boolean,
) => AllStackGroups = createSelector(
  [
    selectDisplayedStackedData,
    selectStackedCartesianItemsSettings,
    selectStackOffsetType,
    selectReverseStackOrder,
  ],
  combineStackGroups,
);

export const combineDomainOfStackGroups = (
  stackGroups: AllStackGroups | undefined,
  { dataStartIndex, dataEndIndex }: ChartDataState,
  axisType: AllAxisTypes,
  domainFromUserPreference: NumberDomain | undefined,
): NumberDomain | undefined => {
  if (domainFromUserPreference != null) {
    return undefined;
  }
  if (axisType === "zAxis") {
    return undefined;
  }
  return getDomainOfStackGroups(stackGroups, dataStartIndex, dataEndIndex);
};

export const selectDomainOfStackGroups: (
  state: RechartsRootState,
  axisType: AllAxisTypes,
  axisId: AxisId,
  isPanorama: boolean,
) => NumberDomain | undefined = createSelector(
  [selectStackGroups, selectChartDataWithIndexes, pickAxisTypeArg, selectDomainFromUserPreference],
  combineDomainOfStackGroups,
  { resultEqualityCheck: numberDomainEqualityCheck },
);

export const combineNumericalDomain = (
  axisSettings: BaseCartesianAxis,
  domainDefinition: AxisDomain | undefined,
  domainFromUserPreference: NumberDomain | undefined,
  domainOfStackGroups: NumberDomain | undefined,
  dataAndErrorBarsDomain: NumberDomain | undefined,
  referenceElementsDomain: NumberDomain | undefined,
  layout: LayoutType,
  axisType: AllAxisTypes,
  numericTicksDomain?: NumberDomain,
): NumberDomain | undefined => {
  if (domainFromUserPreference != null) {
    return domainFromUserPreference;
  }

  // Polar branches verified against released recharts: stacked RadialBars extend
  // the numeric axis (angle axis in radial layout, radius axis in centric layout)
  // to the stack total — e.g. shadcn's radial-stacked fills [0, total] exactly.
  const shouldIncludeDomainOfStackGroups =
    (layout === "vertical" && axisType === "xAxis") ||
    (layout === "horizontal" && axisType === "yAxis") ||
    (layout === "radial" && axisType === "angleAxis") ||
    (layout === "centric" && axisType === "radiusAxis");

  const mergedDomains = shouldIncludeDomainOfStackGroups
    ? mergeDomains(domainOfStackGroups, referenceElementsDomain, dataAndErrorBarsDomain)
    : mergeDomains(referenceElementsDomain, dataAndErrorBarsDomain);

  const parsedDomain = parseNumericalUserDomain(
    domainDefinition,
    mergedDomains,
    axisSettings.allowDataOverflow,
  );
  if (parsedDomain != null) {
    return parsedDomain;
  }

  /*
   * https://github.com/recharts/recharts/issues/7362
   * The user-provided domain could not be resolved without data - it's a function
   * bound or one of 'auto'/'dataMin'/'dataMax' - and there is no data domain to
   * resolve it from: empty or all-null data, and no domain-extending reference
   * elements (only reference dots/lines/areas with ifOverflow="extendDomain"
   * contribute to mergedDomains). If the
   * axis opted into data overflow and supplied an explicit numeric `ticks` array,
   * fall back to the ticks' [min, max] extent so the explicit tick ladder still
   * renders, mirroring what a literal numeric domain already does.
   */
  if (axisSettings.allowDataOverflow && mergedDomains == null && numericTicksDomain != null) {
    return numericTicksDomain;
  }

  return parsedDomain;
};

/**
 * https://github.com/recharts/recharts/issues/7362
 * Derives the [min, max] extent of an axis's explicit numeric `ticks`. Used by
 * {@link combineNumericalDomain} as a last-resort domain when a non-literal domain
 * cannot be resolved without data. Returns undefined for non-number axes, or when
 * no numeric ticks were supplied.
 */
export const combineNumericTicksDomain = (
  axisSettings: AllAxisSettings,
): NumberDomain | undefined => {
  if (
    axisSettings == null ||
    axisSettings.type !== "number" ||
    !("ticks" in axisSettings) ||
    axisSettings.ticks == null
  ) {
    return undefined;
  }
  const numericTicks = onlyAllowNumbers(axisSettings.ticks);
  if (numericTicks.length === 0) {
    return undefined;
  }
  return [Math.min(...numericTicks), Math.max(...numericTicks)];
};

export const selectNumericTicksDomain: (
  state: RechartsRootState,
  axisType: AllAxisTypes,
  axisId: AxisId,
) => NumberDomain | undefined = createSelector([selectBaseAxis], combineNumericTicksDomain, {
  resultEqualityCheck: numberDomainEqualityCheck,
});

export const selectNumericalDomain: (
  state: RechartsRootState,
  axisType: AllAxisTypes,
  axisId: AxisId,
  isPanorama: boolean,
) => NumberDomain | undefined = createSelector(
  [
    selectBaseAxis,
    selectDomainDefinition,
    selectDomainFromUserPreference,
    selectDomainOfStackGroups,
    selectDomainOfAllAppliedNumericalValuesIncludingErrorValues,
    selectReferenceElementsDomain,
    selectChartLayout,
    pickAxisTypeArg,
    selectNumericTicksDomain,
  ],
  combineNumericalDomain,
  { resultEqualityCheck: numberDomainEqualityCheck },
);

/**
 * Expand maps everything between 0 and 1; nothing to compute.
 * @see https://d3js.org/d3-shape/stack#stack-offsets
 */
const expandDomain: NumberDomain = [0, 1];

export const combineAxisDomain = (
  axisSettings: BaseCartesianAxis,
  layout: LayoutType,
  displayedData: ChartData | undefined,
  allAppliedValues: AppliedChartData,
  stackOffsetType: StackOffsetType,
  axisType: AllAxisTypes,
  numericalDomain: NumberDomain | undefined,
): NumberDomain | CategoricalDomain | undefined => {
  if (
    (axisSettings == null || displayedData == null || displayedData.length === 0) &&
    numericalDomain === undefined
  ) {
    return undefined;
  }
  const { dataKey, type } = axisSettings;
  const isCategorical = isCategoricalAxis(layout, axisType);

  if (isCategorical && dataKey == null) {
    return range(0, displayedData?.length ?? 0);
  }

  if (type === "category") {
    return computeDomainOfTypeCategory(allAppliedValues, axisSettings, isCategorical);
  }

  if (stackOffsetType === "expand" && !isCategorical) {
    return expandDomain;
  }
  return numericalDomain;
};

export const selectAxisDomain: (
  state: RechartsRootState,
  axisType: AllAxisTypes,
  axisId: AxisId,
  isPanorama: boolean,
) => NumberDomain | CategoricalDomain | undefined = createSelector(
  [
    selectBaseAxis,
    selectChartLayout,
    selectDisplayedData,
    selectAllAppliedValues,
    selectStackOffsetType,
    pickAxisTypeArg,
    selectNumericalDomain,
  ],
  combineAxisDomain,
);

export const selectRealScaleType: (
  state: RechartsRootState,
  axisType: AllAxisTypes,
  axisId: AxisId,
) => RechartsScaleType | undefined = createSelector(
  [selectBaseAxis, selectHasBar, selectChartName],
  combineRealScaleType,
);

export const combineNiceTicks = (
  axisDomain: NumberDomain | CategoricalDomain | undefined,
  axisSettings: RenderableAxisSettings,
  realScaleType: string | undefined,
): ReadonlyArray<number> | undefined => {
  const { niceTicks } = axisSettings;

  if (niceTicks === "none") {
    return undefined;
  }

  const domainDefinition: AxisDomain = getDomainDefinition(axisSettings);
  const hasDomainAutoKeyword =
    Array.isArray(domainDefinition) &&
    (domainDefinition[0] === "auto" || domainDefinition[1] === "auto");

  if (
    (niceTicks === "snap125" || niceTicks === "adaptive") &&
    axisSettings != null &&
    axisSettings.tickCount &&
    isWellFormedNumberDomain(axisDomain)
  ) {
    if (hasDomainAutoKeyword) {
      return getNiceTickValues(
        axisDomain,
        axisSettings.tickCount,
        axisSettings.allowDecimals,
        niceTicks,
      );
    }
    if (axisSettings.type === "number") {
      return getTickValuesFixedDomain(
        axisDomain,
        axisSettings.tickCount,
        axisSettings.allowDecimals,
        niceTicks,
      );
    }
  }

  if (
    niceTicks === "auto" &&
    realScaleType === "linear" &&
    axisSettings != null &&
    axisSettings.tickCount
  ) {
    if (hasDomainAutoKeyword && isWellFormedNumberDomain(axisDomain)) {
      return getNiceTickValues(
        axisDomain,
        axisSettings.tickCount,
        axisSettings.allowDecimals,
        "adaptive",
      );
    }

    if (axisSettings.type === "number" && isWellFormedNumberDomain(axisDomain)) {
      return getTickValuesFixedDomain(
        axisDomain,
        axisSettings.tickCount,
        axisSettings.allowDecimals,
        "adaptive",
      );
    }
  }

  return undefined;
};

export const selectNiceTicks: (
  state: RechartsRootState,
  axisType: RenderableAxisType,
  axisId: AxisId,
  isPanorama: boolean,
) => ReadonlyArray<number> | undefined = createSelector(
  [selectAxisDomain, selectRenderableAxisSettings, selectRealScaleType],
  combineNiceTicks,
);

export const combineAxisDomainWithNiceTicks = (
  axisSettings: BaseCartesianAxis,
  domain: NumberDomain | CategoricalDomain | undefined,
  niceTicks: ReadonlyArray<number> | undefined,
  axisType: RenderableAxisType,
): NumberDomain | CategoricalDomain | undefined => {
  if (
    axisType !== "angleAxis" &&
    axisSettings?.type === "number" &&
    isWellFormedNumberDomain(domain) &&
    // `niceTicks != null` (not `Array.isArray`) keeps the `number` element type:
    // `Array.isArray` widens a readonly array union to `any[]` (TS limitation).
    niceTicks != null &&
    niceTicks.length > 0
  ) {
    const minFromDomain = domain[0];
    const minFromTicks = niceTicks[0] ?? 0;
    const maxFromDomain = domain[1];
    const maxFromTicks = niceTicks[niceTicks.length - 1] ?? 0;
    return [Math.min(minFromDomain, minFromTicks), Math.max(maxFromDomain, maxFromTicks)];
  }
  return domain;
};

export const selectAxisDomainIncludingNiceTicks: (
  state: RechartsRootState,
  axisType: RenderableAxisType,
  axisId: AxisId,
  isPanorama: boolean,
) => NumberDomain | CategoricalDomain | undefined = createSelector(
  [selectBaseAxis, selectAxisDomain, selectNiceTicks, pickRenderableAxisType],
  combineAxisDomainWithNiceTicks,
);

/**
 * Smallest gap between two data numbers as a ratio of the whole range (0..1).
 * Ignores any user domain; only considers domain from data.
 */
export const selectSmallestDistanceBetweenValues = (
  state: RechartsRootState,
  axisType: RenderableAxisType,
  axisId: AxisId,
  isPanorama: boolean,
): number | undefined => {
  const axisSettings = selectBaseAxis(state, axisType, axisId);
  if (!axisSettings || axisSettings.type !== "number") {
    return undefined;
  }
  const allDataSquished = selectAllAppliedValues(state, axisType, axisId, isPanorama);
  let smallestDistanceBetweenValues = Infinity;
  const sortedValues = Array.from(onlyAllowNumbers(allDataSquished.map((d) => d.value))).sort(
    (a, b) => a - b,
  );
  const first = sortedValues[0];
  const last = sortedValues[sortedValues.length - 1];
  if (first == null || last == null) {
    return Infinity;
  }
  const diff = last - first;
  if (diff === 0) {
    return Infinity;
  }
  for (let i = 0; i < sortedValues.length - 1; i++) {
    const curr = sortedValues[i];
    const next = sortedValues[i + 1];
    if (curr == null || next == null) {
      continue;
    }
    const distance = next - curr;
    smallestDistanceBetweenValues = Math.min(smallestDistanceBetweenValues, distance);
  }
  return smallestDistanceBetweenValues / diff;
};

const selectCalculatedPadding = (
  state: RechartsRootState,
  axisType: RenderableAxisType,
  axisId: AxisId,
  isPanorama: boolean,
  padding: string,
): number => {
  const smallestDistanceInPercent = selectSmallestDistanceBetweenValues(
    state,
    axisType,
    axisId,
    isPanorama,
  );
  if (!isWellBehavedNumber(smallestDistanceInPercent)) {
    return 0;
  }
  const layout = selectChartLayout(state);
  const barCategoryGap = selectBarCategoryGap(state);
  const offset = selectChartOffsetInternal(state);
  const rangeWidth = layout === "vertical" ? offset.height : offset.width;

  if (padding === "gap") {
    return (smallestDistanceInPercent * rangeWidth) / 2;
  }

  if (padding === "no-gap") {
    const gap = getPercentValue(barCategoryGap, smallestDistanceInPercent * rangeWidth);
    const halfBand = (smallestDistanceInPercent * rangeWidth) / 2;
    return halfBand - gap - ((halfBand - gap) / rangeWidth) * gap;
  }

  return 0;
};

export const selectCalculatedXAxisPadding = (
  state: RechartsRootState,
  axisId: AxisId,
  isPanorama: boolean,
): number => {
  const xAxisSettings = selectXAxisSettings(state, axisId);
  if (xAxisSettings == null || typeof xAxisSettings.padding !== "string") {
    return 0;
  }
  return selectCalculatedPadding(state, "xAxis", axisId, isPanorama, xAxisSettings.padding);
};

export const selectCalculatedYAxisPadding = (
  state: RechartsRootState,
  axisId: AxisId,
  isPanorama: boolean,
): number => {
  const yAxisSettings = selectYAxisSettings(state, axisId);
  if (yAxisSettings == null || typeof yAxisSettings.padding !== "string") {
    return 0;
  }
  return selectCalculatedPadding(state, "yAxis", axisId, isPanorama, yAxisSettings.padding);
};

const selectXAxisPadding = (
  state: RechartsRootState,
  axisId: AxisId,
  isPanorama: boolean,
): { left: number; right: number } => {
  const xAxisSettings = selectXAxisSettings(state, axisId);
  const calculated = selectCalculatedXAxisPadding(state, axisId, isPanorama);
  if (xAxisSettings == null) {
    return { left: 0, right: 0 };
  }
  const { padding } = xAxisSettings;
  if (typeof padding === "string") {
    return { left: calculated, right: calculated };
  }
  return {
    left: (padding.left ?? 0) + calculated,
    right: (padding.right ?? 0) + calculated,
  };
};

const selectYAxisPadding = (
  state: RechartsRootState,
  axisId: AxisId,
  isPanorama: boolean,
): { top: number; bottom: number } => {
  const yAxisSettings = selectYAxisSettings(state, axisId);
  const calculated = selectCalculatedYAxisPadding(state, axisId, isPanorama);
  if (yAxisSettings == null) {
    return { top: 0, bottom: 0 };
  }
  const { padding } = yAxisSettings;
  if (typeof padding === "string") {
    return { top: calculated, bottom: calculated };
  }
  return {
    top: (padding.top ?? 0) + calculated,
    bottom: (padding.bottom ?? 0) + calculated,
  };
};

export const selectXAxisRange = (
  state: RechartsRootState,
  axisId: AxisId,
  isPanorama: boolean,
): AxisRange | undefined => {
  const padding = selectXAxisPadding(state, axisId, isPanorama);
  if (isPanorama) {
    // The Brush panorama renders in its own Surface (0-origin) sized to the brush
    // rect; the plot spans the brush width minus the brush padding (its margin).
    const dims = selectBrushDimensions(state);
    const brushPadding = state.brush.padding;
    return [brushPadding.left + padding.left, dims.width - brushPadding.right - padding.right];
  }
  const offset = selectChartOffsetInternal(state);
  return [offset.left + padding.left, offset.left + offset.width - padding.right];
};

export const selectYAxisRange = (
  state: RechartsRootState,
  axisId: AxisId,
  isPanorama: boolean,
): AxisRange | undefined => {
  const layout = selectChartLayout(state);
  const padding = selectYAxisPadding(state, axisId, isPanorama);
  if (isPanorama) {
    const dims = selectBrushDimensions(state);
    const brushPadding = state.brush.padding;
    const top = brushPadding.top + padding.top;
    const bottom = dims.height - brushPadding.bottom - padding.bottom;
    // Value axis grows upward → range is [bottom, top]; the panorama is horizontal.
    return [bottom, top];
  }
  const offset = selectChartOffsetInternal(state);
  if (layout === "horizontal") {
    return [offset.top + offset.height - padding.bottom, offset.top + padding.top];
  }
  return [offset.top + padding.top, offset.top + offset.height - padding.bottom];
};

const computeAxisRange = (
  state: RechartsRootState,
  axisType: AllAxisTypes,
  axisId: AxisId,
  isPanorama: boolean,
): AxisRange | undefined => {
  switch (axisType) {
    case "xAxis":
      return selectXAxisRange(state, axisId, isPanorama);
    case "yAxis":
      return selectYAxisRange(state, axisId, isPanorama);
    case "zAxis":
      return selectZAxisSettings(state, axisId)?.range;
    case "angleAxis":
      return selectAngleAxisRange(state);
    case "radiusAxis":
      return selectRadiusAxisRange(state, axisId);
    default:
      return undefined;
  }
};

// The range tuple is rebuilt fresh from offset/padding on every call; this
// identity wrapper (ADR-0002) applies content-equality so callers get a stable
// reference when the plot range is unchanged — otherwise the tick/scale chain
// above rebuilds per consumer per mousemove frame.
export const selectAxisRange: (
  state: RechartsRootState,
  axisType: AllAxisTypes,
  axisId: AxisId,
  isPanorama: boolean,
) => AxisRange | undefined = createSelector([computeAxisRange], (range) => range, {
  resultEqualityCheck: (a, b) =>
    a == null || b == null ? a === b : arrayContentsAreEqualCheck(a, b),
});

export const selectAxisRangeWithReverse: (
  state: RechartsRootState,
  axisType: AllAxisTypes,
  axisId: AxisId,
  isPanorama: boolean,
) => AxisRange | undefined = createSelector(
  [selectBaseAxis, selectAxisRange],
  combineAxisRangeWithReverse,
  // The range tuple is recomputed fresh each call (from offset/padding) but only
  // its VALUES matter; content-equality returns the prior reference when the plot
  // range is unchanged (e.g. across a mousemove), so the scale/ticks chain above
  // stays cache-stable instead of rebuilding a d3 scale per consumer per frame.
  {
    resultEqualityCheck: (a, b) =>
      a == null || b == null ? a === b : arrayContentsAreEqualCheck(a, b),
  },
);

export const selectCheckedAxisDomain: (
  state: RechartsRootState,
  axisType: RenderableAxisType,
  axisId: AxisId,
  isPanorama: boolean,
) => NumberDomain | CategoricalDomain | undefined = createSelector(
  [selectRealScaleType, selectAxisDomainIncludingNiceTicks],
  combineCheckedDomain,
);

const selectConfiguredScale: (
  state: RechartsRootState,
  axisType: RenderableAxisType,
  axisId: AxisId,
  isPanorama: boolean,
) => CustomScaleDefinition | undefined = createSelector(
  [selectBaseAxis, selectRealScaleType, selectCheckedAxisDomain, selectAxisRangeWithReverse],
  combineConfiguredScale,
);

export const combineCategoricalDomain = (
  layout: LayoutType,
  appliedValues: AppliedChartData,
  axis: RenderableAxisSettings,
  axisType: RenderableAxisType,
): ReadonlyArray<unknown> | undefined => {
  if (axis == null || axis.dataKey == null) {
    return undefined;
  }
  const { type, scale } = axis;
  const isCategorical = isCategoricalAxis(layout, axisType);
  if (isCategorical && (type === "number" || scale !== "auto")) {
    return appliedValues.map((d) => d.value);
  }
  return undefined;
};

export const selectCategoricalDomain: (
  state: RechartsRootState,
  axisType: RenderableAxisType,
  axisId: AxisId,
  isPanorama: boolean,
) => ReadonlyArray<unknown> | undefined = createSelector(
  [selectChartLayout, selectAllAppliedValues, selectRenderableAxisSettings, pickRenderableAxisType],
  combineCategoricalDomain,
);

export const selectAxisScale: (
  state: RechartsRootState,
  axisType: RenderableAxisType,
  axisId: AxisId,
  isPanorama: boolean,
) => RechartsScale | undefined = createSelector([selectConfiguredScale], rechartsScaleFactory);

/** The ticks the axis component actually rendered (from the renderedTicks slice). */
export const selectRenderedTicksOfAxis = (
  state: RechartsRootState,
  axisType: "xAxis" | "yAxis",
  axisId: AxisId,
): ReadonlyArray<TickItem> | undefined => state.renderedTicks[axisType]?.[axisId];

/**
 * Maps a pixel coordinate back to a data value (the inverse of the axis scale).
 * Continuous scales invert; categorical scales snap to the nearest category.
 */
export const selectAxisInverseScale: (
  state: RechartsRootState,
  axisType: RenderableAxisType,
  axisId: AxisId,
  isPanorama: boolean,
) => InverseScaleFunction | undefined = createSelector(
  [selectConfiguredScale],
  combineInverseScaleFunction,
);

/** Inverse scale that snaps a pixel coordinate to the nearest rendered tick value. */
export const selectAxisInverseTickSnapScale = (
  state: RechartsRootState,
  axisType: "xAxis" | "yAxis",
  axisId: AxisId,
): InverseScaleFunction | undefined => {
  const ticks = selectRenderedTicksOfAxis(state, axisType, axisId);
  if (!ticks || ticks.length === 0) {
    return undefined;
  }
  return (pixelValue: number): unknown => {
    let minDistance = Infinity;
    let closestTick: TickItem | undefined = ticks[0];
    for (const tick of ticks) {
      const distance = Math.abs(tick.coordinate - pixelValue);
      if (distance < minDistance) {
        minDistance = distance;
        closestTick = tick;
      }
    }
    return closestTick?.value;
  };
};

export const combineDuplicateDomain = (
  chartLayout: LayoutType,
  appliedValues: AppliedChartData,
  axis: BaseCartesianAxis,
  axisType: AllAxisTypes,
): ReadonlyArray<unknown> | undefined => {
  if (axis == null) {
    return undefined;
  }
  const { allowDuplicatedCategory, type, dataKey } = axis;
  const isCategorical = isCategoricalAxis(chartLayout, axisType);
  const allData = appliedValues.map((av) => av.value);
  const validData = allData.filter((v) => v != null);
  if (
    dataKey &&
    isCategorical &&
    type === "category" &&
    allowDuplicatedCategory &&
    hasDuplicate(validData)
  ) {
    return allData;
  }
  return undefined;
};

export const selectDuplicateDomain: (
  state: RechartsRootState,
  axisType: AllAxisTypes,
  axisId: AxisId,
  isPanorama: boolean,
) => ReadonlyArray<unknown> | undefined = createSelector(
  [selectChartLayout, selectAllAppliedValues, selectBaseAxis, pickAxisTypeArg],
  combineDuplicateDomain,
);

/**
 * One of four near-identical tick generators. This one feeds graphical items
 * (e.g. <Line>) rather than the rendered axis ticks.
 */
export const combineGraphicalItemTicks = (
  layout: LayoutType,
  axis: RenderableAxisSettings,
  scale: RechartsScale | undefined,
  axisRange: AxisRange | undefined,
  duplicateDomain: ReadonlyArray<unknown> | undefined,
  categoricalDomain: ReadonlyArray<unknown> | undefined,
  axisType: RenderableAxisType,
): TickItem[] | undefined => {
  if (axis == null || scale == null || axisRange == null || axisRange[0] === axisRange[1]) {
    return undefined;
  }
  const isCategorical = isCategoricalAxis(layout, axisType);

  const { tickCount } = axis;

  const offset = 0;
  // angleAxis adjusts offset by range direction; deferred (polar).

  if (isCategorical && categoricalDomain) {
    return categoricalDomain
      .map((entry: unknown, index: number): TickItem | null => {
        const scaled = scale.map(entry);
        if (!isWellBehavedNumber(scaled)) {
          return null;
        }
        return {
          coordinate: scaled + offset,
          value: entry,
          index,
          offset,
        };
      })
      .filter(isNotNil);
  }

  if (scale.ticks) {
    return scale
      .ticks(tickCount)
      .map((entry: number, index: number): TickItem | null => {
        const scaled = scale.map(entry);
        if (!isWellBehavedNumber(scaled)) {
          return null;
        }
        return { coordinate: scaled + offset, value: entry, index, offset };
      })
      .filter(isNotNil);
  }

  // When axis has duplicated text, serial numbers are used to generate scale.
  return scale
    .domain()
    .map((entry: CategoricalDomainItem, index: number): TickItem | null => {
      const scaled = scale.map(entry);
      if (!isWellBehavedNumber(scaled)) {
        return null;
      }
      // Deviation: reference indexes `duplicateDomain[entry]` with a
      // `@ts-expect-error`; the serial case only ever has a numeric `entry`, so
      // guard on that instead of asserting.
      const value =
        duplicateDomain != null && typeof entry === "number" ? duplicateDomain[entry] : entry;
      return {
        coordinate: scaled + offset,
        value,
        index,
        offset,
      };
    })
    .filter(isNotNil);
};

export const selectTicksOfGraphicalItem: (
  state: RechartsRootState,
  axisType: RenderableAxisType,
  axisId: AxisId,
  isPanorama: boolean,
) => TickItem[] | undefined = createSelector(
  [
    selectChartLayout,
    selectRenderableAxisSettings,
    selectAxisScale,
    selectAxisRange,
    selectDuplicateDomain,
    selectCategoricalDomain,
    pickRenderableAxisType,
  ],
  combineGraphicalItemTicks,
);

export const selectAxisWithScale = (
  state: RechartsRootState,
  axisType: RenderableAxisType,
  axisId: AxisId,
  isPanorama: boolean,
): BaseAxisWithScale | undefined => {
  const axis = selectBaseAxis(state, axisType, axisId);
  const scale = selectAxisScale(state, axisType, axisId, isPanorama);
  if (axis == null || scale == null) {
    return undefined;
  }
  return {
    ...axis,
    scale,
  };
};

/**
 * The size of an axis along its primary dimension (X axis → width, Y axis →
 * height). Deviation: recharts derives this from selectXAxisSize/selectYAxisSize
 * (which add tick/label measurement); until those land it's the plot-area span
 * from the (axis-aware) offset — correct for the bar-size percentage math.
 */
export const selectCartesianAxisSize = (
  state: RechartsRootState,
  axisType: RenderableAxisType,
  _axisId: AxisId,
): number | undefined => {
  const offset = selectChartOffsetInternal(state);
  switch (axisType) {
    case "xAxis":
      return offset.width;
    case "yAxis":
      return offset.height;
    default:
      return undefined;
  }
};

// Re-export tick-item alias used by some consumers.
export type { CartesianTickItem, AxisTick };

// ---------------------------------------------------------------------------
// Axis RENDER selectors: position, size, and the rendered ticks that CartesianAxis
// (via XAxis/YAxis) draws. Ported from recharts; the multi-axis offset-steps
// machinery stacks axes of the same orientation/mirror.
// ---------------------------------------------------------------------------

function compareIds(a: CartesianAxisSettings, b: CartesianAxisSettings): number {
  if (a.id < b.id) {
    return -1;
  }
  if (a.id > b.id) {
    return 1;
  }
  return 0;
}

const getXAxisSize = (offset: ChartOffsetInternal, axisSettings: XAxisSettings): Size => ({
  width: offset.width,
  height: axisSettings.height,
});

const getYAxisSize = (offset: ChartOffsetInternal, axisSettings: YAxisSettings): Size => {
  const width = typeof axisSettings.width === "number" ? axisSettings.width : DEFAULT_Y_AXIS_WIDTH;
  return { width, height: offset.height };
};

export const selectXAxisSize = (state: RechartsRootState, xAxisId: AxisId): Size =>
  getXAxisSize(selectChartOffsetInternal(state), selectXAxisSettings(state, xAxisId));

export const selectYAxisSize = (state: RechartsRootState, yAxisId: AxisId): Size =>
  getYAxisSize(selectChartOffsetInternal(state), selectYAxisSettings(state, yAxisId));

type AxisOffsetSteps = Record<AxisId, number>;

const selectAllXAxesWithOffsetType = (
  state: RechartsRootState,
  orientation: XAxisOrientation,
  mirror: boolean,
): ReadonlyArray<XAxisSettings> =>
  selectAllXAxes(state)
    .filter((axis) => axis.orientation === orientation)
    .filter((axis) => axis.mirror === mirror)
    .slice()
    .sort(compareIds);

const selectAllYAxesWithOffsetType = (
  state: RechartsRootState,
  orientation: YAxisOrientation,
  mirror: boolean,
): ReadonlyArray<YAxisSettings> =>
  selectAllYAxes(state)
    .filter((axis) => axis.orientation === orientation)
    .filter((axis) => axis.mirror === mirror)
    .slice()
    .sort(compareIds);

const combineXAxisPositionStartingPoint = (
  offset: ChartOffsetInternal,
  orientation: XAxisOrientation,
  chartHeight: number,
): number => {
  switch (orientation) {
    case "top":
      return offset.top;
    case "bottom":
      return chartHeight - offset.bottom;
    default:
      return 0;
  }
};

const combineYAxisPositionStartingPoint = (
  offset: ChartOffsetInternal,
  orientation: YAxisOrientation,
  chartWidth: number,
): number => {
  switch (orientation) {
    case "left":
      return offset.left;
    case "right":
      return chartWidth - offset.right;
    default:
      return 0;
  }
};

const selectAllXAxesOffsetSteps = (
  state: RechartsRootState,
  orientation: XAxisOrientation,
  mirror: boolean,
): AxisOffsetSteps => {
  const chartHeight = selectChartHeight(state);
  const offset = selectChartOffsetInternal(state);
  const allAxesWithSameOffsetType = selectAllXAxesWithOffsetType(state, orientation, mirror);
  const steps: AxisOffsetSteps = {};
  let position: number | undefined;
  allAxesWithSameOffsetType.forEach((axis) => {
    const axisSize = getXAxisSize(offset, axis);
    if (position == null) {
      position = combineXAxisPositionStartingPoint(offset, orientation, chartHeight);
    }
    const needSpace = (orientation === "top" && !mirror) || (orientation === "bottom" && mirror);
    steps[axis.id] = position - Number(needSpace) * axisSize.height;
    position += (needSpace ? -1 : 1) * axisSize.height;
  });
  return steps;
};

const selectAllYAxesOffsetSteps = (
  state: RechartsRootState,
  orientation: YAxisOrientation,
  mirror: boolean,
): AxisOffsetSteps => {
  const chartWidth = selectChartWidth(state);
  const offset = selectChartOffsetInternal(state);
  const allAxesWithSameOffsetType = selectAllYAxesWithOffsetType(state, orientation, mirror);
  const steps: AxisOffsetSteps = {};
  let position: number | undefined;
  allAxesWithSameOffsetType.forEach((axis) => {
    const axisSize = getYAxisSize(offset, axis);
    if (position == null) {
      position = combineYAxisPositionStartingPoint(offset, orientation, chartWidth);
    }
    const needSpace = (orientation === "left" && !mirror) || (orientation === "right" && mirror);
    steps[axis.id] = position - Number(needSpace) * axisSize.width;
    position += (needSpace ? -1 : 1) * axisSize.width;
  });
  return steps;
};

export const selectXAxisPosition = (
  state: RechartsRootState,
  axisId: AxisId,
): Coordinate | undefined => {
  const offset = selectChartOffsetInternal(state);
  const axisSettings = selectXAxisSettings(state, axisId);
  if (axisSettings == null) {
    return undefined;
  }
  const allSteps = selectAllXAxesOffsetSteps(state, axisSettings.orientation, axisSettings.mirror);
  const stepOfThisAxis = allSteps[axisId];
  if (stepOfThisAxis == null) {
    return { x: offset.left, y: 0 };
  }
  return { x: offset.left, y: stepOfThisAxis };
};

export const selectYAxisPosition = (
  state: RechartsRootState,
  axisId: AxisId,
): Coordinate | undefined => {
  const offset = selectChartOffsetInternal(state);
  const axisSettings = selectYAxisSettings(state, axisId);
  if (axisSettings == null) {
    return undefined;
  }
  const allSteps = selectAllYAxesOffsetSteps(state, axisSettings.orientation, axisSettings.mirror);
  const stepOfThisAxis = allSteps[axisId];
  if (stepOfThisAxis == null) {
    return { x: 0, y: offset.top };
  }
  return { x: stepOfThisAxis, y: offset.top };
};

/**
 * The rendered ticks of an axis (one of recharts' four near-identical tick
 * generators — this is the CartesianAxis one). Ported verbatim.
 */
export const combineAxisTicks = (
  layout: LayoutType,
  axis: RenderableAxisSettings,
  realScaleType: RechartsScaleType | undefined,
  scale: RechartsScale | undefined,
  niceTicks: ReadonlyArray<number> | undefined,
  axisRange: AxisRange | undefined,
  duplicateDomain: ReadonlyArray<unknown> | undefined,
  categoricalDomain: ReadonlyArray<unknown> | undefined,
  axisType: RenderableAxisType,
): ReadonlyArray<TickItem> | undefined => {
  if (axis == null || scale == null) {
    return undefined;
  }

  const isCategorical = isCategoricalAxis(layout, axisType);
  const { type, ticks, tickCount } = axis;

  // Deviation: reference compares `realScaleType === "scaleBand"` behind a
  // `@ts-expect-error` (RechartsScaleType has no such literal — recharts notes it
  // as a quirk/dead path). `String(...)` keeps the runtime check type-safely.
  const offsetForBand =
    String(realScaleType) === "scaleBand" && typeof scale.bandwidth === "function"
      ? scale.bandwidth() / 2
      : 2;
  let offset = type === "category" && scale.bandwidth ? scale.bandwidth() / offsetForBand : 0;
  offset =
    axisType === "angleAxis" && axisRange != null && axisRange.length >= 2
      ? mathSign(axisRange[0] - axisRange[1]) * 2 * offset
      : offset;

  // User-provided ticks (or niceTicks) take precedence.
  const ticksOrNiceTicks = ticks || niceTicks;
  if (ticksOrNiceTicks) {
    return ticksOrNiceTicks
      .map((entry: AxisTick, index: number): TickItem | null => {
        const scaleContent = duplicateDomain ? duplicateDomain.indexOf(entry) : entry;
        const scaled = scale.map(scaleContent);
        if (!isWellBehavedNumber(scaled)) {
          return null;
        }
        return { index, coordinate: scaled + offset, value: entry, offset };
      })
      .filter(isNotNil);
  }

  if (isCategorical && categoricalDomain) {
    return categoricalDomain
      .map((entry: unknown, index: number): TickItem | null => {
        const scaled = scale.map(entry);
        if (!isWellBehavedNumber(scaled)) {
          return null;
        }
        return { coordinate: scaled + offset, value: entry, index, offset };
      })
      .filter(isNotNil);
  }

  if (scale.ticks) {
    return scale
      .ticks(tickCount)
      .map((entry: number, index: number): TickItem | null => {
        const scaled = scale.map(entry);
        if (!isWellBehavedNumber(scaled)) {
          return null;
        }
        return { coordinate: scaled + offset, value: entry, index, offset };
      })
      .filter(isNotNil);
  }

  return scale
    .domain()
    .map((entry: CategoricalDomainItem, index: number): TickItem | null => {
      const scaled = scale.map(entry);
      if (!isWellBehavedNumber(scaled)) {
        return null;
      }
      // Deviation: reference indexes `duplicateDomain[entry]` with `@ts-expect-error`;
      // the serial case only has numeric entries, so guard on that.
      const value =
        duplicateDomain != null && typeof entry === "number" ? duplicateDomain[entry] : entry;
      return { coordinate: scaled + offset, value, index, offset };
    })
    .filter(isNotNil);
};

export const selectTicksOfAxis = (
  state: RechartsRootState,
  axisType: RenderableAxisType,
  axisId: AxisId,
  isPanorama: boolean,
): ReadonlyArray<TickItem> | undefined =>
  combineAxisTicks(
    selectChartLayout(state),
    selectRenderableAxisSettings(state, axisType, axisId),
    selectRealScaleType(state, axisType, axisId),
    selectAxisScale(state, axisType, axisId, isPanorama),
    selectNiceTicks(state, axisType, axisId, isPanorama),
    selectAxisRange(state, axisType, axisId, isPanorama),
    selectDuplicateDomain(state, axisType, axisId, isPanorama),
    selectCategoricalDomain(state, axisType, axisId, isPanorama),
    pickAxisType(state, axisType),
  );

/**
 * The bundle of axis props that CartesianGrid passes to its coordinate
 * generators (and to the custom horizontal/vertical render-prop functions).
 * Ported from recharts' AxisPropsForCartesianGridTicksGeneration.
 */
export type AxisPropsForCartesianGridTicksGeneration = {
  angle: number;
  interval: CartesianAxisSettings["interval"];
  minTickGap: number;
  orientation: XAxisOrientation | YAxisOrientation;
  tick: CartesianAxisSettings["tick"];
  tickCount: number | undefined;
  tickFormatter: CartesianAxisSettings["tickFormatter"];
  ticks: ReadonlyArray<AxisTick> | undefined;
  type: "number" | "category";
  unit: string | undefined;
  axisType: AxisType;
  categoricalDomain: ReadonlyArray<unknown> | undefined;
  duplicateDomain: ReadonlyArray<unknown> | undefined;
  isCategorical: boolean;
  niceTicks: ReadonlyArray<number> | undefined;
  range: AxisRange | undefined;
  realScaleType: string | undefined;
  scale: RechartsScale | undefined;
};

/**
 * Builds the AxisPropsForCartesianGridTicksGeneration payload from the store —
 * the data CartesianGrid feeds to its default (and custom) coordinate
 * generators. Ported from recharts selectAxisPropsNeededForCartesianGridTicksGenerator.
 */
export const selectAxisPropsNeededForCartesianGridTicksGenerator = (
  state: RechartsRootState,
  axisType: "xAxis" | "yAxis",
  axisId: AxisId,
  isPanorama: boolean,
): AxisPropsForCartesianGridTicksGeneration | undefined => {
  const cartesianAxis: XAxisSettings | YAxisSettings =
    axisType === "xAxis" ? selectXAxisSettings(state, axisId) : selectYAxisSettings(state, axisId);
  if (cartesianAxis == null) {
    return undefined;
  }
  const layout = selectChartLayout(state);
  const isCategorical = isCategoricalAxis(layout, axisType);
  return {
    angle: cartesianAxis.angle,
    interval: cartesianAxis.interval,
    minTickGap: cartesianAxis.minTickGap,
    orientation: cartesianAxis.orientation,
    tick: cartesianAxis.tick,
    tickCount: cartesianAxis.tickCount,
    tickFormatter: cartesianAxis.tickFormatter,
    ticks: cartesianAxis.ticks,
    type: cartesianAxis.type,
    unit: cartesianAxis.unit,
    axisType,
    categoricalDomain: selectCategoricalDomain(state, axisType, axisId, isPanorama),
    duplicateDomain: selectDuplicateDomain(state, axisType, axisId, isPanorama),
    isCategorical,
    niceTicks: selectNiceTicks(state, axisType, axisId, isPanorama),
    range: selectAxisRange(state, axisType, axisId, isPanorama),
    realScaleType: selectRealScaleType(state, axisType, axisId),
    scale: selectAxisScale(state, axisType, axisId, isPanorama),
  };
};

// ---------------------------------------------------------------------------
// Z axis scale (Scatter point size). The z scale maps the z data value to a
// "size" (area); Scatter turns that into a radius. Ported from recharts.
// ---------------------------------------------------------------------------

export type ZAxisWithScale = Omit<ZAxisSettings, "scale"> & { scale: RechartsScale };

const selectZAxisScale = (state: RechartsRootState, axisId: AxisId): RechartsScale | undefined =>
  rechartsScaleFactory(
    combineConfiguredScale(
      selectBaseAxis(state, "zAxis", axisId),
      selectRealScaleType(state, "zAxis", axisId),
      selectAxisDomain(state, "zAxis", axisId, false),
      selectAxisRangeWithReverse(state, "zAxis", axisId, false),
    ),
  );

export const selectZAxisWithScale = (
  state: RechartsRootState,
  _axisType: "zAxis",
  axisId: AxisId,
  _isPanorama: boolean,
): ZAxisWithScale | undefined => {
  const axis = selectZAxisSettings(state, axisId);
  const scale = selectZAxisScale(state, axisId);
  if (axis == null || scale == null) {
    return undefined;
  }
  return { ...axis, scale };
};
