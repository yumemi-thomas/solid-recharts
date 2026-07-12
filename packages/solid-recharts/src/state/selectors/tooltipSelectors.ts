// Ported from recharts 3.8.1 src/state/selectors/tooltipSelectors.ts +
// state/selectors/selectors.ts (the tooltip half), merged into one module.
//
// MAJOR DEVIATION (documented): recharts builds a fully parallel domain→scale→
// ticks chain for the "tooltip axis" (≈20 selectors: applied values, stack
// groups, reference-element domains, nice ticks…). The port instead REUSES the
// regular cartesian axis selectors keyed by the tooltip axis type+id
// (selectAxisDomain/selectAxisScale/selectAxisRange/selectDuplicateDomain/
// selectCategoricalDomain/selectRealScaleType). For a cartesian chart the tooltip
// axis IS the categorical X (horizontal) / Y (vertical) axis, and those selectors
// already span every graphical item on the axis — so the result matches for the
// single- and multi-series cases. What's deferred by the reuse: reference-element
// contributions to the tooltip-axis domain (ReferenceLine/Area/Dot — themselves
// not yet ported). Only the tick OFFSET is tooltip-specific, so combineTicksOf-
// TooltipAxis is ported verbatim. The public parameterized selectors (consumed by
// <Tooltip>) are plain functions; memoization comes from useAppSelector.
import { sortBy } from "../../util/collectionUtils";
import { RechartsRootState } from "../store";
import {
  AxisRange,
  RenderableAxisSettings,
  combineAllAppliedValues,
  combineAreasDomain,
  combineAxisDomain,
  combineAxisDomainWithNiceTicks,
  combineDisplayedData,
  combineDotsDomain,
  combineGraphicalItemsData,
  combineGraphicalItemsSettings,
  combineLinesDomain,
  combineNiceTicks,
  combineNumericalDomain,
  filterReferenceElements,
  itemAxisPredicate,
  selectAxisRange,
  selectAxisScale,
  selectCategoricalDomain,
  selectDomainDefinition,
  selectDomainFromUserPreference,
  selectDomainOfAllAppliedNumericalValuesIncludingErrorValues,
  selectDomainOfStackGroups,
  selectDuplicateDomain,
  selectHasBar,
  selectReferenceAreas,
  selectReferenceDots,
  selectReferenceLines,
  selectRealScaleType,
  selectTooltipAxis,
  selectUnfilteredCartesianItems,
} from "./axisSelectors";
import {
  CartesianGraphicalItemSettings,
  GraphicalItemSettings,
  PolarGraphicalItemSettings,
} from "../graphicalItemsSlice";
import { selectUnfilteredPolarItems } from "./polarSelectors";
import { selectChartLayout } from "../../context/chartLayoutContext";
import {
  calculateCartesianTooltipPos,
  calculatePolarTooltipPos,
  isCategoricalAxis,
} from "../../util/ChartUtils";
import { inRangeOfSector } from "../../util/PolarUtils";
import { selectPolarViewBox } from "./polarAxisSelectors";
import {
  AxisType,
  CartesianLayout,
  CategoricalDomain,
  CategoricalDomainItem,
  Coordinate,
  DataKey,
  LayoutType,
  NumberDomain,
  PolarLayout,
  PolarViewBoxRequired,
  RechartsScaleType,
  RelativePointer,
  TickItem,
  TooltipEventType,
} from "../../util/types";
import { combineAxisRangeWithReverse } from "./combiners/combineAxisRangeWithReverse";
import { combineRealScaleType } from "./combiners/combineRealScaleType";
import {
  calculateActiveTickIndex,
  getActiveCartesianCoordinate,
  getActivePolarCoordinate,
  isInCartesianRange,
} from "../../util/getActiveCoordinate";
import { ActiveTooltipProps } from "../tooltipSlice";
import { ChartData } from "../chartDataSlice";
import { selectChartDataWithIndexes } from "./dataSelectors";
import { isNotNil, mathSign } from "../../util/DataUtils";
import { isWellBehavedNumber } from "../../util/isWellBehavedNumber";
import { RechartsScale } from "../../util/scale/RechartsScale";
import {
  TooltipIndex,
  TooltipInteractionState,
  TooltipPayload,
  TooltipPayloadConfiguration,
} from "../tooltipSlice";
import { TooltipTrigger } from "../../chart/types";
import { RenderableAxisType, selectTooltipAxisType } from "./selectTooltipAxisType";
import { selectTooltipAxisId } from "./selectTooltipAxisId";
import { selectTooltipState } from "./selectTooltipState";
import { selectTooltipPayloadSearcher } from "./selectTooltipPayloadSearcher";
import { selectChartOffsetInternal } from "./selectChartOffsetInternal";
import { selectChartHeight, selectChartWidth } from "./containerSelectors";
import { combineActiveLabel } from "./combiners/combineActiveLabel";
import { combineActiveTooltipIndex } from "./combiners/combineActiveTooltipIndex";
import { combineCoordinateForDefaultIndex } from "./combiners/combineCoordinateForDefaultIndex";
import { combineTooltipInteractionState } from "./combiners/combineTooltipInteractionState";
import { combineTooltipPayload } from "./combiners/combineTooltipPayload";
import { combineTooltipPayloadConfigurations } from "./combiners/combineTooltipPayloadConfigurations";
import { ActiveLabel } from "../../synchronisation/types";
import { selectTooltipEventType } from "./selectTooltipEventType";
import { selectChartName, selectStackOffsetType } from "./rootPropsSelectors";

// The tooltip never renders inside a Brush panorama, so isPanorama is always false.
const NOT_PANORAMA = false;

export { selectTooltipAxis };

export const selectTooltipAxisDataKey = (state: RechartsRootState): DataKey<unknown> | undefined =>
  selectTooltipAxis(state)?.dataKey;

export const selectTooltipDisplayedData = (state: RechartsRootState): ChartData =>
  combineDisplayedData(selectTooltipGraphicalItemsData(state), selectChartDataWithIndexes(state));

const selectTooltipReferenceDotsDomain = (state: RechartsRootState): NumberDomain | undefined =>
  combineDotsDomain(
    filterReferenceElements(
      selectReferenceDots(state),
      selectTooltipAxisType(state),
      selectTooltipAxisId(state),
    ),
    selectTooltipAxisType(state),
  );

const selectTooltipReferenceAreasDomain = (state: RechartsRootState): NumberDomain | undefined =>
  combineAreasDomain(
    filterReferenceElements(
      selectReferenceAreas(state),
      selectTooltipAxisType(state),
      selectTooltipAxisId(state),
    ),
    selectTooltipAxisType(state),
  );

const selectTooltipReferenceLinesDomain = (state: RechartsRootState): NumberDomain | undefined =>
  combineLinesDomain(
    filterReferenceElements(
      selectReferenceLines(state),
      selectTooltipAxisType(state),
      selectTooltipAxisId(state),
    ),
    selectTooltipAxisType(state),
  );

const selectTooltipReferenceElementsDomain = (
  state: RechartsRootState,
): NumberDomain | undefined => {
  const dotsDomain = selectTooltipReferenceDotsDomain(state);
  const linesDomain = selectTooltipReferenceLinesDomain(state);
  const areasDomain = selectTooltipReferenceAreasDomain(state);
  const domains = [dotsDomain, linesDomain, areasDomain].filter(
    (domain): domain is NumberDomain => domain != null,
  );
  if (domains.length === 0) {
    return undefined;
  }
  return [
    Math.min(...domains.map((domain) => domain[0])),
    Math.max(...domains.map((domain) => domain[1])),
  ];
};

const selectAnyTooltipItemUsesChartData = (state: RechartsRootState): boolean =>
  selectAllGraphicalItemsSettings(state).some((item) => !item.data);

const selectAllTooltipAppliedValues = (state: RechartsRootState) =>
  combineAllAppliedValues(
    selectTooltipDisplayedData(state),
    selectTooltipAxis(state),
    selectAllGraphicalItemsSettings(state),
    selectChartDataWithIndexes(state),
    selectAnyTooltipItemUsesChartData(state),
    selectTooltipGraphicalItemsData(state),
  );

const selectTooltipNumericalDomain = (state: RechartsRootState): NumberDomain | undefined =>
  combineNumericalDomain(
    selectTooltipAxis(state),
    selectDomainDefinition(state, selectTooltipAxisType(state), selectTooltipAxisId(state)),
    selectDomainFromUserPreference(state, selectTooltipAxisType(state), selectTooltipAxisId(state)),
    selectDomainOfStackGroups(
      state,
      selectTooltipAxisType(state),
      selectTooltipAxisId(state),
      NOT_PANORAMA,
    ),
    selectDomainOfAllAppliedNumericalValuesIncludingErrorValues(
      state,
      selectTooltipAxisType(state),
      selectTooltipAxisId(state),
      NOT_PANORAMA,
    ),
    selectTooltipReferenceElementsDomain(state),
    selectChartLayout(state),
    selectTooltipAxisType(state),
  );

export const selectTooltipAxisDomain = (
  state: RechartsRootState,
): NumberDomain | CategoricalDomain | undefined =>
  combineAxisDomain(
    selectTooltipAxis(state),
    selectChartLayout(state),
    selectTooltipDisplayedData(state),
    selectAllTooltipAppliedValues(state),
    selectStackOffsetType(state),
    selectTooltipAxisType(state),
    selectTooltipNumericalDomain(state),
  );

const selectTooltipNiceTicks = (state: RechartsRootState): ReadonlyArray<number> | undefined =>
  combineNiceTicks(
    selectTooltipAxisDomain(state),
    selectTooltipAxis(state),
    selectTooltipAxisRealScaleType(state),
  );

export const selectTooltipAxisDomainIncludingNiceTicks = (
  state: RechartsRootState,
): NumberDomain | CategoricalDomain | undefined =>
  combineAxisDomainWithNiceTicks(
    selectTooltipAxis(state),
    selectTooltipAxisDomain(state),
    selectTooltipNiceTicks(state),
    selectTooltipAxisType(state),
  );

export const selectAllUnfilteredGraphicalItems = (
  state: RechartsRootState,
): ReadonlyArray<CartesianGraphicalItemSettings | PolarGraphicalItemSettings> => [
  ...selectUnfilteredCartesianItems(state),
  ...selectUnfilteredPolarItems(state),
];

const selectTooltipAxisPredicate = (
  state: RechartsRootState,
): ((item: GraphicalItemSettings) => boolean) =>
  itemAxisPredicate(selectTooltipAxisType(state), selectTooltipAxisId(state));

export const selectAllGraphicalItemsSettings = (
  state: RechartsRootState,
): ReadonlyArray<GraphicalItemSettings> =>
  combineGraphicalItemsSettings(
    selectAllUnfilteredGraphicalItems(state),
    selectTooltipAxis(state),
    selectTooltipAxisPredicate(state),
  );

export const selectTooltipGraphicalItemsData = (state: RechartsRootState): ChartData =>
  combineGraphicalItemsData(selectAllGraphicalItemsSettings(state));

export const selectTooltipAxisScale = (state: RechartsRootState): RechartsScale | undefined =>
  selectAxisScale(state, selectTooltipAxisType(state), selectTooltipAxisId(state), NOT_PANORAMA);

export const selectTooltipAxisRealScaleType = (
  state: RechartsRootState,
): RechartsScaleType | undefined =>
  selectRealScaleType(state, selectTooltipAxisType(state), selectTooltipAxisId(state)) ??
  combineRealScaleType(selectTooltipAxis(state), selectHasBar(state), selectChartName(state));

const selectTooltipAxisRange = (state: RechartsRootState): AxisRange | undefined =>
  selectAxisRange(state, selectTooltipAxisType(state), selectTooltipAxisId(state), NOT_PANORAMA);

const selectTooltipDuplicateDomain = (
  state: RechartsRootState,
): ReadonlyArray<unknown> | undefined =>
  selectDuplicateDomain(
    state,
    selectTooltipAxisType(state),
    selectTooltipAxisId(state),
    NOT_PANORAMA,
  );

export const selectTooltipCategoricalDomain = (
  state: RechartsRootState,
): ReadonlyArray<unknown> | undefined =>
  selectCategoricalDomain(
    state,
    selectTooltipAxisType(state),
    selectTooltipAxisId(state),
    NOT_PANORAMA,
  );

/** Ported verbatim from tooltipSelectors.ts — the tooltip-specific tick offset. */
const combineTicksOfTooltipAxis = (
  layout: LayoutType,
  axis: RenderableAxisSettings,
  realScaleType: string | undefined,
  scale: RechartsScale | undefined,
  range: AxisRange | undefined,
  duplicateDomain: ReadonlyArray<unknown> | undefined,
  categoricalDomain: ReadonlyArray<unknown> | undefined,
  axisType: RenderableAxisType,
): ReadonlyArray<TickItem> | undefined => {
  if (!axis) {
    return undefined;
  }
  const { type } = axis;

  const isCategorical = isCategoricalAxis(layout, axisType);

  if (!scale) {
    return undefined;
  }

  const offsetForBand =
    realScaleType === "scaleBand" && scale.bandwidth ? scale.bandwidth() / 2 : 2;
  let offset = type === "category" && scale.bandwidth ? scale.bandwidth() / offsetForBand : 0;

  offset =
    axisType === "angleAxis" && range != null && range.length >= 2
      ? mathSign(range[0] - range[1]) * 2 * offset
      : offset;

  // Categorical axis whose type is number, or whose scale is not "auto".
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

  // When axis has duplicated text, serial numbers are used to generate the scale.
  return scale
    .domain()
    .map((entry: CategoricalDomainItem, index: number): TickItem | null => {
      const scaled = scale.map(entry);
      if (!isWellBehavedNumber(scaled)) {
        return null;
      }
      // Deviation: reference indexes `duplicateDomain[entry]` with a
      // `@ts-expect-error`; the serial case only has a numeric `entry`, so guard.
      const value =
        duplicateDomain != null && typeof entry === "number" ? duplicateDomain[entry] : entry;
      return { coordinate: scaled + offset, value, index, offset };
    })
    .filter(isNotNil);
};

export const selectTooltipAxisTicks = (
  state: RechartsRootState,
): ReadonlyArray<TickItem> | undefined =>
  combineTicksOfTooltipAxis(
    selectChartLayout(state),
    selectTooltipAxis(state),
    selectTooltipAxisRealScaleType(state),
    selectTooltipAxisScale(state),
    selectTooltipAxisRange(state),
    selectTooltipDuplicateDomain(state),
    selectTooltipCategoricalDomain(state),
    selectTooltipAxisType(state),
  );

// ---------------------------------------------------------------------------
// Public parameterized selectors (consumed by <Tooltip>). Settings come in as
// args — the Tooltip passes its resolved (eventType, trigger, defaultIndex).
// ---------------------------------------------------------------------------

export const selectTooltipInteractionState = (
  state: RechartsRootState,
  tooltipEventType: TooltipEventType | undefined,
  trigger: TooltipTrigger,
  defaultIndex: TooltipIndex | undefined,
): TooltipInteractionState =>
  combineTooltipInteractionState(
    selectTooltipState(state),
    tooltipEventType,
    trigger,
    defaultIndex,
  );

export const selectActiveIndex = (
  state: RechartsRootState,
  tooltipEventType: TooltipEventType | undefined,
  trigger: TooltipTrigger,
  defaultIndex: TooltipIndex | undefined,
): TooltipIndex | null =>
  combineActiveTooltipIndex(
    selectTooltipInteractionState(state, tooltipEventType, trigger, defaultIndex),
    selectTooltipDisplayedData(state),
    selectTooltipAxisDataKey(state),
    selectTooltipAxisDomain(state),
  );

export const selectTooltipPayloadConfigurations = (
  state: RechartsRootState,
  tooltipEventType: TooltipEventType | undefined,
  trigger: TooltipTrigger,
  defaultIndex: TooltipIndex | undefined,
): ReadonlyArray<TooltipPayloadConfiguration> =>
  combineTooltipPayloadConfigurations(
    selectTooltipState(state),
    tooltipEventType,
    trigger,
    defaultIndex,
  );

export const selectCoordinateForDefaultIndex = (
  state: RechartsRootState,
  tooltipEventType: TooltipEventType | undefined,
  trigger: TooltipTrigger,
  defaultIndex: TooltipIndex | undefined,
): Coordinate | undefined =>
  combineCoordinateForDefaultIndex(
    selectChartWidth(state),
    selectChartHeight(state),
    selectChartLayout(state),
    selectChartOffsetInternal(state),
    selectTooltipAxisTicks(state),
    defaultIndex,
    selectTooltipPayloadConfigurations(state, tooltipEventType, trigger, defaultIndex),
  );

export const selectActiveCoordinate = (
  state: RechartsRootState,
  tooltipEventType: TooltipEventType | undefined,
  trigger: TooltipTrigger,
  defaultIndex: TooltipIndex | undefined,
): Coordinate | undefined => {
  const interaction = selectTooltipInteractionState(state, tooltipEventType, trigger, defaultIndex);
  return (
    interaction.coordinate ??
    selectCoordinateForDefaultIndex(state, tooltipEventType, trigger, defaultIndex)
  );
};

export const selectActiveLabel = (
  state: RechartsRootState,
  tooltipEventType: TooltipEventType | undefined,
  trigger: TooltipTrigger,
  defaultIndex: TooltipIndex | undefined,
): ActiveLabel =>
  combineActiveLabel(
    selectTooltipAxisTicks(state),
    selectActiveIndex(state, tooltipEventType, trigger, defaultIndex),
  );

export const selectTooltipPayload = (
  state: RechartsRootState,
  tooltipEventType: TooltipEventType | undefined,
  trigger: TooltipTrigger,
  defaultIndex: TooltipIndex | undefined,
): TooltipPayload | undefined =>
  combineTooltipPayload(
    selectTooltipPayloadConfigurations(state, tooltipEventType, trigger, defaultIndex),
    selectActiveIndex(state, tooltipEventType, trigger, defaultIndex),
    selectChartDataWithIndexes(state),
    selectTooltipAxisDataKey(state),
    selectActiveLabel(state, tooltipEventType, trigger, defaultIndex),
    selectTooltipPayloadSearcher(state),
    tooltipEventType,
  );

export const selectIsTooltipActive = (
  state: RechartsRootState,
  tooltipEventType: TooltipEventType | undefined,
  trigger: TooltipTrigger,
  defaultIndex: TooltipIndex | undefined,
): { isActive: boolean; activeIndex: TooltipIndex | null } => {
  const interaction = selectTooltipInteractionState(state, tooltipEventType, trigger, defaultIndex);
  const activeIndex = selectActiveIndex(state, tooltipEventType, trigger, defaultIndex);
  return { isActive: interaction.active && activeIndex != null, activeIndex };
};

// ---------------------------------------------------------------------------
// Pointer → active props (mouse hover). Cartesian only; the polar branch of
// recharts' combineActiveProps is deferred with the polar vertical.
// ---------------------------------------------------------------------------

export const selectTooltipAxisRangeWithReverse = (
  state: RechartsRootState,
): AxisRange | undefined =>
  combineAxisRangeWithReverse(selectTooltipAxis(state), selectTooltipAxisRange(state));

export const selectOrderedTooltipTicks = (
  state: RechartsRootState,
): ReadonlyArray<TickItem> | undefined => {
  const ticks = selectTooltipAxisTicks(state);
  return ticks == null ? undefined : sortBy(ticks, [(o: TickItem) => o.coordinate]);
};

const combineActivePolarProps = (
  chartEvent: RelativePointer,
  layout: PolarLayout,
  polarViewBox: PolarViewBoxRequired,
  tooltipAxisType: AxisType,
  tooltipAxisRange: AxisRange,
  tooltipTicks: ReadonlyArray<TickItem>,
  orderedTooltipTicks: ReadonlyArray<TickItem> | undefined,
): ActiveTooltipProps | undefined => {
  const rangeObj = inRangeOfSector(chartEvent, polarViewBox);
  if (rangeObj == null) {
    return undefined;
  }
  const pos = calculatePolarTooltipPos(rangeObj, layout);
  const activeIndex = calculateActiveTickIndex(
    pos,
    orderedTooltipTicks,
    tooltipTicks,
    tooltipAxisType,
    tooltipAxisRange,
  );
  const activeCoordinate = getActivePolarCoordinate(layout, tooltipTicks, activeIndex, rangeObj);
  return { activeIndex: String(activeIndex), activeCoordinate };
};

const combineActiveCartesianProps = (
  chartEvent: RelativePointer,
  layout: CartesianLayout,
  tooltipAxisType: AxisType,
  tooltipAxisRange: AxisRange,
  tooltipTicks: ReadonlyArray<TickItem>,
  orderedTooltipTicks: ReadonlyArray<TickItem> | undefined,
  offset: ReturnType<typeof selectChartOffsetInternal>,
): ActiveTooltipProps | undefined => {
  if (!isInCartesianRange(chartEvent, offset)) {
    return undefined;
  }
  const pos = calculateCartesianTooltipPos(chartEvent, layout);
  const activeIndex = calculateActiveTickIndex(
    pos,
    orderedTooltipTicks,
    tooltipTicks,
    tooltipAxisType,
    tooltipAxisRange,
  );
  const activeCoordinate = getActiveCartesianCoordinate(
    layout,
    tooltipTicks,
    activeIndex,
    chartEvent,
  );
  return { activeIndex: String(activeIndex), activeCoordinate };
};

/**
 * Maps a chart-relative pointer to the active tooltip index + coordinate. Returns
 * undefined when the pointer is outside the plot area or the axis isn't ready.
 */
export const selectActivePropsFromChartPointer = (
  state: RechartsRootState,
  chartPointer: RelativePointer,
): ActiveTooltipProps | undefined => {
  const layout = selectChartLayout(state);
  const tooltipAxisType = selectTooltipAxisType(state);
  const tooltipAxisRange = selectTooltipAxisRangeWithReverse(state);
  const tooltipTicks = selectTooltipAxisTicks(state);
  if (layout == null || tooltipAxisRange == null || tooltipTicks == null) {
    return undefined;
  }
  if (layout === "horizontal" || layout === "vertical") {
    return combineActiveCartesianProps(
      chartPointer,
      layout,
      tooltipAxisType,
      tooltipAxisRange,
      tooltipTicks,
      selectOrderedTooltipTicks(state),
      selectChartOffsetInternal(state),
    );
  }
  const polarViewBox = selectPolarViewBox(state);
  if (polarViewBox == null) {
    return undefined;
  }
  return combineActivePolarProps(
    chartPointer,
    layout,
    polarViewBox,
    tooltipAxisType,
    tooltipAxisRange,
    tooltipTicks,
    selectOrderedTooltipTicks(state),
  );
};

// Zero-arg selector for graphical items (Bar background active state, etc.).
const selectStoredTooltipInteractionState = (state: RechartsRootState): TooltipInteractionState =>
  combineTooltipInteractionState(
    selectTooltipState(state),
    selectTooltipEventType(state, state.tooltip.settings.shared),
    state.tooltip.settings.trigger,
    state.tooltip.settings.defaultIndex,
  );

export const selectActiveTooltipIndex = (state: RechartsRootState): TooltipIndex | null =>
  combineActiveTooltipIndex(
    selectStoredTooltipInteractionState(state),
    selectTooltipDisplayedData(state),
    selectTooltipAxisDataKey(state),
    selectTooltipAxisDomain(state),
  );

export const selectActiveTooltipPayload = (
  state: RechartsRootState,
): TooltipPayload | undefined => {
  const tooltipEventType = selectTooltipEventType(state, state.tooltip.settings.shared);
  return selectTooltipPayload(
    state,
    tooltipEventType,
    state.tooltip.settings.trigger,
    state.tooltip.settings.defaultIndex,
  );
};

export const selectActiveTooltipDataPoints = (
  state: RechartsRootState,
): ReadonlyArray<unknown> | undefined => {
  const payload = selectActiveTooltipPayload(state);
  if (payload == null) {
    return undefined;
  }
  const dataPoints = payload.map((entry) => entry.payload).filter((entry) => entry != null);
  return Array.from(new Set(dataPoints));
};

export const selectActiveTooltipDataKey = (
  state: RechartsRootState,
): DataKey<unknown> | undefined => selectStoredTooltipInteractionState(state).dataKey;

/** The active tooltip label (one of the chart-data values). Parameterless — reads tooltip settings from state. @since 3.0 */
export const selectActiveTooltipLabel = (state: RechartsRootState): ActiveLabel =>
  combineActiveLabel(selectTooltipAxisTicks(state), selectActiveTooltipIndex(state));

/** Whether the tooltip is currently active. Parameterless — reads tooltip settings from state. @since 3.7 */
export const selectTooltipIsActive = (state: RechartsRootState): boolean =>
  selectStoredTooltipInteractionState(state).active;

/** The active tooltip's cartesian coordinate. Parameterless — reads tooltip settings from state. @since 3.7 */
export const selectActiveTooltipCoordinate = (state: RechartsRootState): Coordinate | undefined => {
  const interaction = selectStoredTooltipInteractionState(state);
  if (interaction.coordinate) {
    return interaction.coordinate;
  }
  const tooltipEventType = selectTooltipEventType(state, state.tooltip.settings.shared);
  return selectCoordinateForDefaultIndex(
    state,
    tooltipEventType,
    state.tooltip.settings.trigger,
    state.tooltip.settings.defaultIndex,
  );
};

// ---------------------------------------------------------------------------
// Synchronisation accessors (consumed by useTooltipChartSynchronisation). Ported
// from recharts 3.8.1 src/state/selectors/{selectors.ts,tooltipSelectors.ts}.
// ---------------------------------------------------------------------------

/** The dataKey of whatever interaction (axis/item × hover/click) is active. */
export const selectTooltipDataKey = (
  state: RechartsRootState,
  tooltipEventType: TooltipEventType | undefined,
  trigger: TooltipTrigger,
): DataKey<unknown> | undefined => {
  if (tooltipEventType == null) {
    return undefined;
  }
  const tooltipState = selectTooltipState(state);
  if (tooltipEventType === "axis") {
    return trigger === "hover"
      ? tooltipState.axisInteraction.hover.dataKey
      : tooltipState.axisInteraction.click.dataKey;
  }
  return trigger === "hover"
    ? tooltipState.itemInteraction.hover.dataKey
    : tooltipState.itemInteraction.click.dataKey;
};

/** The graphicalItemId of the active interaction (for item-triggered tooltips). */
export const selectActiveTooltipGraphicalItemId = (state: RechartsRootState): string | undefined =>
  selectStoredTooltipInteractionState(state).graphicalItemId;
