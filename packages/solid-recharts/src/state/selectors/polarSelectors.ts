// Ported from recharts 3.8.1 src/state/selectors/polarSelectors.ts (commit 7a23854).
//
// FULL SOLID-NATIVE REWRITE: reselect `createSelector` → plain functions
// (memoization via `useAppSelector`'s `createMemo`). The polar domain chain
// reuses the cartesian axis combiners keyed by the polar axis type+id (the same
// approach the reference uses).
//
// DEVIATION: `selectAllPolarAppliedNumericalValues` (an exported-but-internally-
// unused helper returning the applied-value+errorDomain array) is omitted — the
// numerical domain calls `combineDomainOfAllAppliedNumericalValuesIncludingErrorValues`
// directly, so the helper is dead weight. Polar charts have no error bars.
import { RechartsRootState } from "../store";
import { AxisId } from "../cartesianAxisSlice";
import { PolarGraphicalItemSettings } from "../graphicalItemsSlice";
import { AppliedChartData, ChartData } from "../chartDataSlice";
import { CategoricalDomain, NumberDomain } from "../../util/types";
import { selectChartLayout } from "../../context/chartLayoutContext";
import {
  selectChartDataAndAlwaysIgnoreIndexes,
  selectChartDataSliceIgnoringIndexes,
  selectChartDataWithIndexes,
} from "./dataSelectors";
import { pickAxisType } from "./pickAxisType";
import { selectReverseStackOrder, selectStackOffsetType } from "./rootPropsSelectors";
import { combineCheckedDomain } from "./combiners/combineCheckedDomain";
import {
  combineAppliedValues,
  combineAxisDomain,
  combineAxisDomainWithNiceTicks,
  combineDisplayedData,
  combineDomainOfAllAppliedNumericalValuesIncludingErrorValues,
  combineDomainOfStackGroups,
  combineGraphicalItemsData,
  combineGraphicalItemsSettings,
  combineNiceTicks,
  combineNumericalDomain,
  combineStackGroups,
  itemAxisPredicate,
  selectAllErrorBarSettings,
  selectBaseAxis,
  selectDomainDefinition,
  selectDomainFromUserPreference,
  selectRealScaleType,
  selectRenderableAxisSettings,
  selectTooltipAxis,
} from "./axisSelectors";
import { isStacked } from "../types/StackedGraphicalItem";
import { combineDisplayedStackedData } from "./combiners/combineDisplayedStackedData";
import type { AllStackGroups } from "../../util/stacks/stackTypes";

export type PolarAxisType = "angleAxis" | "radiusAxis";

export const selectUnfilteredPolarItems = (
  state: RechartsRootState,
): ReadonlyArray<PolarGraphicalItemSettings> => state.graphicalItems.polarItems;

const selectAxisPredicate = (
  _state: RechartsRootState,
  axisType: PolarAxisType,
  axisId: AxisId,
): ((item: PolarGraphicalItemSettings) => boolean) => itemAxisPredicate(axisType, axisId);

export const selectPolarItemsSettings = (
  state: RechartsRootState,
  axisType: PolarAxisType,
  polarAxisId: AxisId,
): ReadonlyArray<PolarGraphicalItemSettings> =>
  combineGraphicalItemsSettings(
    selectUnfilteredPolarItems(state),
    selectBaseAxis(state, axisType, polarAxisId),
    selectAxisPredicate(state, axisType, polarAxisId),
  );

const selectPolarGraphicalItemsData = (
  state: RechartsRootState,
  axisType: PolarAxisType,
  polarAxisId: AxisId,
): ChartData => combineGraphicalItemsData(selectPolarItemsSettings(state, axisType, polarAxisId));

export const selectPolarDisplayedData = (
  state: RechartsRootState,
  axisType: PolarAxisType,
  polarAxisId: AxisId,
): ChartData =>
  combineDisplayedData(
    selectPolarGraphicalItemsData(state, axisType, polarAxisId),
    selectChartDataAndAlwaysIgnoreIndexes(state),
  );

export const selectPolarAppliedValues = (
  state: RechartsRootState,
  axisType: PolarAxisType,
  axisId: AxisId,
): AppliedChartData =>
  combineAppliedValues(
    selectPolarDisplayedData(state, axisType, axisId),
    selectBaseAxis(state, axisType, axisId),
    selectPolarItemsSettings(state, axisType, axisId),
  );

const selectDomainOfAllPolarAppliedNumericalValues = (
  state: RechartsRootState,
  axisType: PolarAxisType,
  axisId: AxisId,
): NumberDomain | undefined =>
  combineDomainOfAllAppliedNumericalValuesIncludingErrorValues(
    selectPolarDisplayedData(state, axisType, axisId),
    selectBaseAxis(state, axisType, axisId),
    selectPolarItemsSettings(state, axisType, axisId),
    selectAllErrorBarSettings(state),
    pickAxisType(state, axisType),
    selectChartDataSliceIgnoringIndexes(state),
  );

const selectPolarNumericalDomain = (
  state: RechartsRootState,
  axisType: PolarAxisType,
  axisId: AxisId,
): NumberDomain | undefined =>
  combineNumericalDomain(
    selectBaseAxis(state, axisType, axisId),
    selectDomainDefinition(state, axisType, axisId),
    selectDomainFromUserPreference(state, axisType, axisId),
    // Stacked RadialBars contribute their stack totals (verified against released
    // recharts: the implicit numeric angle axis spans [0, stack total]).
    combineDomainOfStackGroups(
      selectPolarStackGroups(state, axisType, axisId),
      selectChartDataWithIndexes(state),
      axisType,
      selectDomainFromUserPreference(state, axisType, axisId),
    ),
    selectDomainOfAllPolarAppliedNumericalValues(state, axisType, axisId),
    // Reference elements are unsupported in polar charts.
    undefined,
    selectChartLayout(state),
    pickAxisType(state, axisType),
  );

// Stacked RadialBars sharing this polar axis → displayed stacked data → d3 stack
// groups (reference selectStackedRadialBars/selectStackGroups, shared by the
// numeric-domain selector above and selectRadialBarSectors).
export const selectPolarStackGroups = (
  state: RechartsRootState,
  axisType: PolarAxisType,
  axisId: AxisId,
): AllStackGroups | undefined => {
  const stackedItems = selectPolarItemsSettings(state, axisType, axisId)
    .filter((item) => item.type === "radialBar")
    .filter(isStacked);
  if (stackedItems.length === 0) {
    return undefined;
  }
  return combineStackGroups(
    combineDisplayedStackedData(
      stackedItems,
      selectChartDataAndAlwaysIgnoreIndexes(state),
      selectTooltipAxis(state),
    ),
    stackedItems,
    selectStackOffsetType(state),
    selectReverseStackOrder(state),
  );
};

export const selectPolarAxisDomain = (
  state: RechartsRootState,
  axisType: PolarAxisType,
  polarAxisId: AxisId,
): NumberDomain | CategoricalDomain | undefined =>
  combineAxisDomain(
    selectBaseAxis(state, axisType, polarAxisId),
    selectChartLayout(state),
    selectPolarDisplayedData(state, axisType, polarAxisId),
    selectPolarAppliedValues(state, axisType, polarAxisId),
    selectStackOffsetType(state),
    pickAxisType(state, axisType),
    selectPolarNumericalDomain(state, axisType, polarAxisId),
  );

export const selectPolarNiceTicks = (
  state: RechartsRootState,
  axisType: PolarAxisType,
  polarAxisId: AxisId,
): ReadonlyArray<number> | undefined =>
  combineNiceTicks(
    selectPolarAxisDomain(state, axisType, polarAxisId),
    selectRenderableAxisSettings(state, axisType, polarAxisId),
    selectRealScaleType(state, axisType, polarAxisId),
  );

export const selectPolarAxisDomainIncludingNiceTicks = (
  state: RechartsRootState,
  axisType: PolarAxisType,
  polarAxisId: AxisId,
): NumberDomain | CategoricalDomain | undefined =>
  combineAxisDomainWithNiceTicks(
    selectBaseAxis(state, axisType, polarAxisId),
    selectPolarAxisDomain(state, axisType, polarAxisId),
    selectPolarNiceTicks(state, axisType, polarAxisId),
    pickAxisType(state, axisType),
  );

export const selectPolarAxisCheckedDomain = (
  state: RechartsRootState,
  axisType: PolarAxisType,
  polarAxisId: AxisId,
): NumberDomain | CategoricalDomain | undefined =>
  combineCheckedDomain(
    selectRealScaleType(state, axisType, polarAxisId),
    selectPolarAxisDomainIncludingNiceTicks(state, axisType, polarAxisId),
  );
