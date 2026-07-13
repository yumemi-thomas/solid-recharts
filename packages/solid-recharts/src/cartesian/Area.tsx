// Ported from recharts 3.9.0 src/cartesian/Area.tsx (commit 7a23854 base).
//
// A graphical item reusing the Line/axis spine: it computes points like a Line
// plus a baseLine, and draws a filled <Curve>.
// FULLY WIRED: range areas, activeDot, labels, clip, stacks, dots (boolean /
// props-object / function-form), tooltip + legend registration, and animation
// — migrated to the v3.9 engine (AnimatedItems + AnimationController). The
// entrance clip-reveal now lives in AreaRevealShape (the default `shape`); the
// data-change morph is driven by the AnimatedItems interpolation fn.
// Solid deviations: `resolveDefaultProps`→`merge`; effect-dispatch
// registration components → `createEffect` add/replace + `onCleanup` (Line idiom);
// React `useRef` prev-frame state → plain `{ current }` MutableRef objects driven
// by AnimatedItems/useAnimationStartSnapshot.
import { createMemo, merge, Show } from "solid-js";
import type { JSX } from "@solidjs/web";
import { useAppSelector, useAppStore } from "../state/hooks";
import {
  AnimatedItems,
  useAnimationCallbacks,
  type AnimationInterpolateFn,
} from "../animation/AnimatedItems";
import {
  matchAnimationItems,
  matchByIndex,
  type AnimationItem,
  type AnimationMatchByProp,
} from "../animation/matchBy";
import { useAnimationStartSnapshot, type MutableRef } from "../animation/useAnimationStartSnapshot";
import type { EasingInput } from "../animation/easing";
import { noop } from "../util/DataUtils";
import { SetTooltipEntrySettings } from "../state/SetTooltipEntrySettings";
import { TooltipPayloadConfiguration } from "../state/tooltipSlice";
import { SetLegendPayload } from "../state/SetLegendPayload";
import { LegendPayload } from "../component/DefaultLegendContent";
import type { Formatter } from "../component/DefaultTooltipContent";
import { DefaultZIndexes } from "../zIndex/DefaultZIndexes";
import { ZIndexLayer } from "../zIndex/ZIndexLayer";
import { useIsPanorama } from "../context/PanoramaContext";
import { useCartesianChartLayout } from "../context/chartLayoutContext";
import { useUniqueId } from "../util/useUniqueId";
import { Layer } from "../container/Layer";
import { type CurveType, type CurveProps, type BaseLineType } from "../shape/Curve";
import { Shape } from "../util/ActiveShapeUtils";
import { svgPropertiesAndEvents } from "../util/svgPropertiesAndEvents";
import { svgPropertiesNoEvents } from "../util/svgPropertiesNoEvents";
import { Dots, isClipDot } from "../component/Dots";
import { getRadiusAndStrokeWidthFromDot } from "../util/getRadiusAndStrokeWidthFromDot";
import { GraphicalItemClipPath, useNeedsClip } from "./GraphicalItemClipPath";
import { usePlotArea } from "../hooks";
import {
  type CartesianLabelListEntry,
  CartesianLabelListContextProvider,
  type ImplicitLabelListType,
  LabelListFromLabelProp,
} from "../component/LabelList";
import type { ActiveShape, TrapezoidViewBox } from "../util/types";
import { selectArea } from "../state/selectors/areaSelectors";
import { AreaSettings } from "../state/types/AreaSettings";
import { AxisId } from "../state/cartesianAxisSlice";
import { ChartData } from "../state/chartDataSlice";
import {
  ActiveDotType,
  AnimationDuration,
  BaseValue,
  CartesianLayout,
  DataKey,
  DotType,
  LegendType,
  NullableCoordinate,
  TickItem,
  TooltipType,
} from "../util/types";
import {
  computeActivePointState,
  renderActivePointsLayerFromState,
} from "../component/ActivePoints";
import { useActiveTooltipDataPoints } from "../hooks";
import { selectActiveTooltipIndex } from "../state/selectors/tooltipSelectors";
import { selectChartName } from "../state/selectors/rootPropsSelectors";
import { getCateCoordinateOfLine, getTooltipNameProp, getValueByDataKey } from "../util/ChartUtils";
import { interpolate, isNan, isNullish, isNumber } from "../util/DataUtils";
import { BaseAxisWithScale } from "../state/selectors/axisSelectors";
import { StackId } from "../util/ChartUtils";
import { StackDataPoint } from "../util/stacks/stackTypes";
import { registerInStore } from "../state/registerInStore";
import { AreaRevealShape, type AreaRevealShapeProps } from "./AreaRevealShape";

function getLegendItemColor(
  stroke: string | undefined,
  fill: string | undefined,
): string | undefined {
  return stroke && stroke !== "none" ? stroke : fill;
}

export interface AreaPointItem extends NullableCoordinate {
  x: number | null;
  y: number | null;
  value?: ReadonlyArray<unknown>;
  payload?: unknown;
}

export type ComputedArea = {
  points: ReadonlyArray<AreaPointItem>;
  baseLine: number | ReadonlyArray<AreaPointItem>;
  isRange: boolean;
};

/**
 * The area's base value (the bottom of the fill). Item value wins over the
 * chart-level value. Deviation: reference reads `scale.domain()` with
 * `@ts-expect-error`; the domain items are coerced with `Number()` (identity for
 * number axes — the normal area case).
 */
export const getBaseValue = (
  layout: CartesianLayout,
  chartBaseValue: BaseValue | undefined,
  itemBaseValue: BaseValue | undefined,
  xAxis: BaseAxisWithScale,
  yAxis: BaseAxisWithScale,
): number => {
  const baseValue: BaseValue | undefined = itemBaseValue ?? chartBaseValue;

  if (isNumber(baseValue)) {
    return baseValue;
  }

  const numericAxis = layout === "horizontal" ? yAxis : xAxis;
  const domain = numericAxis.scale.domain();
  const d0 = Number(domain[0]);
  const d1 = Number(domain[1]);

  if (numericAxis.type === "number") {
    const domainMax = Math.max(d0, d1);
    const domainMin = Math.min(d0, d1);

    if (baseValue === "dataMin") {
      return domainMin;
    }
    if (baseValue === "dataMax") {
      return domainMax;
    }

    return domainMax < 0 ? domainMax : Math.max(domainMin, 0);
  }

  if (baseValue === "dataMin") {
    return d0;
  }
  if (baseValue === "dataMax") {
    return d1;
  }

  return d0;
};

export function computeArea({
  areaSettings: { dataKey, baseValue: itemBaseValue, connectNulls },
  layout,
  chartBaseValue,
  xAxis,
  yAxis,
  displayedData,
  stackedData,
  dataStartIndex,
  xAxisTicks,
  yAxisTicks,
  bandSize,
}: {
  areaSettings: AreaSettings;
  layout: CartesianLayout;
  chartBaseValue: BaseValue | undefined;
  xAxis: BaseAxisWithScale;
  yAxis: BaseAxisWithScale;
  displayedData: ChartData;
  stackedData: ReadonlyArray<StackDataPoint> | undefined;
  dataStartIndex: number;
  xAxisTicks: TickItem[];
  yAxisTicks: TickItem[];
  bandSize: number;
}): ComputedArea {
  const hasStack = stackedData != null && stackedData.length > 0;
  const baseValue = getBaseValue(layout, chartBaseValue, itemBaseValue, xAxis, yAxis);
  const isHorizontalLayout = layout === "horizontal";

  // Range areas: when the dataKey returns a [low, high] tuple, the band spans
  // those two values (rather than baseValue→value), so `isRange` flips on and the
  // lower bound feeds the per-point baseLine below (recharts computeArea L1034).
  let isRange = false;
  const points: ReadonlyArray<AreaPointItem> = displayedData.map((entry, index): AreaPointItem => {
    let valueAsArray: ReadonlyArray<unknown>;
    if (hasStack) {
      valueAsArray = stackedData?.[dataStartIndex + index] ?? [];
    } else {
      const rawValue = getValueByDataKey(entry, dataKey);
      if (Array.isArray(rawValue)) {
        valueAsArray = rawValue;
        isRange = true;
      } else {
        valueAsArray = [baseValue, rawValue];
      }
    }
    const value1 = valueAsArray[1] ?? null;
    const isBreakPoint =
      value1 == null || (hasStack && !connectNulls && getValueByDataKey(entry, dataKey) == null);

    if (isHorizontalLayout) {
      return {
        x: getCateCoordinateOfLine({ axis: xAxis, ticks: xAxisTicks, bandSize, entry, index }),
        y: isBreakPoint ? null : (yAxis.scale.map(value1) ?? null),
        value: valueAsArray,
        payload: entry,
      };
    }
    return {
      x: isBreakPoint ? null : (xAxis.scale.map(value1) ?? null),
      y: getCateCoordinateOfLine({ axis: yAxis, ticks: yAxisTicks, bandSize, entry, index }),
      value: valueAsArray,
      payload: entry,
    };
  });

  // Stacked areas get a per-point baseLine (the lower bound of each stack
  // segment); unstacked areas get a flat numeric baseline.
  let baseLine: number | ReadonlyArray<AreaPointItem>;
  if (hasStack || isRange) {
    baseLine = points.map((entry): AreaPointItem => {
      const low = entry.value != null ? entry.value[0] : null;
      if (isHorizontalLayout) {
        return {
          x: entry.x,
          y: low != null && entry.y != null ? (yAxis.scale.map(low) ?? null) : null,
          payload: entry.payload,
        };
      }
      return {
        x: low != null ? (xAxis.scale.map(low) ?? null) : null,
        y: entry.y,
        payload: entry.payload,
      };
    });
  } else {
    baseLine = (isHorizontalLayout ? yAxis.scale.map(baseValue) : xAxis.scale.map(baseValue)) ?? 0;
  }

  return { points, baseLine, isRange };
}

// SVG props (incl. event handlers) the Area forwards onto its fill <Curve>, minus
// the ones Area computes itself or redeclares below.
type AreaSvgProps = Omit<
  CurveProps,
  | "points"
  | "pathRef"
  | "ref"
  | "layout"
  | "baseLine"
  | "type"
  | "connectNulls"
  | "path"
  | "class"
  | "id"
  | "stroke"
  | "strokeWidth"
  | "fill"
  | "children"
>;

export interface AreaProps extends AreaSvgProps {
  xAxisId?: AxisId;
  yAxisId?: AxisId;
  dataKey?: DataKey<unknown>;
  data?: ChartData;
  /** Series name shown in tooltip/legend; falls back to a string dataKey. */
  name?: string | number;
  /** Unit appended to the value in the tooltip. */
  unit?: string | number;
  /** Tooltip entry type (recharts only supports `'none'`). */
  tooltipType?: TooltipType;
  /** Formats this Area's tooltip value; takes precedence over the Tooltip-level `formatter`. */
  formatter?: Formatter;
  type?: CurveType;
  stroke?: string;
  strokeWidth?: number;
  fill?: string;
  fillOpacity?: number | string;
  /** Forwarded onto the area; recharts accepts the React-style camelCase attr. */
  pointerEvents?: string;
  connectNulls?: boolean;
  baseValue?: BaseValue;
  hide?: boolean;
  /**
   * Dots drawn at each point on the area's top line. boolean / props-object /
   * custom render function (function form). @defaultValue false
   */
  dot?: DotType;
  activeDot?: ActiveDotType;
  /**
   * Labels drawn at each point on the area's top line. boolean / props-object /
   * custom render function (function form). @defaultValue false
   */
  label?: ImplicitLabelListType;
  stackId?: StackId;
  /** Legend icon type. @defaultValue 'line' */
  legendType?: LegendType;
  isAnimationActive?: boolean | "auto";
  animationBegin?: number;
  animationDuration?: AnimationDuration;
  animationEasing?: EasingInput;
  /** Custom per-frame interpolation for the area points (v3.9). */
  animationInterpolateFn?: AnimationInterpolateFn<AreaPointItem, CartesianLayout>;
  /** How prev/next points are matched across data updates (v3.9). @defaultValue matchByIndex */
  animationMatchBy?: AnimationMatchByProp<AreaPointItem>;
  /**
   * Custom area shape (function form / props object). Defaults to AreaRevealShape,
   * the built-in entrance clip-reveal animation. @defaultValue AreaRevealShape
   */
  shape?: ActiveShape<AreaRevealShapeProps, SVGPathElement>;
  /** Fired when the enter/update animation starts. */
  onAnimationStart?: () => void;
  /** Fired when the enter/update animation completes. */
  onAnimationEnd?: () => void;
  /**
   * Z-Index of this component and its children; the higher, the more on top.
   * @defaultValue 100 (DefaultZIndexes.area)
   */
  zIndex?: number;
  id?: string;
  class?: string;
}

// Typed so the `as const` defaults object carries `shape` as `ActiveShape` (not the
// narrowed component signature) — mirrors Bar's `defaultBarShape`, avoids a cast.
const defaultAreaShape: ActiveShape<AreaRevealShapeProps, SVGPathElement> = AreaRevealShape;

export const areaDefaultProps = {
  activeDot: true,
  connectNulls: false,
  dot: false,
  fill: "#3182bd",
  fillOpacity: 0.6,
  hide: false,
  label: false,
  legendType: "line",
  stroke: "#3182bd",
  strokeWidth: 1,
  xAxisId: 0,
  yAxisId: 0,
  type: "linear",
  isAnimationActive: "auto",
  animationBegin: 0,
  animationDuration: 1500,
  animationEasing: "ease",
  animationMatchBy: matchByIndex,
  // `animationInterpolateFn` intentionally omitted here — it's optional and the
  // consumer falls back to `defaultAreaAnimateItems` (defined below) via `??`.
  shape: defaultAreaShape,
  zIndex: DefaultZIndexes.area,
} as const;

type AreaBaseLine = number | ReadonlyArray<AreaPointItem>;

// Default per-frame interpolation for Area points (the `animationInterpolateFn`
// the new AnimatedItems engine drives). Mirrors recharts 3.9
// `defaultAreaAnimateItems`: matched points tween between prev/next; added points
// snap to their final position (the clip-path reveal handles the entrance); removed
// points are dropped. t=1 returns the target identity so settled renders match.
const defaultAreaAnimateItems: AnimationInterpolateFn<AreaPointItem, CartesianLayout> = (
  items,
  animationElapsedTime,
) => {
  if (items == null) {
    // First render: clip-path animation handles the reveal.
    return [];
  }
  if (animationElapsedTime === 1) {
    return items.flatMap((item) => (item.status === "removed" ? [] : [item.next]));
  }
  return items.flatMap((item): AreaPointItem[] => {
    if (item.status === "matched") {
      return [
        {
          ...item.next,
          x: interpolate(item.prev.x, item.next.x, animationElapsedTime),
          y: interpolate(item.prev.y, item.next.y, animationElapsedTime),
        },
      ];
    }
    if (item.status === "added") {
      // Return the final position without interpolating so the clip-path
      // entrance reveal (AreaRevealShape) can do the initial animation.
      return [item.next];
    }
    // removed: drop
    return [];
  });
};

// The scalar baseLine morphs as a number (NaN/nullish animates toward 0, reference
// parity). Per-point (array) baseLines flow through the same animationInterpolateFn
// as the points (see AreaWithAnimation below).
function interpolateScalarBaseLine(
  baseLine: BaseLineType | undefined,
  prevBaseLine: BaseLineType | undefined,
  animationElapsedTime: number,
): BaseLineType {
  if (isNumber(baseLine)) {
    const previousNumberBaseLine = isNumber(prevBaseLine) ? prevBaseLine : undefined;
    return interpolate(previousNumberBaseLine, baseLine, animationElapsedTime);
  }
  if (isNullish(baseLine) || isNan(baseLine)) {
    const previousNumberBaseLine = isNumber(prevBaseLine) ? prevBaseLine : undefined;
    return interpolate(previousNumberBaseLine, 0, animationElapsedTime);
  }
  return baseLine;
}

export const Area = (props: AreaProps): JSX.Element => {
  const store = useAppStore();
  const merged = merge(areaDefaultProps, props);
  const isPanorama = useIsPanorama();
  const layout = useCartesianChartLayout();
  const id = useUniqueId("recharts-area", props.id);

  if (store != null) {
    registerInStore<AreaSettings>(
      () => ({
        id,
        type: "area",
        isPanorama,
        data: merged.data,
        dataKey: merged.dataKey ?? "",
        xAxisId: merged.xAxisId,
        yAxisId: merged.yAxisId,
        zAxisId: 0,
        hide: merged.hide,
        // Area has no bar size; the field exists only because AreaSettings shares
        // the MaybeStackedGraphicalItem shape with Bar.
        barSize: undefined,
        stackId: merged.stackId == null ? undefined : String(merged.stackId),
        connectNulls: merged.connectNulls,
        baseValue: merged.baseValue,
      }),
      {
        add: (next) => store.actions.graphicalItems.addCartesianGraphicalItem(next),
        replace: (prev, next) =>
          store.actions.graphicalItems.replaceCartesianGraphicalItem({ prev, next }),
        remove: (prev) => store.actions.graphicalItems.removeCartesianGraphicalItem(prev),
      },
    );
  }

  const area = useAppSelector((state) => selectArea(state, id, isPanorama));

  // Registers this area's tooltip payload entry (an explicit `name` prop wins,
  // else it falls back to a string dataKey).
  const tooltipConfig = createMemo<TooltipPayloadConfiguration>(() => ({
    dataDefinedOnItem: merged.data,
    getPosition: noop,
    settings: {
      stroke: merged.stroke,
      strokeWidth: merged.strokeWidth,
      fill: merged.fill,
      dataKey: merged.dataKey,
      nameKey: undefined,
      name: getTooltipNameProp(merged.name, merged.dataKey),
      hide: merged.hide,
      type: merged.tooltipType,
      color: getLegendItemColor(merged.stroke, merged.fill),
      unit: merged.unit,
      formatter: merged.formatter,
      graphicalItemId: id,
    },
  }));

  // Legend payload entry for this area (color = stroke, like recharts' getLegendItemColor).
  // `payload` mirrors recharts' resolved Area props (built explicitly — spreading the
  // Solid merge() proxy would leak a MERGE_SOURCE symbol).
  const legendPayload = createMemo<ReadonlyArray<LegendPayload>>(() => [
    {
      inactive: merged.hide,
      dataKey: merged.dataKey,
      type: merged.legendType,
      color: getLegendItemColor(merged.stroke, merged.fill),
      value: getTooltipNameProp(merged.name, merged.dataKey),
      payload: {
        activeDot: merged.activeDot,
        animationBegin: merged.animationBegin,
        animationDuration: merged.animationDuration,
        animationEasing: merged.animationEasing,
        connectNulls: merged.connectNulls,
        dataKey: merged.dataKey,
        dot: merged.dot,
        fill: merged.fill,
        fillOpacity: merged.fillOpacity,
        hide: merged.hide,
        isAnimationActive: merged.isAnimationActive,
        label: merged.label,
        legendType: merged.legendType,
        name: getTooltipNameProp(merged.name, merged.dataKey),
        stroke: merged.stroke,
        strokeWidth: merged.strokeWidth,
        type: merged.type,
        xAxisId: merged.xAxisId,
        yAxisId: merged.yAxisId,
        zIndex: merged.zIndex,
      },
    },
  ]);

  const activeTooltipIndex = useAppSelector(selectActiveTooltipIndex);
  const activeDataPoints = useActiveTooltipDataPoints();
  const tooltipActive = createMemo(() => ({
    index: activeTooltipIndex(),
    dataPoints: activeDataPoints(),
  }));

  // Clip path: recharts wraps the curves in a Layer clipped to the plot area when
  // an axis has allowDataOverflow (needClip); the clipPath id is the area's id.
  const { needClip } = useNeedsClip(merged.xAxisId, merged.yAxisId);
  const plotArea = usePlotArea();
  const curveClipPath = createMemo(() => (needClip() ? `url(#clipPath-${id})` : undefined));

  // recharts only renders <Area> inside AreaChart / ComposedChart (historical). The
  // item still REGISTERS as a graphical item in any chart; only the curves are gated.
  const chartName = useAppSelector(selectChartName);
  const chartSupportsArea = createMemo(
    () => chartName() === "AreaChart" || chartName() === "ComposedChart",
  );

  // When dots are NOT clipped to their bounding box (clipDot false), recharts emits
  // a wider `clipPath-dots-` rect (plot area expanded by the dot size); clipDot true
  // reuses the graphical-item clip path.
  const dotsClip = (): { clipDot: boolean; dotSize: number } => {
    const { r, strokeWidth } = getRadiusAndStrokeWidthFromDot(merged.dot ?? false);
    return { clipDot: isClipDot(merged.dot ?? false), dotSize: r * 2 + strokeWidth };
  };

  // One LabelList entry per data point: a zero-size viewBox at the point's (x, y).
  const labelListEntries = createMemo<ReadonlyArray<CartesianLabelListEntry>>(() => {
    const computed = area();
    if (computed == null) {
      return [];
    }
    return computed.points.map((point): CartesianLabelListEntry => {
      const viewBox: TrapezoidViewBox = {
        x: point.x ?? 0,
        y: point.y ?? 0,
        width: 0,
        lowerWidth: 0,
        upperWidth: 0,
        height: 0,
      };
      return {
        ...viewBox,
        value: point.value,
        payload: point.payload,
        viewBox,
        parentViewBox: undefined,
        fill: undefined,
      };
    });
  });
  // Labels are hidden while the entrance/update animation runs, shown once it ends.
  const { isAnimating, handleAnimationStart, handleAnimationEnd } = useAnimationCallbacks(
    () => props.onAnimationStart?.(),
    () => props.onAnimationEnd?.(),
  );
  const labelContextEntries = createMemo(() => (isAnimating() ? undefined : labelListEntries()));

  // Per-frame prev geometry (recharts' previousPointsRef / previousBaselineRef):
  // plain `{ current }` refs (NOT signals) driven by AnimatedItems +
  // useAnimationStartSnapshot — they survive the keyed remount that starts each
  // animation without themselves triggering renders.
  const previousPointsRef: MutableRef<ReadonlyArray<AreaPointItem> | null> = { current: null };
  const previousBaselineRef: MutableRef<AreaBaseLine | undefined> = { current: undefined };

  const cartesianLayout = (): CartesianLayout =>
    layout() === "vertical" ? "vertical" : "horizontal";
  const interpolateFn = (): AnimationInterpolateFn<AreaPointItem, CartesianLayout> =>
    merged.animationInterpolateFn ?? defaultAreaAnimateItems;

  // Mirrors recharts' AreaWithAnimation: a separate snapshot tracks the baseLine
  // so an interrupted animation resumes its baseLine from the in-flight value.
  const baseLineSnapshot = useAnimationStartSnapshot<AreaBaseLine | undefined>(
    () => area(),
    previousBaselineRef,
  );

  // Renders the area shape (default AreaRevealShape, or a custom `shape`) at the
  // given interpolated geometry. recharts' StaticArea: only draws when there is
  // more than one point; the dots render regardless.
  const renderShape = (
    stepPoints: ReadonlyArray<AreaPointItem>,
    stepBaseLine: AreaBaseLine | undefined,
    isRange: boolean,
    animationElapsedTime: number,
    isAnimating: boolean,
    isEntrance: boolean,
  ): JSX.Element => {
    const propsWithEvents = svgPropertiesAndEvents({ ...props });
    const curveProps: AreaRevealShapeProps = {
      ...propsWithEvents,
      id,
      points: stepPoints,
      connectNulls: merged.connectNulls,
      type: merged.type,
      baseLine: stepBaseLine,
      layout: cartesianLayout(),
      stroke: merged.stroke,
      fill: merged.fill,
      fillOpacity: merged.fillOpacity,
      strokeWidth: merged.strokeWidth,
      isRange,
      animationElapsedTime,
      isAnimating,
      isEntrance,
    };
    return (
      <>
        {stepPoints.length > 1 ? (
          <Layer clipPath={curveClipPath()}>
            <Shape<AreaRevealShapeProps, SVGPathElement>
              option={merged.shape}
              DefaultShape={AreaRevealShape}
              shapeProps={curveProps}
            />
          </Layer>
        ) : null}
        <Dots
          points={stepPoints}
          dot={merged.dot ?? false}
          class="recharts-area-dots"
          dotClass="recharts-area-dot"
          dataKey={merged.dataKey}
          needClip={needClip()}
          clipPathId={id}
          baseProps={svgPropertiesNoEvents({
            stroke: merged.stroke,
            strokeWidth: merged.strokeWidth,
            fill: merged.fill,
            fillOpacity: merged.fillOpacity,
          })}
        />
      </>
    );
  };

  return (
    <>
      <SetTooltipEntrySettings tooltipEntrySettings={tooltipConfig()} />
      <SetLegendPayload id={id} legendPayload={legendPayload()} />
      <Show when={chartSupportsArea() && !merged.hide && area()}>
        {(computed) => (
          // Wrapped in <ZIndexLayer> (default 100) so a `zIndex` prop relayers the
          // whole area (curve + dots + active points) into its portal — recharts
          // wraps the entire `.recharts-area` Layer + ActivePoints in ZIndexLayer.
          <ZIndexLayer zIndex={merged.zIndex}>
            <Layer class={merged.class ? `recharts-area ${merged.class}` : "recharts-area"}>
              <Show when={needClip()}>
                <defs>
                  <GraphicalItemClipPath
                    clipPathId={id}
                    xAxisId={merged.xAxisId}
                    yAxisId={merged.yAxisId}
                  />
                  <Show when={!dotsClip().clipDot && plotArea()}>
                    {(pa) => (
                      <clipPath id={`clipPath-dots-${id}`}>
                        <rect
                          x={pa().x - dotsClip().dotSize / 2}
                          y={pa().y - dotsClip().dotSize / 2}
                          width={pa().width + dotsClip().dotSize}
                          height={pa().height + dotsClip().dotSize}
                        />
                      </clipPath>
                    )}
                  </Show>
                </defs>
              </Show>
              <CartesianLabelListContextProvider value={labelContextEntries}>
                <AnimatedItems
                  animationInput={computed()}
                  animationIdPrefix="recharts-area-"
                  items={computed().points}
                  previousItemsRef={previousPointsRef}
                  isAnimationActive={merged.isAnimationActive}
                  animationBegin={merged.animationBegin}
                  animationDuration={merged.animationDuration}
                  animationEasing={merged.animationEasing}
                  onAnimationStart={handleAnimationStart}
                  onAnimationEnd={handleAnimationEnd}
                  animationInterpolateFn={interpolateFn()}
                  animationMatchBy={merged.animationMatchBy}
                  layout={cartesianLayout()}
                >
                  {(stepPoints, animationElapsedTime, isEntrance) => {
                    const target = computed();
                    const baseLine = target.baseLine;
                    const prevBaseLine = baseLineSnapshot.startValue();
                    // The baseLine morphs alongside the points. A per-point (array)
                    // baseLine flows through the SAME interpolation fn (matched on the
                    // same strategy); a scalar baseLine interpolates linearly. t=1
                    // returns the target identity; the entrance frame keeps the scalar
                    // baseLine fixed (the clip-reveal handles the entrance reveal).
                    let stepBaseLine: AreaBaseLine | undefined;
                    if (animationElapsedTime === 1) {
                      stepBaseLine = baseLine;
                    } else if (typeof baseLine !== "number") {
                      let baseLineItems: ReadonlyArray<AnimationItem<AreaPointItem>> | null;
                      if (typeof prevBaseLine !== "number" && prevBaseLine != null) {
                        baseLineItems = matchAnimationItems(
                          prevBaseLine,
                          baseLine,
                          merged.animationMatchBy,
                        );
                      } else {
                        baseLineItems = matchAnimationItems(
                          null,
                          baseLine,
                          merged.animationMatchBy,
                        );
                      }
                      stepBaseLine = interpolateFn()(
                        baseLineItems,
                        animationElapsedTime,
                        cartesianLayout(),
                      );
                    } else {
                      stepBaseLine = isEntrance
                        ? baseLine
                        : interpolateScalarBaseLine(baseLine, prevBaseLine, animationElapsedTime);
                    }
                    baseLineSnapshot.syncStepValue(
                      stepBaseLine,
                      animationElapsedTime,
                      animationElapsedTime > 0,
                    );
                    // recharts' useAnimationStartSnapshot refreshes the frozen
                    // start value at t=1, so its `isEntrance` flips false on the
                    // settled frame. Our snapshot memo doesn't refresh at t=1, so
                    // we mirror the observable result: the settled (t=1) frame is
                    // never an entrance (the reveal clip is gone there anyway).
                    const effectiveIsEntrance = isEntrance && animationElapsedTime < 1;
                    return renderShape(
                      stepPoints,
                      stepBaseLine,
                      target.isRange,
                      animationElapsedTime,
                      isAnimating() || animationElapsedTime < 1,
                      effectiveIsEntrance,
                    );
                  }}
                </AnimatedItems>
                <LabelListFromLabelProp label={merged.label} />
              </CartesianLabelListContextProvider>
              {(() => {
                const t = tooltipActive();
                const renderActiveLayer = (
                  layerPoints: ReadonlyArray<AreaPointItem>,
                ): JSX.Element => {
                  const state = computeActivePointState({
                    points: layerPoints,
                    activeTooltipIndex: t.index,
                    activeDataPoints: t.dataPoints,
                    activeDot: merged.activeDot,
                    mainColor: getLegendItemColor(merged.stroke, merged.fill),
                    itemDataKey: merged.dataKey,
                  });
                  if (state == null) {
                    return null;
                  }
                  return renderActivePointsLayerFromState(state, {
                    points: layerPoints,
                    activeDot: merged.activeDot,
                    mainColor: getLegendItemColor(merged.stroke, merged.fill),
                    itemDataKey: merged.dataKey,
                  });
                };
                // Range areas activate a dot on BOTH the high edge (points) and the
                // low edge (baseLine) — recharts renders two <ActivePoints>.
                const bl = computed().baseLine;
                return (
                  <>
                    {renderActiveLayer(computed().points)}
                    {computed().isRange && Array.isArray(bl) ? renderActiveLayer(bl) : null}
                  </>
                );
              })()}
            </Layer>
          </ZIndexLayer>
        )}
      </Show>
    </>
  );
};
