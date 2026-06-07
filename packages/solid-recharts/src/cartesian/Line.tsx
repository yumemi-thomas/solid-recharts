// Ported from recharts 3.8.1 src/cartesian/Line.tsx (commit 7a23854).
//
// MINIMAL PORT — the payoff of the axis/scale vertical: a polyline drawn from data.
// Deferred (documented stubs): ErrorBar, ActiveDots/dots, label, legend
// payload registration, animation, ZIndexLayer, clip paths. (Tooltip payload
// registration is wired — see SetTooltipEntrySettings below.) What remains is the
// essential vertical: register the line as a graphical item (so the axis selectors
// see its data), select its computed points, and draw a <Curve>.
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
import { createEffect, createMemo, createSignal, merge, onCleanup, Show, untrack } from "solid-js";
import { useActiveTooltipDataPoints } from "../hooks";
import { selectActiveTooltipIndex } from "../state/selectors/tooltipSelectors";
import type { JSX } from "@solidjs/web";
import { useAppSelector, useAppStore } from "../state/hooks";
import { useAnimationId } from "../util/useAnimationId";
import { JavascriptAnimate } from "../animation/JavascriptAnimate";
import type { EasingInput } from "../animation/easing";
import { SetTooltipEntrySettings } from "../state/SetTooltipEntrySettings";
import { TooltipPayloadConfiguration } from "../state/tooltipSlice";
import { SetLegendPayload } from "../state/SetLegendPayload";
import { LegendPayload } from "../component/DefaultLegendContent";
import { useIsPanorama } from "../context/PanoramaContext";
import { useCartesianChartLayout } from "../context/chartLayoutContext";
import { useUniqueId } from "../util/useUniqueId";
import { Layer } from "../container/Layer";
import { Curve, CurveType, type CurveProps } from "../shape/Curve";
import { Dots, isClipDot } from "../component/Dots";
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
  AnimationDuration,
  CartesianLayout,
  DataKey,
  DotType,
  LegendType,
  TickItem,
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
  label?: boolean;
  legendType?: LegendType;
  shape?: typeof Curve;
  zIndex?: number;
  id?: string;
  class?: string;
  /** Children (e.g. <ErrorBar>, <LabelList>) rendered within the item's contexts. */
  children?: JSX.Element;
}

// strokeDasharray "draw" helpers (ported verbatim from recharts Line). The curve
// `d` is unchanged by animation; only stroke-dasharray reveals it progressively.
const generateSimpleStrokeDasharray = (totalLength: number, length: number): string =>
  `${length}px ${totalLength}px`;

function repeatDash(lines: number[], count: number): number[] {
  const linesUnit = lines.length % 2 !== 0 ? [...lines, 0] : lines;
  const result: number[] = [];
  for (let i = 0; i < count; ++i) {
    result.push(...linesUnit);
  }
  return result;
}

const getStrokeDasharray = (length: number, totalLength: number, lines: number[]): string => {
  const lineLength = lines.reduce((pre, next) => pre + next, 0);
  if (!lineLength) {
    return generateSimpleStrokeDasharray(totalLength, length);
  }
  const count = Math.floor(length / lineLength);
  const remainLength = length % lineLength;
  let remainLines: number[] = [];
  for (let i = 0, sum = 0; i < lines.length; sum += lines[i] ?? 0, ++i) {
    const lineValue = lines[i];
    if (lineValue != null && sum + lineValue > remainLength) {
      remainLines = [...lines.slice(0, i), remainLength - sum];
      break;
    }
  }
  const emptyLines = remainLines.length % 2 === 0 ? [0, totalLength] : [totalLength];
  return [...repeatDash(lines, count), ...remainLines, ...emptyLines]
    .map((l) => `${l}px`)
    .join(", ");
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
  label: false,
  legendType: "line",
  shape: Curve,
  zIndex: DefaultZIndexes.line,
} as const;

export const Line = (props: LineProps): JSX.Element => {
  const store = useAppStore();
  const merged = merge(lineDefaultProps, props);
  const isPanorama = useIsPanorama();
  const layout = useCartesianChartLayout();
  const id = useUniqueId("recharts-line", props.id);

  let prev: LineSettings | null = null;

  createEffect(
    (): LineSettings => ({
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
      type: undefined,
      color: merged.stroke,
      unit: merged.unit,
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
        id,
        isAnimationActive: merged.isAnimationActive,
        label: merged.label,
        legendType: merged.legendType,
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

  // Enter animation: the curve "draws" via stroke-dasharray (the `d` is UNCHANGED —
  // only stroke-dasharray reveals the path progressively — so geometry specs are
  // regression-safe). Keyed <Show> restarts on a new id (points changed).
  const [totalLength, setTotalLength] = createSignal(0);
  const measureCurve = (el: SVGPathElement): void => {
    if (el.getTotalLength) {
      try {
        setTotalLength(el.getTotalLength() || 0);
      } catch {
        // getTotalLength can throw on detached/empty paths — ignore.
      }
    }
  };
  const activeTooltipIndex = useAppSelector(selectActiveTooltipIndex);
  const activeDataPoints = useActiveTooltipDataPoints();

  const animationId = useAnimationId(() => points(), "recharts-line-");
  const { needClip } = useNeedsClip(merged.xAxisId, merged.yAxisId);
  const plotArea = usePlotArea();

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
  const dashFor = (t: number): string | undefined => {
    const len = untrack(totalLength);
    const curLength = Math.min(interpolate(0, len, t), len);
    const userDash = merged.strokeDasharray;
    // Truthy check mirrors recharts (it branches on the raw prop; "auto" → active).
    if (merged.isAnimationActive) {
      if (userDash != null) {
        const lines = `${userDash}`.split(/[,\s]+/gim).map((n) => parseFloat(n));
        return getStrokeDasharray(curLength, len, lines);
      }
      return generateSimpleStrokeDasharray(len, curLength);
    }
    return userDash == null ? undefined : String(userDash);
  };

  return (
    <>
      <SetTooltipEntrySettings tooltipEntrySettings={tooltipConfig()} />
      <SetLegendPayload id={id} legendPayload={legendPayload()} />
      <Show when={!merged.hide && points()}>
        {(pts) => (
          // `Layer` takes a single `class` string (it composes "recharts-layer"
          // itself). Forwarding the user's `class` onto the line group is deferred.
          <>
            <Layer class="recharts-line">
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
              <Show when={animationId()} keyed>
                {(animId) => (
                  <JavascriptAnimate
                    animationId={animId}
                    duration={merged.animationDuration}
                    easing={merged.animationEasing}
                    isActive={merged.isAnimationActive}
                    begin={merged.animationBegin}
                  >
                    {(t) => (
                      <Curve
                        class="recharts-line-curve"
                        id={id}
                        pathRef={measureCurve}
                        points={untrack(pts)}
                        type={merged.type}
                        layout={layout()}
                        connectNulls={merged.connectNulls}
                        fill="none"
                        stroke={merged.stroke}
                        stroke-width={merged.strokeWidth}
                        strokeDasharray={dashFor(t)}
                        {...eventHandlers()}
                        {...(curveClipPath() != null ? { "clip-path": curveClipPath() } : {})}
                      />
                    )}
                  </JavascriptAnimate>
                )}
              </Show>
              <Dots
                points={pts()}
                dot={merged.dot}
                class="recharts-line-dots"
                dotClass="recharts-line-dot"
                dataKey={merged.dataKey}
                needClip={needClip()}
                clipPathId={id}
                baseProps={{
                  stroke: merged.stroke,
                  "stroke-width": merged.strokeWidth,
                  fill: merged.fill,
                }}
              />
            </Layer>
          </>
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
            {props.children}
          </SetErrorBarContext>
        )}
      </RegisterGraphicalItemId>
    </>
  );
};
