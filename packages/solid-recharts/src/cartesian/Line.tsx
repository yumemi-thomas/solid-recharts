// Ported from recharts 3.9.0 src/cartesian/Line.tsx.
//
// FULLY WIRED: graphical-item registration, points selection, drawing (the
// default <LineDrawShape>), dots + activeDot, labels, legend/tooltip payload
// registration, ErrorBar context, clip paths, and animation on the v3.9 engine —
// the entrance stroke-dasharray draw-in (via useAnimatedLineLength + LineDrawShape)
// AND the data-change point morph (via <AnimatedItems> + defaultLineAnimateItems,
// replacing the legacy <JavascriptAnimate> + manual prevPoints tracking).
// zIndex relayering IS wired: the whole `.recharts-line` Layer is wrapped in
// <ZIndexLayer> (default DefaultZIndexes.line = 400), matching recharts.
//
// Deviations:
//   - `resolveDefaultProps` → `merge` (default props).
//   - `RegisterGraphicalItemId` + `SetCartesianGraphicalItem` (effect-dispatch
//     components) → a single `createEffect` add/replace + `onCleanup` remove,
//     matching the XAxis/YAxis registration idiom.
//   - `ReactUtils.isClipDot` (React-divergent) is not ported; clip-dot handling is
//     part of the deferred dot rendering.
//   - `LinePointItem.value` is typed `unknown` (recharts types it `number` via
//     `any`); the value comes from `getValueByDataKey`, which is genuinely
//     untyped, and only x/y are needed to draw. It flows through `scale.map`
//     (which accepts `unknown`) unchanged.
import { createEffect, createMemo, createSignal, merge, Show, untrack } from "solid-js";
import { useActiveTooltipDataPoints } from "../hooks";
import { selectActiveTooltipIndex } from "../state/selectors/tooltipSelectors";
import type { JSX } from "@solidjs/web";
import { useAppSelector, useAppStore } from "../state/hooks";
import {
  AnimatedItems,
  useAnimationCallbacks,
  type AnimationInterpolateFn,
} from "../animation/AnimatedItems";
import { matchByIndex, type AnimationItem, type AnimationMatchByProp } from "../animation/matchBy";
import type { MutableRef } from "../animation/useAnimationStartSnapshot";
import { LineDrawShape, type LineDrawShapeProps } from "./LineDrawShape";
import { useAnimatedLineLength } from "./useAnimatedLineLength";
import type { EasingInput } from "../animation/easing";
import { SetTooltipEntrySettings } from "../state/SetTooltipEntrySettings";
import { TooltipPayloadConfiguration } from "../state/tooltipSlice";
import { SetLegendPayload } from "../state/SetLegendPayload";
import { LegendPayload } from "../component/DefaultLegendContent";
import type { Formatter } from "../component/DefaultTooltipContent";
import { useIsPanorama } from "../context/PanoramaContext";
import { useCartesianChartLayout } from "../context/chartLayoutContext";
import { useUniqueId } from "../util/useUniqueId";
import { Layer } from "../container/Layer";
import type { CurveType, CurveProps } from "../shape/Curve";
import { Dots, isClipDot } from "../component/Dots";
import {
  type CartesianLabelListEntry,
  CartesianLabelListContextProvider,
  type ImplicitLabelListType,
  LabelListFromLabelProp,
} from "../component/LabelList";
import type { TrapezoidViewBox } from "../util/types";
import { getRadiusAndStrokeWidthFromDot } from "../util/getRadiusAndStrokeWidthFromDot";
import { pickEventHandlers } from "../util/adaptEventHandlers";
import { usePlotArea } from "../hooks";
import { RegisterGraphicalItemId } from "../context/RegisterGraphicalItemId";
import { SetErrorBarContext } from "../context/ErrorBarContext";
import type { ErrorBarDataItem, ErrorBarDataPointFormatter } from "./ErrorBar";
import { selectLinePoints } from "../state/selectors/lineSelectors";
import { LineSettings } from "../state/types/LineSettings";
import { AxisId } from "../state/cartesianAxisSlice";
import { ChartData } from "../state/chartDataSlice";
import {
  ActiveDotType,
  ActiveShape,
  AnimationDuration,
  CartesianLayout,
  DataKey,
  DotType,
  LegendType,
  TickItem,
  TooltipType,
} from "../util/types";
import {
  computeActivePointState,
  renderActivePointsLayerFromState,
} from "../component/ActivePoints";
import { getCateCoordinateOfLine, getTooltipNameProp, getValueByDataKey } from "../util/ChartUtils";
import { interpolate, isNotNil, isNullish, noop } from "../util/DataUtils";
import { BaseAxisWithScale } from "../state/selectors/axisSelectors";
import { GraphicalItemClipPath, useNeedsClip } from "./GraphicalItemClipPath";
import { DefaultZIndexes } from "../zIndex/DefaultZIndexes";
import { ZIndexLayer } from "../zIndex/ZIndexLayer";
import { registerInStore } from "../state/registerInStore";

export interface LinePointItem {
  readonly value: unknown;
  readonly payload?: unknown;
  /**
   * Line coordinates can have gaps (the `connectNulls` prop bridges them), so a
   * point may have `null` x or y.
   */
  x: number | null;
  y: number | null;
}

export function computeLinePoints({
  layout,
  xAxis,
  yAxis,
  xAxisTicks,
  yAxisTicks,
  dataKey,
  bandSize,
  displayedData,
}: {
  layout: CartesianLayout;
  xAxis: BaseAxisWithScale;
  yAxis: BaseAxisWithScale;
  xAxisTicks: TickItem[];
  yAxisTicks: TickItem[];
  dataKey: DataKey<unknown> | undefined;
  bandSize: number;
  displayedData: ChartData;
}): ReadonlyArray<LinePointItem> {
  return displayedData
    .map((entry, index): LinePointItem | null => {
      const value = getValueByDataKey(entry, dataKey);

      if (layout === "horizontal") {
        const x = getCateCoordinateOfLine({
          axis: xAxis,
          ticks: xAxisTicks,
          bandSize,
          entry,
          index,
        });
        const y = isNullish(value) ? null : yAxis.scale.map(value);
        return {
          x,
          y: y ?? null,
          value,
          payload: entry,
        };
      }

      const x = isNullish(value) ? null : xAxis.scale.map(value);
      const y = getCateCoordinateOfLine({ axis: yAxis, ticks: yAxisTicks, bandSize, entry, index });
      if (x == null || y == null) {
        return null;
      }
      return {
        x,
        y,
        value,
        payload: entry,
      };
    })
    .filter(isNotNil);
}

// SVG props (including event handlers) that Line forwards onto its <Curve>, minus
// the ones Line computes itself or redeclares below with a narrower type. Mirrors
// recharts `LineSvgProps = Omit<CurveProps, ...>` so `<Line onClick={...} />` and
// other path attributes/events type-check on the public surface.
type LineSvgProps = Omit<
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
  | "strokeDasharray"
  | "fill"
  | "children"
>;

export interface LineProps extends LineSvgProps {
  xAxisId?: AxisId;
  yAxisId?: AxisId;
  dataKey?: DataKey<unknown>;
  data?: ChartData;
  /** Tooltip/legend display name; falls back to the dataKey. */
  name?: string | number;
  /** Unit appended in the tooltip (recharts `unit` prop). */
  unit?: string | number | null;
  /** `'none'` hides this series from the tooltip payload. */
  tooltipType?: TooltipType;
  /** Formats this Line's tooltip value; takes precedence over the Tooltip-level `formatter`. */
  formatter?: Formatter;
  type?: CurveType;
  stroke?: string;
  strokeWidth?: number;
  strokeDasharray?: string | number;
  fill?: string;
  connectNulls?: boolean;
  hide?: boolean;
  dot?: DotType;
  activeDot?: ActiveDotType;
  animateNewValues?: boolean;
  isAnimationActive?: boolean | "auto";
  animationBegin?: number;
  animationDuration?: AnimationDuration;
  animationEasing?: EasingInput;
  onAnimationStart?: () => void;
  onAnimationEnd?: () => void;
  /** Custom per-frame interpolation for the line points (v3.9). */
  animationInterpolateFn?: AnimationInterpolateFn<LinePointItem, CartesianLayout>;
  /** How prev/next points are matched across data updates (v3.9). @defaultValue matchByIndex */
  animationMatchBy?: AnimationMatchByProp<LinePointItem>;
  label?: ImplicitLabelListType;
  legendType?: LegendType;
  /** Custom line shape (function render-prop or props object). @defaultValue LineDrawShape */
  shape?: ActiveShape<LineDrawShapeProps, SVGPathElement>;
  zIndex?: number;
  id?: string;
  class?: string;
  /** Children (e.g. <ErrorBar>, <LabelList>) rendered within the item's contexts. */
  children?: JSX.Element;
}

// Compute the average x-shift between matched pairs (prev → next): the overall
// direction and magnitude of the data movement, used to extrapolate the entry/exit
// position of added/removed points (recharts `averageShift`).
function averageShift(items: ReadonlyArray<AnimationItem<LinePointItem>>): number {
  let total = 0;
  let count = 0;
  for (const item of items) {
    if (item.status === "matched" && item.prev.x != null && item.next.x != null) {
      total += item.next.x - item.prev.x;
      count++;
    }
  }
  return count > 0 ? total / count : 0;
}

// Default per-frame interpolation for Line points (the `animationInterpolateFn`
// the new AnimatedItems engine drives). Mirrors recharts 3.9 `defaultLineAnimateItems`:
// matched points tween prev→next; added points enter from where they "would have
// been" (extrapolated by the average shift); removed points exit by the same shift.
// On first render returns [] — the entrance is driven by stroke-dasharray reveal.
const defaultLineAnimateItems: AnimationInterpolateFn<LinePointItem, CartesianLayout> = (
  items,
  animationElapsedTime,
) => {
  if (items == null) {
    return [];
  }
  if (animationElapsedTime === 1) {
    return items.flatMap((item) => (item.status === "removed" ? [] : [item.next]));
  }

  const shift = averageShift(items);
  const result: LinePointItem[] = [];

  for (const item of items) {
    if (item.status === "matched") {
      result.push({
        ...item.next,
        x: interpolate(item.prev.x, item.next.x, animationElapsedTime),
        y: interpolate(item.prev.y, item.next.y, animationElapsedTime),
      });
    } else if (item.status === "added") {
      if (item.next.x != null) {
        const entryX = item.next.x - shift;
        result.push({
          ...item.next,
          x: interpolate(entryX, item.next.x, animationElapsedTime),
          y: item.next.y,
        });
      } else {
        result.push(item.next);
      }
    } else if (item.status === "removed") {
      if (item.prev.x != null) {
        const exitX = item.prev.x + shift;
        result.push({
          ...item.prev,
          x: interpolate(item.prev.x, exitX, animationElapsedTime),
          y: item.prev.y,
        });
      }
      // else: removed items are simply dropped
    }
  }

  return result;
};

const coerceErrorVal = (value: unknown): number[] | number | undefined => {
  if (typeof value === "number") {
    return value;
  }
  if (value != null && Array.isArray(value)) {
    const nums = value.filter((v): v is number => typeof v === "number");
    return nums.length === value.length ? nums : undefined;
  }
  return undefined;
};

// Maps a LinePointItem (erased to `unknown` by the ErrorBar context) to the
// {x, y, value, errorVal} an ErrorBar needs.
const lineErrorBarFormatter: ErrorBarDataPointFormatter = (entry, dataKey): ErrorBarDataItem => {
  // `entry` is a LinePointItem erased to `unknown` by the context; read its fields
  // via getValueByDataKey (accepts unknown) to stay cast-free.
  const x = getValueByDataKey(entry, "x");
  const y = getValueByDataKey(entry, "y");
  const value = getValueByDataKey(entry, "value");
  const payload = getValueByDataKey(entry, "payload");
  return {
    x: typeof x === "number" ? x : undefined,
    y: typeof y === "number" ? y : undefined,
    value: typeof value === "number" ? value : 0,
    errorVal: coerceErrorVal(getValueByDataKey(payload, dataKey)),
  };
};

export const lineDefaultProps = {
  activeDot: true,
  animateNewValues: true,
  connectNulls: false,
  dot: true,
  fill: "#fff",
  hide: false,
  stroke: "#3182bd",
  strokeWidth: 1,
  xAxisId: 0,
  yAxisId: 0,
  type: "linear",
  isAnimationActive: "auto",
  animationBegin: 0,
  animationDuration: 1500,
  animationEasing: "ease",
  animationInterpolateFn: defaultLineAnimateItems,
  animationMatchBy: matchByIndex,
  label: false,
  legendType: "line",
  shape: LineDrawShape,
  zIndex: DefaultZIndexes.line,
} as const;

export const Line = (props: LineProps): JSX.Element => {
  const store = useAppStore();
  const merged = merge(lineDefaultProps, props);
  const isPanorama = useIsPanorama();
  const layout = useCartesianChartLayout();
  const id = useUniqueId("recharts-line", props.id);

  if (store != null) {
    registerInStore<LineSettings>(
      () => ({
        id,
        type: "line",
        isPanorama,
        data: merged.data,
        dataKey: merged.dataKey,
        xAxisId: merged.xAxisId,
        yAxisId: merged.yAxisId,
        zAxisId: 0,
        hide: merged.hide,
      }),
      {
        add: (next) => store.actions.graphicalItems.addCartesianGraphicalItem(next),
        replace: (prev, next) =>
          store.actions.graphicalItems.replaceCartesianGraphicalItem({ prev, next }),
        remove: (prev) => store.actions.graphicalItems.removeCartesianGraphicalItem(prev),
      },
    );
  }

  const points = useAppSelector((state) =>
    selectLinePoints(state, merged.xAxisId, merged.yAxisId, isPanorama, id),
  );

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
      color: merged.stroke,
      unit: merged.unit,
      formatter: merged.formatter,
      graphicalItemId: id,
    },
  }));

  // Legend payload entry for this line.
  const legendPayload = createMemo<ReadonlyArray<LegendPayload>>(() => [
    {
      inactive: merged.hide,
      dataKey: merged.dataKey,
      type: merged.legendType,
      color: merged.stroke,
      value: getTooltipNameProp(merged.name, merged.dataKey),
      payload: {
        activeDot: merged.activeDot,
        animateNewValues: merged.animateNewValues,
        animationBegin: merged.animationBegin,
        animationDuration: merged.animationDuration,
        animationEasing: merged.animationEasing,
        connectNulls: merged.connectNulls,
        dataKey: merged.dataKey,
        dot: merged.dot,
        fill: merged.fill,
        hide: merged.hide,
        id: merged.id,
        isAnimationActive: merged.isAnimationActive,
        label: merged.label,
        legendType: merged.legendType,
        name: merged.name,
        shape: merged.shape,
        stroke: merged.stroke,
        strokeWidth: merged.strokeWidth,
        type: merged.type,
        xAxisId: merged.xAxisId,
        yAxisId: merged.yAxisId,
        zIndex: merged.zIndex,
      },
    },
  ]);

  // Entrance animation: the curve "draws" via stroke-dasharray (the `d` is morphed
  // by AnimatedItems on a data change, but the entrance reveal itself is dash-only).
  // The new v3.9 engine drives this through <AnimatedItems> + <LineDrawShape>:
  //   - `previousItemsRef` holds the last visible point frame so a re-animation
  //     (data change) tweens from where the line currently is (managed by
  //     useAnimationStartSnapshot inside AnimatedItems).
  //   - `useAnimatedLineLength` tracks the monotonically-growing visible length so a
  //     mid-animation data change continues the dash from the furthest length drawn
  //     (recharts' startingLengthRef / maxAnimatedLengthRef) and returns null once
  //     full (no entrance dasharray needed).
  //   - `totalLength` is measured off the rendered path (in an effect, NOT a ref —
  //     refs fire before the dynamic `d` lands, where getTotalLength() is 0).
  const [totalLength, setTotalLength] = createSignal(0);
  let curveEl: SVGPathElement | undefined;
  const forwardPathRef = (el: SVGPathElement): void => {
    curveEl = el;
  };
  const previousPointsRef: MutableRef<ReadonlyArray<LinePointItem> | null | undefined> = {
    current: null,
  };
  const animatedLineLength = useAnimatedLineLength();

  const activeTooltipIndex = useAppSelector(selectActiveTooltipIndex);
  const activeDataPoints = useActiveTooltipDataPoints();

  const { needClip } = useNeedsClip(merged.xAxisId, merged.yAxisId);
  const plotArea = usePlotArea();
  // Line is only ever horizontal | vertical (the render Show below cannot mount in
  // any other layout); coerce for the AnimatedItems layout prop.
  const cartesianLayout = (): CartesianLayout =>
    layout() === "vertical" ? "vertical" : "horizontal";

  // One LabelList entry per data point: a zero-size viewBox at the point's (x, y).
  // recharts does not pass parentViewBox here (labels can escape) — mirrored.
  const labelListEntries = createMemo<ReadonlyArray<CartesianLabelListEntry>>(() => {
    const pts = points();
    if (pts == null) {
      return [];
    }
    return pts.map((point): CartesianLabelListEntry => {
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
  // Labels are hidden while the entrance animation runs and shown once it ends
  // (matching recharts: showLabels = !isAnimating).
  const { isAnimating, handleAnimationStart, handleAnimationEnd } = useAnimationCallbacks(
    () => props.onAnimationStart?.(),
    () => props.onAnimationEnd?.(),
  );
  const labelContextEntries = createMemo(() => (isAnimating() ? undefined : labelListEntries()));

  // Measure on data change AND on animation start/end (showLabels flips): a
  // data-change morph alters the path geometry per frame, so the length taken
  // at the morph's first frame is the OLD curve's; re-measuring once the final
  // frame committed (effects run after render effects in the flush) gives the
  // settled dasharray the new curve's true length — mirroring recharts, which
  // recomputes totalLength on the post-animation re-render.
  createEffect(
    () => ({ points: points(), showLabels: !isAnimating() }),
    () => {
      if (curveEl?.getTotalLength == null) {
        return;
      }
      let length = 0;
      try {
        length = curveEl.getTotalLength() || 0;
      } catch {
        return; // getTotalLength can throw on detached/empty paths — keep the last value.
      }
      setTotalLength(length);
    },
  );

  // Raw user event handlers forwarded to the curve. recharts' StaticCurve spreads
  // `svgPropertiesAndEvents(others)` onto the curve and Curve rewraps them props-first
  // via `adaptEventHandlers`; we forward the raw handlers and let Curve do the wrap.
  const eventHandlers = (): Record<string, unknown> => pickEventHandlers(props);

  // When the dots are NOT clipped to the dot bounding box (clipDot false), recharts
  // emits a wider `clipPath-dots-` rect (plot area expanded by the dot size) and the
  // Dots wrapper references it; clipDot true reuses the graphical-item clip path.
  const dotsClip = (): { clipDot: boolean; dotSize: number } => {
    const { r, strokeWidth } = getRadiusAndStrokeWidthFromDot(merged.dot);
    return { clipDot: isClipDot(merged.dot), dotSize: r * 2 + strokeWidth };
  };
  const tooltipActive = createMemo(() => ({
    index: activeTooltipIndex(),
    dataPoints: activeDataPoints(),
  }));
  const curveClipPath = createMemo(() => (needClip() ? `url(#clipPath-${id})` : undefined));
  // recharts emits the plot-area width/height as raw DOM attributes on the curve
  // path (the "Render 1 line" attr-set spec asserts them). SVG <path> has no typed
  // width/height, so spread them as a plain object rather than typed JSX props.
  const curveSizeAttrs = (): Record<string, number> => {
    const area = plotArea();
    if (area == null) {
      return {};
    }
    return { width: area.width, height: area.height };
  };
  // Guard for shouldUpdatePreviousRef: don't commit the previous-points ref before
  // the SVG path length has been measured (recharts gates on `t > 0 && totalLength
  // > 0`). totalLength() is read untracked — this is called from the animation
  // render-prop where reactive subscription would be a write-in-computation.
  const shouldUpdatePreviousRef = (animationElapsedTime: number): boolean =>
    animationElapsedTime > 0 && untrack(totalLength) > 0;

  // Whether to apply the entrance/draw shape (skip when a custom shape is supplied,
  // mirroring recharts: a custom shape opts out of the built-in dasharray reveal).
  const hasCustomShape = (): boolean => merged.shape !== LineDrawShape;

  return (
    <>
      <SetTooltipEntrySettings tooltipEntrySettings={tooltipConfig()} />
      <SetLegendPayload id={id} legendPayload={legendPayload()} />
      <Show when={!merged.hide && points()}>
        {(pts) => (
          // The line group carries "recharts-line" plus the user's `class`
          // (recharts: clsx('recharts-line', className)). Wrapped in <ZIndexLayer>
          // (default 400) so a `zIndex` prop relayers the whole line into its portal
          // — recharts wraps the entire `.recharts-line` Layer in ZIndexLayer.
          <ZIndexLayer zIndex={merged.zIndex}>
            <Layer class={merged.class == null ? "recharts-line" : `recharts-line ${merged.class}`}>
              <Show when={needClip()}>
                <defs>
                  <GraphicalItemClipPath
                    clipPathId={id}
                    xAxisId={merged.xAxisId}
                    yAxisId={merged.yAxisId}
                  />
                  <Show when={!dotsClip().clipDot && plotArea()}>
                    {(area) => (
                      <clipPath id={`clipPath-dots-${id}`}>
                        <rect
                          x={area().x - dotsClip().dotSize / 2}
                          y={area().y - dotsClip().dotSize / 2}
                          width={area().width + dotsClip().dotSize}
                          height={area().height + dotsClip().dotSize}
                        />
                      </clipPath>
                    )}
                  </Show>
                </defs>
              </Show>
              <CartesianLabelListContextProvider value={labelContextEntries}>
                <AnimatedItems
                  animationInput={pts()}
                  animationIdPrefix="recharts-line-"
                  items={pts()}
                  previousItemsRef={previousPointsRef}
                  isAnimationActive={merged.isAnimationActive}
                  animationBegin={merged.animationBegin}
                  animationDuration={merged.animationDuration}
                  animationEasing={merged.animationEasing}
                  onAnimationStart={handleAnimationStart}
                  onAnimationEnd={handleAnimationEnd}
                  animationInterpolateFn={merged.animationInterpolateFn}
                  animationMatchBy={merged.animationMatchBy}
                  shouldUpdatePreviousRef={shouldUpdatePreviousRef}
                  layout={cartesianLayout()}
                >
                  {(frame, animationElapsedTime, isEntrance) => {
                    // Detect a data change (ref-compare) before measuring the visible
                    // length, so a mid-animation data swap resumes the dash from the
                    // furthest length already drawn — recharts does this in render via
                    // useAnimatedLineLength's prevPointsRef compare.
                    animatedLineLength.markDataChange(untrack(pts));
                    // recharts: visibleLength is computed only while the animation is
                    // active; once settled it is null so no entrance dasharray remains.
                    const len = untrack(totalLength);
                    const animationActive = untrack(isAnimating) || animationElapsedTime < 1;
                    const visibleLength = animationActive
                      ? animatedLineLength.getVisibleLength(animationElapsedTime, len)
                      : null;
                    // recharts only draws the curve path when there is more than one
                    // point (a single point is a lone dot, no line).
                    const shapeProps = (): LineDrawShapeProps => ({
                      class: "recharts-line-curve",
                      id,
                      points: frame,
                      type: merged.type,
                      layout: layout(),
                      connectNulls: merged.connectNulls,
                      fill: "none",
                      stroke: merged.stroke,
                      strokeWidth: merged.strokeWidth,
                      strokeDasharray: merged.strokeDasharray,
                      animationElapsedTime,
                      isAnimating: animationActive,
                      isEntrance: merged.animateNewValues ? isEntrance : false,
                      visibleLength,
                      forwardPathRef,
                      ...eventHandlers(),
                      ...curveSizeAttrs(),
                      ...(curveClipPath() != null ? { clipPath: curveClipPath() } : {}),
                    });
                    const customShape = merged.shape;
                    return (
                      <>
                        <Show when={frame.length > 1}>
                          {hasCustomShape() && typeof customShape === "function" ? (
                            customShape(shapeProps())
                          ) : (
                            <LineDrawShape {...shapeProps()} />
                          )}
                        </Show>
                        {/* Dots live inside the animation frame (recharts StaticCurve
                            renders them from stepData), so a data-change morph moves
                            the dots with the curve. */}
                        <Dots
                          points={frame}
                          dot={merged.dot}
                          class="recharts-line-dots"
                          dotClass="recharts-line-dot"
                          dataKey={merged.dataKey}
                          needClip={needClip()}
                          clipPathId={id}
                          baseProps={{
                            stroke: merged.stroke,
                            strokeWidth: merged.strokeWidth,
                            fill: merged.fill,
                          }}
                        />
                      </>
                    );
                  }}
                </AnimatedItems>
                <LabelListFromLabelProp label={merged.label} />
              </CartesianLabelListContextProvider>
            </Layer>
          </ZIndexLayer>
        )}
      </Show>
      <>
        {(() => {
          const pts = points();
          if (pts == null) {
            return null;
          }
          const t = tooltipActive();
          const state = computeActivePointState({
            points: pts,
            activeTooltipIndex: t.index,
            activeDataPoints: t.dataPoints,
            activeDot: merged.activeDot,
            mainColor: merged.stroke,
            itemDataKey: merged.dataKey,
            clipPath: needClip() ? `url(#clipPath-${id})` : undefined,
          });
          if (state == null) {
            return null;
          }
          return renderActivePointsLayerFromState(state, {
            points: pts,
            activeDot: merged.activeDot,
            mainColor: merged.stroke,
            itemDataKey: merged.dataKey,
            clipPath: needClip() ? `url(#clipPath-${id})` : undefined,
          });
        })()}
      </>
      {/* Provide the item's id + data/axes to children (ErrorBar/LabelList).
          Rendered unconditionally so ErrorBar registers and can extend the axis
          domain even before/independent of the curve drawing. */}
      <RegisterGraphicalItemId type="line" id={id}>
        {() => (
          <SetErrorBarContext
            xAxisId={merged.xAxisId}
            yAxisId={merged.yAxisId}
            data={points() ?? []}
            dataPointFormatter={lineErrorBarFormatter}
            errorBarOffset={0}
          >
            <CartesianLabelListContextProvider value={labelContextEntries}>
              {props.children}
            </CartesianLabelListContextProvider>
          </SetErrorBarContext>
        )}
      </RegisterGraphicalItemId>
    </>
  );
};
