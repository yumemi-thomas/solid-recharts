// Ported from recharts 3.8.1 src/cartesian/Area.tsx (commit 7a23854).
//
// MINIMAL PORT — a 3rd graphical item, reusing the Line/axis spine: it computes
// points like a Line plus a baseLine, and draws a filled <Curve>.
// Deferred (documented): range areas (scalar values → flat numeric baseLine),
// activeDot, labels, ZIndexLayer, clip. (Stacks, animation, dots — boolean /
// props-object / function-form render prop — tooltip + legend registration are
// wired.)
// Solid deviations: `resolveDefaultProps`→`merge`; effect-dispatch
// registration components → `createEffect` add/replace + `onCleanup` (Line idiom).
import { createEffect, createMemo, merge, onCleanup, Show, untrack } from "solid-js";
import type { JSX } from "@solidjs/web";
import { useAppSelector, useAppStore } from "../state/hooks";
import { useAnimationId } from "../util/useAnimationId";
import { JavascriptAnimate } from "../animation/JavascriptAnimate";
import type { EasingInput } from "../animation/easing";
import { isWellBehavedNumber } from "../util/isWellBehavedNumber";
import { noop } from "../util/DataUtils";
import { SetTooltipEntrySettings } from "../state/SetTooltipEntrySettings";
import { TooltipPayloadConfiguration } from "../state/tooltipSlice";
import { SetLegendPayload } from "../state/SetLegendPayload";
import { LegendPayload } from "../component/DefaultLegendContent";
import { useIsPanorama } from "../context/PanoramaContext";
import { useCartesianChartLayout } from "../context/chartLayoutContext";
import { useUniqueId } from "../util/useUniqueId";
import { Layer } from "../container/Layer";
import { Curve, CurveType, type CurveProps } from "../shape/Curve";
import { pickEventHandlers } from "../util/adaptEventHandlers";
import { Dots } from "../component/Dots";
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
import { getCateCoordinateOfLine, getTooltipNameProp, getValueByDataKey } from "../util/ChartUtils";
import { isNumber } from "../util/DataUtils";
import { BaseAxisWithScale } from "../state/selectors/axisSelectors";
import { StackId } from "../util/ChartUtils";
import { StackDataPoint } from "../util/stacks/stackTypes";

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

  // Range areas (where dataKey already returns a [min, max] tuple) are still
  // deferred; we handle the scalar and stacked paths.
  const points: ReadonlyArray<AreaPointItem> = displayedData.map((entry, index): AreaPointItem => {
    const valueAsArray: ReadonlyArray<unknown> = hasStack
      ? (stackedData?.[dataStartIndex + index] ?? [])
      : [baseValue, getValueByDataKey(entry, dataKey)];
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
  if (hasStack) {
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

  return { points, baseLine, isRange: false };
}

// SVG props (incl. event handlers) the Area forwards onto its fill <Curve>, minus
// the ones Area computes itself or redeclares below. Mirrors recharts' Area Props
// so `<Area onClick={...} />` and other path attributes/events type-check.
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
  type?: CurveType;
  stroke?: string;
  strokeWidth?: number;
  fill?: string;
  fillOpacity?: number | string;
  connectNulls?: boolean;
  baseValue?: BaseValue;
  hide?: boolean;
  /**
   * Dots drawn at each point on the area's top line. boolean / props-object /
   * custom render function (function form). @defaultValue false
   */
  dot?: DotType;
  activeDot?: ActiveDotType;
  stackId?: StackId;
  isAnimationActive?: boolean | "auto";
  animationBegin?: number;
  animationDuration?: AnimationDuration;
  animationEasing?: EasingInput;
  id?: string;
  class?: string;
}

export const areaDefaultProps = {
  activeDot: true,
  connectNulls: false,
  fill: "#3182bd",
  fillOpacity: 0.6,
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
} as const;

// Enter-animation clip-reveal rects (ported from recharts Area ClipRect). The
// area's `d` is unchanged; an alpha-scaled rect clips it for a progressive reveal.
type AreaBaseLine = number | ReadonlyArray<AreaPointItem>;

function HorizontalClipRect(props: {
  alpha: number;
  points: ReadonlyArray<AreaPointItem>;
  baseLine: AreaBaseLine;
  strokeWidth: number | string | undefined;
}): JSX.Element {
  const startX = (): number | null => props.points[0]?.x ?? null;
  const endX = (): number | null => props.points[props.points.length - 1]?.x ?? null;
  const geom = (): { x: number; width: number; height: number } | null => {
    const sx = startX();
    const ex = endX();
    if (!isWellBehavedNumber(sx) || !isWellBehavedNumber(ex)) {
      return null;
    }
    const width = props.alpha * Math.abs(sx - ex);
    let maxY = Math.max(...props.points.map((e) => e.y ?? 0));
    if (isNumber(props.baseLine)) {
      maxY = Math.max(props.baseLine, maxY);
    } else if (props.baseLine.length > 0) {
      maxY = Math.max(...props.baseLine.map((e) => e.y ?? 0), maxY);
    }
    if (!isNumber(maxY)) {
      return null;
    }
    return {
      x: sx < ex ? sx : sx - width,
      width,
      height: Math.floor(maxY + (props.strokeWidth ? parseInt(`${props.strokeWidth}`, 10) : 1)),
    };
  };
  return (
    <Show when={geom()}>
      {(g) => <rect x={g().x} y={0} width={g().width} height={g().height} />}
    </Show>
  );
}

function VerticalClipRect(props: {
  alpha: number;
  points: ReadonlyArray<AreaPointItem>;
  baseLine: AreaBaseLine;
  strokeWidth: number | string | undefined;
}): JSX.Element {
  const startY = (): number | null => props.points[0]?.y ?? null;
  const endY = (): number | null => props.points[props.points.length - 1]?.y ?? null;
  const geom = (): { y: number; width: number; height: number } | null => {
    const sy = startY();
    const ey = endY();
    if (!isWellBehavedNumber(sy) || !isWellBehavedNumber(ey)) {
      return null;
    }
    const height = props.alpha * Math.abs(sy - ey);
    let maxX = Math.max(...props.points.map((e) => e.x ?? 0));
    if (isNumber(props.baseLine)) {
      maxX = Math.max(props.baseLine, maxX);
    } else if (props.baseLine.length > 0) {
      maxX = Math.max(...props.baseLine.map((e) => e.x ?? 0), maxX);
    }
    if (!isNumber(maxX)) {
      return null;
    }
    return {
      y: sy < ey ? sy : sy - height,
      width: Math.floor(maxX + (props.strokeWidth ? parseInt(`${props.strokeWidth}`, 10) : 1)),
      height,
    };
  };
  return (
    <Show when={geom()}>
      {(g) => <rect x={0} y={g().y} width={g().width} height={g().height} />}
    </Show>
  );
}

export const Area = (props: AreaProps): JSX.Element => {
  const store = useAppStore();
  const merged = merge(areaDefaultProps, props);
  const isPanorama = useIsPanorama();
  const layout = useCartesianChartLayout();
  const id = useUniqueId("recharts-area", props.id);

  let prev: AreaSettings | null = null;

  createEffect(
    (): AreaSettings => ({
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
    (settings) => {
      if (store == null) {
        return;
      }
      if (prev === null) {
        store.actions.graphicalItems.addCartesianGraphicalItem(settings);
      } else if (prev !== settings) {
        store.actions.graphicalItems.replaceCartesianGraphicalItem({ prev, next: settings });
      }
      prev = settings;
    },
  );

  onCleanup(() => {
    if (prev && store != null) {
      store.actions.graphicalItems.removeCartesianGraphicalItem(prev);
      prev = null;
    }
  });

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
      color: merged.stroke,
      unit: merged.unit,
      graphicalItemId: id,
    },
  }));

  // Legend payload entry for this area (color = stroke, like recharts' getLegendItemColor).
  const legendPayload = createMemo<ReadonlyArray<LegendPayload>>(() => [
    {
      inactive: merged.hide,
      dataKey: merged.dataKey,
      type: "line",
      color: merged.stroke,
      value: getTooltipNameProp(merged.name, merged.dataKey),
    },
  ]);

  // Enter animation: a clip-rect grows to reveal the area (the `d` is UNCHANGED,
  // so geometry specs are regression-safe). Keyed <Show> restarts on a new id.
  const activeTooltipIndex = useAppSelector(selectActiveTooltipIndex);
  const activeDataPoints = useActiveTooltipDataPoints();
  const tooltipActive = createMemo(() => ({
    index: activeTooltipIndex(),
    dataPoints: activeDataPoints(),
  }));

  const animationId = useAnimationId(() => area(), "recharts-area-");
  const animClipId = useUniqueId("recharts-area-clip");
  return (
    <>
      <SetTooltipEntrySettings tooltipEntrySettings={tooltipConfig()} />
      <SetLegendPayload id={id} legendPayload={legendPayload()} />
      <Show when={!merged.hide && area()}>
        {(computed) => (
          <>
            <Layer class="recharts-area">
              <Show when={animationId()} keyed>
                {(animId) => (
                  <JavascriptAnimate
                    animationId={animId}
                    duration={merged.animationDuration}
                    easing={merged.animationEasing}
                    isActive={merged.isAnimationActive}
                    begin={merged.animationBegin}
                  >
                    {(t) => {
                      const active = untrack(() => merged.isAnimationActive);
                      const curve = (
                        <Curve
                          class="recharts-area-area"
                          points={computed().points}
                          baseLine={computed().baseLine}
                          type={merged.type}
                          layout={layout()}
                          connectNulls={merged.connectNulls}
                          fill={merged.fill}
                          fill-opacity={merged.fillOpacity}
                          stroke="none"
                          {...pickEventHandlers(props)}
                        />
                      );
                      // recharts draws the stroke as a separate top-edge curve
                      // (`.recharts-area-curve`) over the fill, only when stroke !== 'none'.
                      const strokeCurve =
                        merged.stroke !== "none" ? (
                          <Curve
                            class="recharts-area-curve"
                            points={computed().points}
                            type={merged.type}
                            layout={layout()}
                            connectNulls={merged.connectNulls}
                            fill="none"
                            stroke={merged.stroke}
                            stroke-width={merged.strokeWidth}
                          />
                        ) : null;
                      const shapes = (
                        <>
                          {curve}
                          {strokeCurve}
                        </>
                      );
                      if (!active) {
                        return shapes;
                      }
                      return (
                        <>
                          <defs>
                            <clipPath id={animClipId}>
                              <Show
                                when={untrack(layout) === "vertical"}
                                fallback={
                                  <HorizontalClipRect
                                    alpha={t}
                                    points={computed().points}
                                    baseLine={computed().baseLine}
                                    strokeWidth={merged.strokeWidth}
                                  />
                                }
                              >
                                <VerticalClipRect
                                  alpha={t}
                                  points={computed().points}
                                  baseLine={computed().baseLine}
                                  strokeWidth={merged.strokeWidth}
                                />
                              </Show>
                            </clipPath>
                          </defs>
                          <g clip-path={`url(#${animClipId})`}>{shapes}</g>
                        </>
                      );
                    }}
                  </JavascriptAnimate>
                )}
              </Show>
              <Dots
                points={computed().points}
                dot={merged.dot ?? false}
                class="recharts-area-dots"
                dotClass="recharts-area-dot"
                dataKey={merged.dataKey}
                baseProps={{
                  stroke: merged.stroke,
                  "stroke-width": merged.strokeWidth,
                  fill: merged.fill,
                  "fill-opacity": merged.fillOpacity,
                }}
              />
              {(() => {
                const pts = computed().points;
                const t = tooltipActive();
                const state = computeActivePointState({
                  points: pts,
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
                  points: pts,
                  activeDot: merged.activeDot,
                  mainColor: getLegendItemColor(merged.stroke, merged.fill),
                  itemDataKey: merged.dataKey,
                });
              })()}
            </Layer>
          </>
        )}
      </Show>
    </>
  );
};
