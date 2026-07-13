// Ported from recharts 3.8.1 src/polar/Radar.tsx (commit 7a23854).
//
// MINIMAL PORT — registers a RadarSettings polar graphical item (so the angle
// axis gets a data-driven domain) and renders the radar <Polygon> from the
// computed points. `computeRadarPoints` is the pure point-geometry function,
// ported faithfully (incl. the isRange/baseLinePoints branch).
//
// Solid deviations: `resolveDefaultProps`→`merge`; effect-dispatch registration
// → `createEffect`/`onCleanup` (addPolarGraphicalItem matched by id); `clsx`→array.
// Tooltip-entry + legend-payload registration are WIRED (axis-type tooltip).
// Animation is WIRED on the v3.9 engine: the polygon (and, for range radars, its
// baseline) is driven by <AnimatedItems> + `defaultRadarAnimateItems` (matched points
// tween prev→next x/y; added points grow from the (cx,cy) center; removed points drop;
// animationInterpolateFn/animationMatchBy props override). Dots (recharts-radar-dot,
// function/boolean/object) render INSIDE the animation frame from the interpolated
// stepData (recharts' StaticPolygon renders <Dots> next to the polygon), so they move
// with the polygon during entrance/update animations. Labels
// (LabelList from the implicit `label` prop, via a Cartesian label-list context)
// and the function-form custom polygon `shape` ARE wired. activeDot / ActivePoints
// IS wired (default/object/function form; element-form is N/A by design — needs
// cloneElement). PERMANENT-N/A: element-form `shape`. DEFERRED: object-form
// `shape`. zIndex relayering IS wired: the `.recharts-radar` Layer is wrapped in
// <ZIndexLayer> (default DefaultZIndexes.area = 100), matching recharts.
import { createMemo, merge, Show } from "solid-js";
import type { JSX } from "@solidjs/web";
import { useAppSelector, useAppStore } from "../state/hooks";
import { useIsPanorama } from "../context/PanoramaContext";
import { useUniqueId } from "../util/useUniqueId";
import { usePolarChartLayout } from "../context/chartLayoutContext";
import {
  AnimatedItems,
  type AnimationInterpolateFn,
  useAnimationCallbacks,
} from "../animation/AnimatedItems";
import { matchAnimationItems, matchByIndex, type AnimationMatchByProp } from "../animation/matchBy";
import { useAnimationStartSnapshot, type MutableRef } from "../animation/useAnimationStartSnapshot";
import type { EasingInput } from "../animation/easing";
import { Layer } from "../container/Layer";
import { DefaultZIndexes } from "../zIndex/DefaultZIndexes";
import { ZIndexLayer } from "../zIndex/ZIndexLayer";
import { Polygon } from "../shape/Polygon";
import { Shape } from "../util/ActiveShapeUtils";
import { Dots } from "../component/Dots";
import {
  computeActivePointState,
  renderActivePointsLayerFromState,
} from "../component/ActivePoints";
import { useActiveTooltipDataPoints } from "../hooks";
import { selectActiveTooltipIndex } from "../state/selectors/tooltipSelectors";
import {
  type CartesianLabelListEntry,
  CartesianLabelListContextProvider,
  type ImplicitLabelListType,
  LabelListFromLabelProp,
} from "../component/LabelList";
import { selectRadarPoints } from "../state/selectors/radarSelectors";
import { RadarSettings } from "../state/types/RadarSettings";
import { ChartData } from "../state/chartDataSlice";
import {
  ActiveDotType,
  ActiveShape,
  AnimationDuration,
  DataKey,
  DotType,
  LegendType,
  PolarLayout,
  TooltipType,
} from "../util/types";
import { polarToCartesian } from "../util/PolarUtils";
import { interpolate, isNullish, noop } from "../util/DataUtils";
import { getTooltipNameProp, getValueByDataKey } from "../util/ChartUtils";
import { RechartsScale } from "../util/scale/RechartsScale";
import { SetTooltipEntrySettings } from "../state/SetTooltipEntrySettings";
import { SetLegendPayload } from "../state/SetLegendPayload";
import { LegendPayload } from "../component/DefaultLegendContent";
import { TooltipPayloadConfiguration } from "../state/tooltipSlice";
import { registerInStore } from "../state/registerInStore";

/** recharts: stroke (if not "none") wins as the legend/tooltip color, else fill. */
const getLegendItemColor = (
  stroke: string | undefined,
  fill: string | undefined,
): string | undefined => (stroke != null && stroke !== "none" ? stroke : fill);

export interface RadarPoint {
  x: number;
  y: number;
  cx?: number;
  cy?: number;
  angle: number;
  radius?: number;
  value?: unknown;
  payload?: unknown;
  name?: string | number;
}

export type RadiusAxisForRadar = { scale: RechartsScale };
export type AngleAxisForRadar = {
  scale: RechartsScale;
  type: "number" | "category";
  dataKey: DataKey<unknown> | undefined;
  cx: number;
  cy: number;
};

export type RadarComposedData = {
  points: RadarPoint[];
  baseLinePoints: RadarPoint[];
  isRange: boolean;
};

export function computeRadarPoints({
  radiusAxis,
  angleAxis,
  displayedData,
  dataKey,
  bandSize,
}: {
  radiusAxis: RadiusAxisForRadar;
  angleAxis: AngleAxisForRadar;
  displayedData: ChartData;
  dataKey: DataKey<unknown> | undefined;
  bandSize: number;
}): RadarComposedData {
  const { cx, cy } = angleAxis;
  let isRange = false;
  const points: RadarPoint[] = [];
  const angleBandSize = angleAxis.type !== "number" ? (bandSize ?? 0) : 0;

  displayedData.forEach((entry, i) => {
    const name = getValueByDataKey(entry, angleAxis.dataKey, i);
    const value: unknown = getValueByDataKey(entry, dataKey);
    const angle: number = (angleAxis.scale.map(name) ?? 0) + angleBandSize;
    const pointValue: unknown =
      value != null && Array.isArray(value) ? value[value.length - 1] : value;
    const radius: number = isNullish(pointValue) ? 0 : (radiusAxis.scale.map(pointValue) ?? 0);

    if (value != null && Array.isArray(value) && value.length >= 2) {
      isRange = true;
    }

    points.push({
      ...polarToCartesian(cx, cy, radius, angle),
      name: typeof name === "string" || typeof name === "number" ? name : undefined,
      value,
      cx,
      cy,
      radius,
      angle,
      payload: entry,
    });
  });

  const baseLinePoints: RadarPoint[] = [];
  if (isRange) {
    points.forEach((point) => {
      if (point.value != null && Array.isArray(point.value)) {
        const baseValue: unknown = point.value[0];
        const radius: number = isNullish(baseValue) ? 0 : (radiusAxis.scale.map(baseValue) ?? 0);
        baseLinePoints.push({
          ...point,
          radius,
          ...polarToCartesian(cx, cy, radius, point.angle),
        });
      } else {
        baseLinePoints.push(point);
      }
    });
  }

  return { points, isRange, baseLinePoints };
}

// Default per-frame interpolation for Radar points (the `animationInterpolateFn` the
// new AnimatedItems engine drives). Mirrors recharts 3.9 `defaultRadarAnimateItems`:
// matched points tween x/y between prev/next; added points grow from the (cx,cy)
// center; removed points are dropped immediately (no shrink, unlike Bar).
export const defaultRadarAnimateItems: AnimationInterpolateFn<RadarPoint, PolarLayout> = (
  items,
  t,
) => {
  if (items == null) return [];
  if (t === 1) {
    return items.flatMap((item) => (item.status === "removed" ? [] : [item.next]));
  }
  return items.flatMap((item): RadarPoint[] => {
    if (item.status === "removed") return [];
    if (item.status === "matched") {
      return [
        {
          ...item.next,
          x: interpolate(item.prev.x, item.next.x, t),
          y: interpolate(item.prev.y, item.next.y, t),
        },
      ];
    }
    // added: animate from center
    const { next } = item;
    return [
      {
        ...next,
        x: interpolate(next.cx ?? next.x, next.x, t),
        y: interpolate(next.cy ?? next.y, next.y, t),
      },
    ];
  });
};

/** Props passed to a custom polygon `shape` render prop (recharts forwards the points). */
export interface RadarShapeProps {
  points: ReadonlyArray<RadarPoint>;
  baseLinePoints?: ReadonlyArray<RadarPoint> | undefined;
  connectNulls?: boolean;
  fill?: string;
  stroke?: string;
}

export interface RadarProps<DataPointType = Record<string, unknown>, DataValueType = unknown> {
  angleAxisId?: string | number;
  radiusAxisId?: string | number;
  dataKey?: DataKey<DataPointType, DataValueType>;
  name?: string | number;
  fill?: string;
  fillOpacity?: number | string;
  stroke?: string;
  strokeWidth?: number | string;
  connectNulls?: boolean;
  legendType?: LegendType;
  tooltipType?: TooltipType;
  hide?: boolean;
  /** Per-point dots: boolean / props-object / function render prop. @defaultValue false */
  dot?: DotType;
  activeDot?: ActiveDotType;
  /** Per-point labels (via LabelList). @defaultValue false */
  label?: ImplicitLabelListType;
  /** Custom polygon shape (function form). */
  shape?: ActiveShape<RadarShapeProps, SVGPathElement>;
  isAnimationActive?: boolean | "auto";
  animationBegin?: number;
  animationDuration?: AnimationDuration;
  animationEasing?: EasingInput;
  /** Custom per-frame interpolation for the radar points (v3.9). */
  animationInterpolateFn?: AnimationInterpolateFn<RadarPoint, PolarLayout>;
  /** How prev/next points are matched across data updates (v3.9). @defaultValue matchByIndex */
  animationMatchBy?: AnimationMatchByProp<RadarPoint>;
  onAnimationStart?: () => void;
  onAnimationEnd?: () => void;
  // User pointer handlers, forwarded to the polygon path. recharts' 2-arg
  // props-first mouse-enter/leave signature is a deferred deviation; these
  // single-arg (event-only) handlers are wired straight onto the path.
  onClick?: JSX.EventHandlerUnion<SVGPolygonElement, MouseEvent>;
  onMouseEnter?: JSX.EventHandlerUnion<SVGPolygonElement, MouseEvent>;
  onMouseLeave?: JSX.EventHandlerUnion<SVGPolygonElement, MouseEvent>;
  onMouseMove?: JSX.EventHandlerUnion<SVGPolygonElement, MouseEvent>;
  onMouseOver?: JSX.EventHandlerUnion<SVGPolygonElement, MouseEvent>;
  onMouseOut?: JSX.EventHandlerUnion<SVGPolygonElement, MouseEvent>;
  onMouseDown?: JSX.EventHandlerUnion<SVGPolygonElement, MouseEvent>;
  onMouseUp?: JSX.EventHandlerUnion<SVGPolygonElement, MouseEvent>;
  onTouchStart?: JSX.EventHandlerUnion<SVGPolygonElement, TouchEvent>;
  onTouchMove?: JSX.EventHandlerUnion<SVGPolygonElement, TouchEvent>;
  onTouchEnd?: JSX.EventHandlerUnion<SVGPolygonElement, TouchEvent>;
  /**
   * Z-Index of this component and its children; the higher, the more on top.
   * @defaultValue 100 (DefaultZIndexes.area)
   */
  zIndex?: number;
  id?: string;
  class?: string;
}

// Matches recharts' defaultRadarProps: NO fill/stroke defaults (the user supplies
// them; an unset fill renders as no `fill` attribute, like recharts).
export const radarDefaultProps = {
  activeDot: true,
  dot: false,
  label: false,
  angleAxisId: 0,
  radiusAxisId: 0,
  hide: false,
  isAnimationActive: "auto",
  animationBegin: 0,
  animationDuration: 1500,
  animationEasing: "ease",
  animationInterpolateFn: defaultRadarAnimateItems,
  animationMatchBy: matchByIndex,
  legendType: "rect",
  zIndex: DefaultZIndexes.area,
} as const satisfies Partial<RadarProps>;

export function Radar<DataPointType = Record<string, unknown>, DataValueType = unknown>(
  props: RadarProps<DataPointType, DataValueType>,
): JSX.Element {
  const store = useAppStore();
  const merged = merge(radarDefaultProps, props);
  const isPanorama = useIsPanorama();
  const id = useUniqueId("recharts-radar", props.id);

  if (store != null) {
    registerInStore<RadarSettings>(
      () => ({
        id,
        type: "radar",
        // Radar has no own data prop — it always reads the chart data.
        data: undefined,
        dataKey: merged.dataKey,
        hide: merged.hide,
        angleAxisId: merged.angleAxisId,
        radiusAxisId: merged.radiusAxisId,
      }),
      {
        add: (next) => store.actions.graphicalItems.addPolarGraphicalItem(next),
        replace: (prev, next) =>
          store.actions.graphicalItems.replacePolarGraphicalItem({ prev, next }),
        remove: (prev) => store.actions.graphicalItems.removePolarGraphicalItem(prev),
      },
    );
  }

  const radar = useAppSelector((state) =>
    selectRadarPoints(state, merged.radiusAxisId, merged.angleAxisId, isPanorama, id),
  );

  const layerClass = (): string =>
    ["recharts-radar", merged.class].filter((c): c is string => Boolean(c)).join(" ");

  // Radar is an axis-type tooltip item: it registers an entry (so the axis tooltip
  // can resolve its value) but does NOT carry per-point dataDefinedOnItem.
  const tooltipConfig = createMemo<TooltipPayloadConfiguration>(() => ({
    dataDefinedOnItem: undefined,
    getPosition: noop,
    settings: {
      stroke: merged.stroke,
      strokeWidth: merged.strokeWidth,
      fill: merged.fill,
      nameKey: undefined,
      dataKey: merged.dataKey,
      name: getTooltipNameProp(merged.name, merged.dataKey),
      hide: merged.hide,
      type: merged.tooltipType,
      color: getLegendItemColor(merged.stroke, merged.fill),
      unit: "",
      graphicalItemId: id,
    },
  }));

  const legendPayload = createMemo<ReadonlyArray<LegendPayload>>(() => [
    {
      inactive: merged.hide,
      dataKey: merged.dataKey,
      type: merged.legendType,
      color: getLegendItemColor(merged.stroke, merged.fill),
      value: getTooltipNameProp(merged.name, merged.dataKey),
    },
  ]);

  // RadarPoint is structurally a Coordinate ({x,y}+extras), so the arrays pass
  // straight to <Polygon> with no assertion.
  const baseLine = (): ReadonlyArray<RadarPoint> | undefined => {
    const r = radar();
    return r?.isRange ? r.baseLinePoints : undefined;
  };

  const mainColor = getLegendItemColor(merged.stroke, merged.fill);
  const activeRadarPoints = createMemo((): ReadonlyArray<RadarPoint> | undefined =>
    merged.hide ? undefined : radar()?.points,
  );

  // Active-dot wiring: the hovered Radar point gets an .recharts-active-dot layer,
  // mirroring Line/Area. The active point is resolved from the tooltip active index
  // and the active data points (matched by RadarPoint.payload). Element-form activeDot
  // is N/A by design (needs cloneElement); default/object/function forms are supported.
  const activeTooltipIndex = useAppSelector(selectActiveTooltipIndex);
  const activeDataPoints = useActiveTooltipDataPoints();
  const tooltipActive = createMemo(() => ({
    index: activeTooltipIndex(),
    dataPoints: activeDataPoints(),
  }));

  return (
    <>
      <SetTooltipEntrySettings tooltipEntrySettings={tooltipConfig()} />
      <SetLegendPayload id={id} legendPayload={legendPayload()} />
      <Show when={activeRadarPoints()}>
        {(points) => (
          // Wrapped in <ZIndexLayer> (default 100) so a `zIndex` prop relayers the
          // whole `.recharts-radar` Layer into its portal — recharts wraps the
          // entire Layer + ActivePoints in ZIndexLayer.
          <ZIndexLayer zIndex={merged.zIndex}>
            <RadarAnimatedContent
              stepData={points()}
              baseLinePoints={baseLine()}
              layerClass={layerClass()}
              connectNulls={merged.connectNulls}
              fill={merged.fill}
              fillOpacity={merged.fillOpacity}
              stroke={merged.stroke}
              strokeWidth={merged.strokeWidth}
              activeDot={merged.activeDot}
              dot={merged.dot}
              label={merged.label}
              shape={merged.shape}
              dataKey={merged.dataKey}
              isAnimationActive={merged.isAnimationActive}
              animationBegin={merged.animationBegin}
              animationDuration={merged.animationDuration}
              animationEasing={merged.animationEasing}
              animationInterpolateFn={merged.animationInterpolateFn}
              animationMatchBy={merged.animationMatchBy}
              onAnimationStart={merged.onAnimationStart}
              onAnimationEnd={merged.onAnimationEnd}
              onClick={props.onClick}
              onMouseEnter={props.onMouseEnter}
              onMouseLeave={props.onMouseLeave}
              onMouseMove={props.onMouseMove}
              onMouseOver={props.onMouseOver}
              onMouseOut={props.onMouseOut}
              onMouseDown={props.onMouseDown}
              onMouseUp={props.onMouseUp}
              onTouchStart={props.onTouchStart}
              onTouchMove={props.onTouchMove}
              onTouchEnd={props.onTouchEnd}
            />
          </ZIndexLayer>
        )}
      </Show>
      <>
        {(() => {
          const pts = activeRadarPoints();
          if (pts == null) {
            return null;
          }
          const t = tooltipActive();
          const state = computeActivePointState({
            points: pts,
            activeTooltipIndex: t.index,
            activeDataPoints: t.dataPoints,
            activeDot: merged.activeDot,
            mainColor,
            itemDataKey: merged.dataKey,
          });
          if (state == null) {
            return null;
          }
          return renderActivePointsLayerFromState(state, {
            points: pts,
            activeDot: merged.activeDot,
            mainColor,
            itemDataKey: merged.dataKey,
          });
        })()}
      </>
    </>
  );
}

function RadarAnimatedContent(props: {
  stepData: ReadonlyArray<RadarPoint>;
  baseLinePoints: ReadonlyArray<RadarPoint> | undefined;
  layerClass: string;
  connectNulls: boolean | undefined;
  fill: string | undefined;
  fillOpacity: number | string | undefined;
  stroke: string | undefined;
  strokeWidth: number | string | undefined;
  activeDot: ActiveDotType;
  dot: DotType;
  label: ImplicitLabelListType;
  shape: ActiveShape<RadarShapeProps, SVGPathElement> | undefined;
  dataKey: DataKey<unknown> | undefined;
  isAnimationActive: boolean | "auto";
  animationBegin: number;
  animationDuration: AnimationDuration;
  animationEasing: EasingInput;
  animationInterpolateFn: AnimationInterpolateFn<RadarPoint, PolarLayout>;
  animationMatchBy: AnimationMatchByProp<RadarPoint>;
  onAnimationStart: (() => void) | undefined;
  onAnimationEnd: (() => void) | undefined;
  onClick: JSX.EventHandlerUnion<SVGPolygonElement, MouseEvent> | undefined;
  onMouseEnter: JSX.EventHandlerUnion<SVGPolygonElement, MouseEvent> | undefined;
  onMouseLeave: JSX.EventHandlerUnion<SVGPolygonElement, MouseEvent> | undefined;
  onMouseMove: JSX.EventHandlerUnion<SVGPolygonElement, MouseEvent> | undefined;
  onMouseOver: JSX.EventHandlerUnion<SVGPolygonElement, MouseEvent> | undefined;
  onMouseOut: JSX.EventHandlerUnion<SVGPolygonElement, MouseEvent> | undefined;
  onMouseDown: JSX.EventHandlerUnion<SVGPolygonElement, MouseEvent> | undefined;
  onMouseUp: JSX.EventHandlerUnion<SVGPolygonElement, MouseEvent> | undefined;
  onTouchStart: JSX.EventHandlerUnion<SVGPolygonElement, TouchEvent> | undefined;
  onTouchMove: JSX.EventHandlerUnion<SVGPolygonElement, TouchEvent> | undefined;
  onTouchEnd: JSX.EventHandlerUnion<SVGPolygonElement, TouchEvent> | undefined;
}): JSX.Element {
  // A function-form custom `shape` replaces the default <Polygon>. Use a ternary
  // (not <Show when={fn}>) so the function-valued read stays tracked without
  // tripping STRICT_READ; element/object shape forms are deferred.
  const shapeFn = createMemo(() => (typeof props.shape === "function" ? props.shape : undefined));

  // Cartesian label-list entries, one per (settled) point — recharts'
  // RadarLabelListProvider. The label list reads these from context.
  const labelListEntries = createMemo<ReadonlyArray<CartesianLabelListEntry>>(() =>
    props.stepData.map((point): CartesianLabelListEntry => {
      const viewBox = { x: point.x, y: point.y, width: 0, lowerWidth: 0, upperWidth: 0, height: 0 };
      return {
        ...viewBox,
        value: point.value ?? "",
        payload: point.payload,
        parentViewBox: undefined,
        viewBox,
        fill: undefined,
      };
    }),
  );

  // Holds the latest visible points frame so a re-animation (data change) tweens
  // from where the polygon currently is. Managed by AnimatedItems via
  // useAnimationStartSnapshot. The baseline gets its own ref/snapshot, mirroring
  // recharts' previousPointsRef / previousBaseLinePointsRef.
  const previousItemsRef: MutableRef<ReadonlyArray<RadarPoint> | null | undefined> = {
    current: null,
  };
  const previousBaseLinePointsRef: MutableRef<ReadonlyArray<RadarPoint> | null | undefined> = {
    current: null,
  };

  // Polar layout for the interpolation fn (centric | radial). When absent (outside a
  // polar chart) the AnimatedItems subtree is gated out, matching recharts.
  const polarLayout = usePolarChartLayout();

  // The baseline animates with the SAME interpolation fn as the outer polygon, driven
  // off its own snapshot. The snapshot is armed/committed from the AnimatedItems
  // render-prop below (one shared animation clock).
  const baseLineSnapshot = useAnimationStartSnapshot<ReadonlyArray<RadarPoint> | null | undefined>(
    () => props.stepData,
    previousBaseLinePointsRef,
  );
  const baseLineAnimationItems = createMemo(() =>
    matchAnimationItems(
      baseLineSnapshot.startValue() ?? null,
      props.baseLinePoints,
      props.animationMatchBy,
    ),
  );

  // Gate the label list while animating, mirroring recharts (showLabels = !isAnimating).
  const { isAnimating, handleAnimationStart, handleAnimationEnd } = useAnimationCallbacks(
    props.onAnimationStart,
    props.onAnimationEnd,
  );
  const labelContextEntries = createMemo(() => (isAnimating() ? undefined : labelListEntries()));

  return (
    <CartesianLabelListContextProvider value={labelContextEntries}>
      <Layer class={props.layerClass}>
        <Show when={polarLayout()}>
          {(layout) => (
            <AnimatedItems
              animationInput={props.stepData}
              animationIdPrefix="recharts-radar-"
              items={props.stepData}
              previousItemsRef={previousItemsRef}
              isAnimationActive={props.isAnimationActive}
              animationBegin={props.animationBegin}
              animationDuration={
                typeof props.animationDuration === "number" ? props.animationDuration : 1500
              }
              animationEasing={props.animationEasing}
              onAnimationStart={handleAnimationStart}
              onAnimationEnd={handleAnimationEnd}
              animationInterpolateFn={props.animationInterpolateFn}
              animationMatchBy={props.animationMatchBy}
              layout={layout()}
            >
              {(stepData, t) => {
                const stepBaseLinePoints =
                  t === 1
                    ? props.baseLinePoints
                    : props.animationInterpolateFn(baseLineAnimationItems(), t, layout());
                baseLineSnapshot.syncStepValue(stepBaseLinePoints, t);

                return (
                  <Layer class="recharts-radar-polygon">
                    {shapeFn() ? (
                      <Shape<RadarShapeProps, SVGPathElement>
                        option={shapeFn()}
                        DefaultShape={() => null}
                        shapeProps={{
                          points: stepData,
                          baseLinePoints: stepBaseLinePoints,
                          connectNulls: props.connectNulls,
                          fill: props.fill,
                          stroke: props.stroke,
                        }}
                      />
                    ) : (
                      <Polygon
                        points={stepData}
                        baseLinePoints={stepBaseLinePoints}
                        connectNulls={props.connectNulls}
                        fill={props.fill}
                        fillOpacity={props.fillOpacity}
                        stroke={props.stroke}
                        strokeWidth={props.strokeWidth}
                        onClick={props.onClick}
                        onMouseEnter={props.onMouseEnter}
                        onMouseLeave={props.onMouseLeave}
                        onMouseMove={props.onMouseMove}
                        onMouseOver={props.onMouseOver}
                        onMouseOut={props.onMouseOut}
                        onMouseDown={props.onMouseDown}
                        onMouseUp={props.onMouseUp}
                        onTouchStart={props.onTouchStart}
                        onTouchMove={props.onTouchMove}
                        onTouchEnd={props.onTouchEnd}
                      />
                    )}
                    {/* Dots live inside the animation frame (recharts StaticPolygon
                        renders them from stepData), so entrance/update animations
                        move the dots with the polygon. baseProps mirrors recharts'
                        svgPropertiesNoEvents(props) subset the dots inherit. */}
                    <Dots
                      points={stepData}
                      dot={props.dot}
                      class="recharts-radar-dots"
                      dotClass="recharts-radar-dot"
                      dataKey={props.dataKey}
                      baseProps={{
                        fill: props.fill,
                        fillOpacity: props.fillOpacity,
                        stroke: props.stroke,
                        strokeWidth: props.strokeWidth,
                      }}
                    />
                  </Layer>
                );
              }}
            </AnimatedItems>
          )}
        </Show>
        <LabelListFromLabelProp label={props.label} />
      </Layer>
    </CartesianLabelListContextProvider>
  );
}
