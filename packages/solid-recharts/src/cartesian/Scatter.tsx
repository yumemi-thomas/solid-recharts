// Ported from recharts 3.8.1 src/cartesian/Scatter.tsx (commit 7a23854).
//
// MINIMAL PORT — a point cloud: one <Symbols> per data point at (cx, cy), sized
// from the (optional) Z axis. Deferred (documented): element-form shape and
// mirroring into the Brush panorama. zIndex relayering IS wired: the whole
// `.recharts-scatter` Layer is wrapped in <ZIndexLayer> (default
// DefaultZIndexes.scatter = 600). (Animation, Cells —
// per-point fill/stroke/class via <Cell> children — the function-form custom
// `shape` render prop, ErrorBar, labels, clip, and ScatterLine (the connecting
// joint/fitting line) are wired.) Solid deviations:
// resolveDefaultProps→merge; effect-dispatch registration → createEffect/onCleanup;
// the `@ts-expect-error`-laden value plumbing is replaced with typed coercion.
import { createMemo, For, Show, mergeProps } from "solid-js";
import type { JSX } from "solid-js";
import { useAppSelector, useAppStore } from "../state/hooks";
import { useIsPanorama } from "../context/PanoramaContext";
import { useUniqueId } from "../util/useUniqueId";
import { useCartesianChartLayout } from "../context/chartLayoutContext";
import {
  AnimatedItems,
  type AnimationInterpolateFn,
  useAnimationCallbacks,
} from "../animation/AnimatedItems";
import { matchAppend, type AnimationMatchByProp } from "../animation/matchBy";
import type { MutableRef } from "../animation/useAnimationStartSnapshot";
import type { EasingInput } from "../animation/easing";
import { Layer } from "../container/Layer";
import { Symbols } from "../shape/Symbols";
import { Curve, type CurveProps, type CurveType } from "../shape/Curve";
import { svgPropertiesNoEventsFromUnknown } from "../util/svgPropertiesNoEvents";
import { GraphicalItemClipPath, useNeedsClip } from "./GraphicalItemClipPath";
import { DefaultZIndexes } from "../zIndex/DefaultZIndexes";
import { ZIndexLayer } from "../zIndex/ZIndexLayer";
import { type CellProps, collectCells } from "../component/Cell";
import {
  type CartesianLabelListEntry,
  CartesianLabelListContextProvider,
  type ImplicitLabelListType,
  LabelListFromLabelProp,
} from "../component/LabelList";
import { selectScatterPoints } from "../state/selectors/scatterSelectors";
import { selectActiveTooltipIndex } from "../state/selectors/tooltipSelectors";
import { Shape } from "../util/ActiveShapeUtils";
import { RegisterGraphicalItemId } from "../context/RegisterGraphicalItemId";
import { SetErrorBarContext } from "../context/ErrorBarContext";
import type { ErrorBarDataItem, ErrorBarDataPointFormatter, ErrorBarDirection } from "./ErrorBar";
import { ScatterSettings } from "../state/types/ScatterSettings";
import { SetTooltipEntrySettings } from "../state/SetTooltipEntrySettings";
import {
  TooltipPayload,
  TooltipPayloadConfiguration,
  TooltipPayloadEntry,
} from "../state/tooltipSlice";
import { SetLegendPayload } from "../state/SetLegendPayload";
import { LegendPayload } from "../component/DefaultLegendContent";
import {
  type MouseEnterLeaveEvent,
  useMouseClickItemDispatch,
  useMouseEnterItemDispatch,
  useMouseLeaveItemDispatch,
} from "../context/tooltipContext";
import { AxisId } from "../state/cartesianAxisSlice";
import { ChartData } from "../state/chartDataSlice";
import {
  AnimationDuration,
  CartesianLayout,
  Coordinate,
  DataKey,
  ActiveShape,
  LegendType,
  NullableCoordinate,
  type ShapeAnimationProps,
  SymbolType,
  TickItem,
  TooltipType,
  TrapezoidViewBox,
} from "../util/types";
import { getCateCoordinateOfLine, getTooltipNameProp, getValueByDataKey } from "../util/ChartUtils";
import { getLinearRegression, interpolate, isNullish, isNumOrStr } from "../util/DataUtils";
import { BaseAxisWithScale, implicitZAxis, ZAxisWithScale } from "../state/selectors/axisSelectors";
import type { Formatter, ValueType } from "../component/DefaultTooltipContent";
import { registerInStore } from "../state/registerInStore";

export interface ScatterPointNode {
  x?: number | string;
  y?: number | string;
  z?: number | string;
}

export interface ScatterPointItem {
  cx: number | undefined;
  cy: number | undefined;
  x: number | undefined;
  y: number | undefined;
  size: number;
  width: number;
  height: number;
  node: ScatterPointNode;
  payload?: unknown;
  tooltipPayload?: TooltipPayload;
  tooltipPosition: Coordinate;
  /** Fill read implicitly from the data row's `fill` property (recharts spreads `...entry`). */
  fill?: string | undefined;
  /** Name read implicitly from the data row's `name` property (recharts spreads `...entry`). */
  name?: string | number | undefined;
  /** Per-point presentation overrides from a matching <Cell> child (if any). */
  cell?: CellProps | undefined;
}

/**
 * Props the shape/activeShape renderer receives: a point's geometry plus the
 * presentation/active flags. Solid-idiomatic `class` (recharts' React prop is
 * `className`).
 */
export type ScatterShapeProps = ScatterPointItem & {
  isActive?: boolean;
  index?: number;
  type?: SymbolType;
  sizeType?: "area";
  class?: string;
  fillOpacity?: number | string;
  stroke?: string;
};

export type ScatterMouseEvent = MouseEnterLeaveEvent<ScatterPointItem>;

const coerceNode = (value: unknown): number | string | undefined =>
  isNumOrStr(value) ? value : undefined;

const tooltipValue = (value: unknown): ValueType | undefined =>
  isNumOrStr(value) ? value : undefined;

export function computeScatterPoints({
  displayedData,
  xAxis,
  yAxis,
  zAxis,
  scatterSettings,
  xAxisTicks,
  yAxisTicks,
  cells,
}: {
  displayedData: ReadonlyArray<unknown>;
  xAxis: BaseAxisWithScale;
  yAxis: BaseAxisWithScale;
  zAxis: ZAxisWithScale | undefined;
  scatterSettings: ScatterSettings;
  xAxisTicks: ReadonlyArray<TickItem> | undefined;
  yAxisTicks: ReadonlyArray<TickItem> | undefined;
  /** Per-point <Cell> presentation props, indexed by displayed-data position. */
  cells?: ReadonlyArray<CellProps> | undefined;
}): ReadonlyArray<ScatterPointItem> {
  const xAxisDataKey = isNullish(xAxis.dataKey) ? scatterSettings.dataKey : xAxis.dataKey;
  const yAxisDataKey = isNullish(yAxis.dataKey) ? scatterSettings.dataKey : yAxis.dataKey;
  const zAxisDataKey = zAxis && zAxis.dataKey;
  const defaultRangeZ = zAxis ? zAxis.range : implicitZAxis.range;
  const defaultZ = defaultRangeZ && defaultRangeZ[0];
  const xBandSize = xAxis.scale.bandwidth ? xAxis.scale.bandwidth() : 0;
  const yBandSize = yAxis.scale.bandwidth ? yAxis.scale.bandwidth() : 0;

  return displayedData.map((entry: unknown, index): ScatterPointItem => {
    const x: unknown = getValueByDataKey(entry, xAxisDataKey);
    const y: unknown = getValueByDataKey(entry, yAxisDataKey);
    const z: unknown = (!isNullish(zAxisDataKey) && getValueByDataKey(entry, zAxisDataKey)) || "-";

    const tooltipPayload: Array<TooltipPayloadEntry> = [
      {
        name: isNullish(xAxis.dataKey)
          ? scatterSettings.name
          : (xAxis.name ?? String(xAxis.dataKey)),
        unit: xAxis.unit ?? "",
        value: tooltipValue(x),
        payload: entry,
        dataKey: xAxisDataKey,
        type: scatterSettings.tooltipType,
        graphicalItemId: scatterSettings.id,
      },
      {
        name: isNullish(yAxis.dataKey)
          ? scatterSettings.name
          : (yAxis.name ?? String(yAxis.dataKey)),
        unit: yAxis.unit ?? "",
        value: tooltipValue(y),
        payload: entry,
        dataKey: yAxisDataKey,
        type: scatterSettings.tooltipType,
        graphicalItemId: scatterSettings.id,
      },
    ];
    if (z !== "-" && zAxis != null) {
      tooltipPayload.push({
        name: zAxis.name ?? (typeof zAxis.dataKey === "string" ? zAxis.dataKey : undefined),
        unit: zAxis.unit ?? "",
        value: tooltipValue(z),
        payload: entry,
        dataKey: zAxisDataKey,
        type: scatterSettings.tooltipType,
        graphicalItemId: scatterSettings.id,
      });
    }

    const cx = getCateCoordinateOfLine({
      axis: xAxis,
      ticks: xAxisTicks,
      bandSize: xBandSize,
      entry,
      index,
      dataKey: xAxisDataKey,
    });
    const cy = getCateCoordinateOfLine({
      axis: yAxis,
      ticks: yAxisTicks,
      bandSize: yBandSize,
      entry,
      index,
      dataKey: yAxisDataKey,
    });
    const size = z !== "-" && zAxis != null ? (zAxis.scale.map(z) ?? defaultZ) : defaultZ;
    const radius = size == null ? 0 : Math.sqrt(Math.max(size, 0) / Math.PI);

    return {
      cx: cx ?? undefined,
      cy: cy ?? undefined,
      x: cx == null ? undefined : cx - radius,
      y: cy == null ? undefined : cy - radius,
      width: 2 * radius,
      height: 2 * radius,
      size: size ?? 0,
      node: { x: coerceNode(x), y: coerceNode(y), z: coerceNode(z) },
      tooltipPayload,
      tooltipPosition: { x: cx ?? 0, y: cy ?? 0 },
      payload: entry,
      // recharts spreads `...entry` into the point, so a data row's `fill` rides
      // through and the symbol picks it up below.
      fill: ((): string | undefined => {
        const f = getValueByDataKey(entry, "fill");
        return typeof f === "string" ? f : undefined;
      })(),
      name: ((): string | number | undefined => {
        const n = getValueByDataKey(entry, "name");
        return typeof n === "string" || typeof n === "number" ? n : undefined;
      })(),
      cell: cells?.[index],
    };
  });
}

// Default per-frame interpolation for Scatter points (the `animationInterpolateFn`
// the new AnimatedItems engine drives). Mirrors recharts 3.9
// `defaultScatterAnimateItems`: matched points tween cx/cy/size between prev/next;
// added points grow their size from 0; removed points are dropped immediately
// (no exit animation). At t=1 every non-removed point lands on its final geometry.
const defaultScatterAnimateItems: AnimationInterpolateFn<ScatterPointItem, CartesianLayout> = (
  items,
  t,
) => {
  if (items == null) return [];
  if (t === 1) {
    return items.flatMap((item) => (item.status === "removed" ? [] : [item.next]));
  }
  return items.flatMap((item): ScatterPointItem[] => {
    if (item.status === "removed") return [];
    if (item.status === "matched") {
      return [
        {
          ...item.next,
          cx: item.next.cx == null ? undefined : interpolate(item.prev.cx, item.next.cx, t),
          cy: item.next.cy == null ? undefined : interpolate(item.prev.cy, item.next.cy, t),
          size: interpolate(item.prev.size, item.next.size, t),
        },
      ];
    }
    // added
    return [{ ...item.next, size: interpolate(0, item.next.size, t) }];
  });
};

export interface ScatterProps {
  xAxisId?: AxisId;
  yAxisId?: AxisId;
  zAxisId?: AxisId;
  dataKey?: DataKey<unknown>;
  data?: ChartData;
  name?: string | number;
  fill?: string;
  fillOpacity?: number | string;
  stroke?: string;
  strokeWidth?: number | string;
  line?: boolean | CurveProps | ((points: ReadonlyArray<ScatterPointItem>) => JSX.Element);
  /** How the connecting line is computed: through every point ("joint") or a linear regression ("fitting"). */
  lineType?: "fitting" | "joint";
  /** Curve interpolation for the joint line. Has no effect for lineType="fitting". */
  lineJointType?: CurveType;
  /**
   * Built-in symbol type ("circle", "cross", …) OR a custom shape render prop
   * (function form): called per point with its computed geometry + payload, its
   * return replaces the default <Symbols>. During animations the per-point item
   * is widened with `ShapeAnimationProps` (`animationElapsedTime`, `isAnimating`,
   * `isEntrance`) so the custom shape can react to animation state (v3.9).
   * (recharts also accepts an element — element form is N/A by design — no
   * cloneElement.)
   */
  shape?: SymbolType | ((item: ScatterPointItem & ShapeAnimationProps) => JSX.Element);
  /** Highlighted shape for the active (hovered) point — object/function/boolean forms. */
  activeShape?: ActiveShape<ScatterShapeProps, SVGElement>;
  legendType?: LegendType;
  tooltipType?: TooltipType;
  /** Formats this Scatter's tooltip value; takes precedence over the Tooltip-level `formatter`. */
  formatter?: Formatter;
  hide?: boolean;
  isAnimationActive?: boolean | "auto";
  animationBegin?: number;
  animationDuration?: AnimationDuration;
  animationEasing?: EasingInput;
  /** Custom per-frame interpolation for the scatter points (v3.9). */
  animationInterpolateFn?: AnimationInterpolateFn<ScatterPointItem, CartesianLayout>;
  /** How prev/next points are matched across data updates (v3.9). @defaultValue matchAppend */
  animationMatchBy?: AnimationMatchByProp<ScatterPointItem>;
  /**
   * Z-Index of this component and its children; the higher, the more on top.
   * @defaultValue 600 (DefaultZIndexes.scatter)
   */
  zIndex?: number;
  id?: string;
  class?: string;
  onMouseEnter?: ScatterMouseEvent;
  onMouseLeave?: ScatterMouseEvent;
  onClick?: ScatterMouseEvent;
  /** Per-point labels (via LabelList). @defaultValue false */
  label?: ImplicitLabelListType;
  /** <Cell> children supplying per-point fill/class overrides. */
  children?: JSX.Element;
}

export const scatterDefaultProps = {
  xAxisId: 0,
  yAxisId: 0,
  zAxisId: 0,
  legendType: "circle",
  shape: "circle",
  fill: "#808080",
  line: false,
  lineType: "joint",
  lineJointType: "linear",
  hide: false,
  isAnimationActive: "auto",
  animationBegin: 0,
  animationDuration: 400,
  animationEasing: "linear",
  animationInterpolateFn: defaultScatterAnimateItems,
  animationMatchBy: matchAppend,
  zIndex: DefaultZIndexes.scatter,
} as const satisfies Partial<ScatterProps>;

// Ported from recharts Scatter `errorBarDataPointFormatter`: maps a computed
// scatter point + the ErrorBar's dataKey/direction to the {x, y, value, errorVal}
// the ErrorBar needs to draw and to extend the axis domain.
const scatterErrorBarFormatter: ErrorBarDataPointFormatter = (
  entry: unknown,
  dataKey: DataKey<unknown>,
  direction: ErrorBarDirection,
): ErrorBarDataItem => {
  const cx = getValueByDataKey(entry, "cx");
  const cy = getValueByDataKey(entry, "cy");
  const node = getValueByDataKey(entry, "node");
  const nodeValue = getValueByDataKey(node, direction === "x" ? "x" : "y");
  // recharts' ScatterPointItem spreads the original row (`...entry`), so it reads
  // the error dataKey straight off the point; our point keeps the row under
  // `.payload`, so read from there (mirrors Bar's barErrorBarFormatter).
  const payload = getValueByDataKey(entry, "payload");
  const errorVal = getValueByDataKey(payload, dataKey);
  return {
    x: typeof cx === "number" ? cx : undefined,
    y: typeof cy === "number" ? cy : undefined,
    value: Number(nodeValue),
    errorVal: Array.isArray(errorVal)
      ? errorVal.filter((v): v is number => typeof v === "number")
      : typeof errorVal === "number"
        ? errorVal
        : undefined,
  };
};

export const Scatter = (props: ScatterProps): JSX.Element => {
  const store = useAppStore();
  const merged = mergeProps(scatterDefaultProps, props);
  const isPanorama = useIsPanorama();
  const id = useUniqueId("recharts-scatter", props.id);
  // `shape` is either a built-in symbol type or a custom render fn; resolve once.
  const customShape = typeof merged.shape === "function" ? merged.shape : undefined;
  const symbolType = typeof merged.shape === "function" ? "circle" : merged.shape;
  const { needClip } = useNeedsClip(merged.xAxisId, merged.yAxisId);

  // Active-shape highlight on the hovered point (recharts ScatterSymbols): the
  // active point swaps its shape for `activeShape` and renders in a
  // `.recharts-active-shape` layer. `false`/nullish disables it.
  const activeTooltipIndex = useAppSelector(selectActiveTooltipIndex);
  const hasActiveShape = (): boolean => {
    const a = merged.activeShape;
    return a != null && a !== false;
  };
  // The default shape a (possibly partial-object) activeShape falls back to.
  const defaultSymbolShape = (p: ScatterShapeProps): JSX.Element => <Symbols {...p} />;

  if (store != null) {
    registerInStore<ScatterSettings>(
      () => ({
        id,
        type: "scatter",
        isPanorama,
        data: merged.data,
        dataKey: merged.dataKey,
        xAxisId: merged.xAxisId,
        yAxisId: merged.yAxisId,
        zAxisId: merged.zAxisId,
        hide: merged.hide,
        tooltipType: merged.tooltipType,
        name: merged.name,
      }),
      {
        add: (next) => store.actions.graphicalItems.addCartesianGraphicalItem(next),
        replace: (prev, next) =>
          store.actions.graphicalItems.replaceCartesianGraphicalItem({ prev, next }),
        remove: (prev) => store.actions.graphicalItems.removeCartesianGraphicalItem(prev),
      },
    );
  }

  // Per-point <Cell> overrides (collected from children, in data order).
  const cells = collectCells(() => props.children);
  const points = useAppSelector((state) =>
    selectScatterPoints(
      state,
      merged.xAxisId,
      merged.yAxisId,
      merged.zAxisId,
      id,
      isPanorama,
      cells(),
    ),
  );

  const labelListEntries = createMemo<ReadonlyArray<CartesianLabelListEntry>>(() => {
    const pts = points();
    if (!pts) {
      return [];
    }
    return pts.map((point): CartesianLabelListEntry => {
      const viewBox: TrapezoidViewBox = {
        x: point.x ?? 0,
        y: point.y ?? 0,
        width: point.width,
        height: point.height,
        lowerWidth: point.width,
        upperWidth: point.width,
      };
      return {
        ...viewBox,
        value: undefined,
        payload: point.payload,
        viewBox,
        fill: undefined,
      };
    });
  });

  // Animation start/end tracking: labels are hidden while the symbols animate
  // (recharts `showLabels={!isAnimating}`), revealed once the animation settles.
  const { isAnimating, handleAnimationStart, handleAnimationEnd } = useAnimationCallbacks();
  const labelContextEntries = createMemo(() => (isAnimating() ? undefined : labelListEntries()));

  const nameOf = (): string | undefined =>
    merged.name == null ? getTooltipNameProp(undefined, merged.dataKey) : String(merged.name);

  const tooltipConfig = createMemo<TooltipPayloadConfiguration>(() => ({
    dataDefinedOnItem: points()?.map((p) => p.tooltipPayload),
    getPosition: (index) => points()?.[Number(index)]?.tooltipPosition,
    settings: {
      // recharts reads the RAW prop fill/stroke (no defaults applied) for the
      // tooltip entry — the #808080 default fill is render-only. Mirror that.
      stroke: props.stroke,
      strokeWidth: props.strokeWidth,
      fill: props.fill,
      dataKey: merged.dataKey,
      nameKey: undefined,
      name: nameOf(),
      hide: merged.hide,
      type: merged.tooltipType,
      color: props.fill,
      unit: "",
      formatter: merged.formatter,
      graphicalItemId: id,
    },
  }));

  const legendPayload = createMemo<ReadonlyArray<LegendPayload>>(() => [
    {
      inactive: merged.hide,
      dataKey: merged.dataKey,
      type: merged.legendType,
      color: merged.fill,
      value: nameOf(),
    },
  ]);

  // Item-type tooltip dispatch per point. Getter args: the hooks read
  // handler/dataKey at event time (fresh, never stale).
  const onItemEnter = useMouseEnterItemDispatch(
    () => props.onMouseEnter,
    () => merged.dataKey,
    id,
  );
  const onItemLeave = useMouseLeaveItemDispatch(() => props.onMouseLeave);
  const onItemClick = useMouseClickItemDispatch(
    () => props.onClick,
    () => merged.dataKey,
    id,
  );

  // Holds the latest visible points frame so a re-animation (data change) tweens
  // from where the dots currently are. Managed by AnimatedItems via
  // useAnimationStartSnapshot.
  const previousPointsRef: MutableRef<ReadonlyArray<ScatterPointItem> | null | undefined> = {
    current: null,
  };
  const layout = useCartesianChartLayout();
  // The optional connecting line through the points (recharts ScatterLine):
  // lineType "joint" links every point; "fitting" draws a linear regression. The
  // Curve renders fill=none, stroke=scatter fill, carrying the scatter's `name`.
  const renderScatterLine = (frame: ReadonlyArray<ScatterPointItem>): JSX.Element => {
    const line = merged.line;
    const head = frame[0];
    if (!line || head == null) {
      return null;
    }
    let linePoints: ReadonlyArray<NullableCoordinate>;
    if (merged.lineType === "fitting") {
      const { xmin, xmax, a, b } = getLinearRegression([head, ...frame.slice(1)]);
      const linearExp = (x: number): number => a * x + b;
      linePoints = [
        { x: xmin, y: linearExp(xmin) },
        { x: xmax, y: linearExp(xmax) },
      ];
    } else {
      linePoints = frame.map((entry) => ({ x: entry.cx ?? null, y: entry.cy ?? null }));
    }
    const customLineProps =
      typeof line === "object" ? (svgPropertiesNoEventsFromUnknown(line) ?? undefined) : undefined;
    // `name` renders on the path (recharts spreads the scatter's name onto the
    // line) but isn't in the typed SVG path attributes — widen the local.
    const lineProps: CurveProps & { name?: string } = {
      name: merged.name == null ? undefined : String(merged.name),
      fill: "none",
      stroke: merged.fill,
      ...customLineProps,
      points: linePoints,
    };
    return (
      <Layer class="recharts-scatter-line">
        {typeof line === "function" ? (
          line(frame)
        ) : (
          <Curve {...lineProps} type={merged.lineJointType} />
        )}
      </Layer>
    );
  };

  const renderScatterBody = (
    frame: ReadonlyArray<ScatterPointItem>,
    animationElapsedTime: number,
    isEntrance: boolean,
  ): JSX.Element => (
    <>
      {renderScatterLine(frame)}
      <For each={frame}>
        {(entry, i) => (
          <Layer
            class={["recharts-scatter-symbol", entry.cell?.class]
              .filter((c): c is string => Boolean(c))
              .join(" ")}
            onMouseEnter={onItemEnter(entry, i())}
            onMouseLeave={onItemLeave(entry, i())}
            onClick={onItemClick(entry, i())}
          >
            <Show when={entry.cx != null && entry.cy != null}>
              {hasActiveShape() && activeTooltipIndex() === String(i()) ? (
                <Shape
                  option={merged.activeShape}
                  DefaultShape={defaultSymbolShape}
                  shapeProps={{
                    ...entry,
                    type: symbolType,
                    sizeType: "area",
                    fill: entry.cell?.fill ?? entry.fill ?? merged.fill,
                    isActive: true,
                    index: i(),
                  }}
                />
              ) : customShape ? (
                // v3.9: forward the animation state into the custom shape so it
                // can react to it (mirrors recharts ScatterSymbols). isAnimating
                // combines the live callback flag with an in-flight progress check.
                customShape({
                  ...entry,
                  animationElapsedTime,
                  isAnimating: isAnimating() || animationElapsedTime < 1,
                  isEntrance,
                })
              ) : (
                <Symbols
                  cx={entry.cx}
                  cy={entry.cy}
                  width={entry.width}
                  height={entry.height}
                  size={entry.size}
                  sizeType="area"
                  type={symbolType}
                  name={entry.name}
                  fill={entry.cell?.fill ?? entry.fill ?? merged.fill}
                  fillOpacity={merged.fillOpacity}
                  stroke={entry.cell?.stroke}
                />
              )}
            </Show>
          </Layer>
        )}
      </For>
      <CartesianLabelListContextProvider value={labelContextEntries}>
        <LabelListFromLabelProp label={merged.label} />
      </CartesianLabelListContextProvider>
    </>
  );

  return (
    <>
      <SetTooltipEntrySettings tooltipEntrySettings={tooltipConfig()} />
      <SetLegendPayload id={id} legendPayload={legendPayload()} />
      <Show when={!merged.hide && points()}>
        {(pts) => (
          // Wrapped in <ZIndexLayer> (default 600) so a `zIndex` prop relayers the
          // whole `.recharts-scatter` Layer into its portal — recharts wraps the
          // entire Layer in ZIndexLayer. The needClip <Show> stays OUTSIDE the portal
          // (each branch mounts its own ZIndexLayer wrapping a stable <Layer>).
          <Show
            when={needClip()}
            fallback={
              <ZIndexLayer zIndex={merged.zIndex}>
                <Layer class="recharts-scatter" id={id}>
                  <AnimatedItems
                    animationInput={pts()}
                    animationIdPrefix="recharts-scatter-"
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
                    layout={layout() ?? "horizontal"}
                  >
                    {(frame, animationElapsedTime, isEntrance) => (
                      <Layer>{renderScatterBody(frame, animationElapsedTime, isEntrance)}</Layer>
                    )}
                  </AnimatedItems>
                </Layer>
              </ZIndexLayer>
            }
          >
            <ZIndexLayer zIndex={merged.zIndex}>
              <Layer class="recharts-scatter" id={id} clipPath={`url(#clipPath-${id})`}>
                <defs>
                  <GraphicalItemClipPath
                    clipPathId={id}
                    xAxisId={merged.xAxisId}
                    yAxisId={merged.yAxisId}
                  />
                </defs>
                <AnimatedItems
                  animationInput={pts()}
                  animationIdPrefix="recharts-scatter-"
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
                  layout={layout() ?? "horizontal"}
                >
                  {(frame, animationElapsedTime, isEntrance) => (
                    <Layer>{renderScatterBody(frame, animationElapsedTime, isEntrance)}</Layer>
                  )}
                </AnimatedItems>
              </Layer>
            </ZIndexLayer>
          </Show>
        )}
      </Show>
      {/* Children (e.g. <ErrorBar>) mount ONCE here at the stable top-level — NOT
          inside the points/animation-dependent <Show>, which would re-mount them
          on every recompute (ErrorBar would churn add/removeErrorBar → re-extend the
          domain → recompute → loop, and throw ContextNotFound when remounted bare).
          Mirrors recharts' ScatterWithId: RegisterGraphicalItemId + SetErrorBarContext
          provide the item id + error-bar wiring; children draw against the live points. */}
      <RegisterGraphicalItemId type="scatter" id={id}>
        {() => (
          <SetErrorBarContext
            xAxisId={merged.xAxisId}
            yAxisId={merged.yAxisId}
            data={points() ?? []}
            dataPointFormatter={scatterErrorBarFormatter}
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
