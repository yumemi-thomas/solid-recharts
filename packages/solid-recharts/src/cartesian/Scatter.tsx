// Ported from recharts 3.8.1 src/cartesian/Scatter.tsx (commit 7a23854).
//
// MINIMAL PORT — a point cloud: one <Symbols> per data point at (cx, cy), sized
// from the (optional) Z axis. Deferred (documented): ScatterLine, activeShape /
// element-form shape, ErrorBar, labels, ZIndexLayer, clip. (Animation, Cells —
// per-point fill/stroke/class via <Cell> children — and the function-form custom
// `shape` render prop are wired.) Solid deviations:
// resolveDefaultProps→merge; effect-dispatch registration → createEffect/onCleanup;
// the `@ts-expect-error`-laden value plumbing is replaced with typed coercion.
import { createEffect, createMemo, For, merge, onCleanup, Show, untrack } from "solid-js";
import type { JSX } from "@solidjs/web";
import { useAppSelector, useAppStore } from "../state/hooks";
import { useIsPanorama } from "../context/PanoramaContext";
import { useUniqueId } from "../util/useUniqueId";
import { useAnimationId } from "../util/useAnimationId";
import { JavascriptAnimate } from "../animation/JavascriptAnimate";
import type { EasingInput } from "../animation/easing";
import { Layer } from "../container/Layer";
import { Symbols } from "../shape/Symbols";
import type { CurveProps } from "../shape/Curve";
import { GraphicalItemClipPath, useNeedsClip } from "./GraphicalItemClipPath";
import { type CellProps, collectCells } from "../component/Cell";
import {
  type CartesianLabelListEntry,
  CartesianLabelListContextProvider,
  type ImplicitLabelListType,
  LabelListFromLabelProp,
} from "../component/LabelList";
import { selectScatterPoints } from "../state/selectors/scatterSelectors";
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
  Coordinate,
  DataKey,
  LegendType,
  SymbolType,
  TickItem,
  TooltipType,
  TrapezoidViewBox,
} from "../util/types";
import { getCateCoordinateOfLine, getTooltipNameProp, getValueByDataKey } from "../util/ChartUtils";
import { interpolate, isNullish, isNumOrStr } from "../util/DataUtils";
import { BaseAxisWithScale, implicitZAxis, ZAxisWithScale } from "../state/selectors/axisSelectors";
import type { ValueType } from "../component/DefaultTooltipContent";

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
  /** Per-point presentation overrides from a matching <Cell> child (if any). */
  cell?: CellProps | undefined;
}

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
      cell: cells?.[index],
    };
  });
}

/** Per-frame symbol growth: size scales 0→full (enter); t=1 → final. */
function toAnimatedScatterPoints(
  points: ReadonlyArray<ScatterPointItem>,
  prev: ReadonlyArray<ScatterPointItem> | null,
  t: number,
): ReadonlyArray<ScatterPointItem> {
  if (t === 1) {
    return points;
  }
  return points.map((entry, index): ScatterPointItem => {
    const p = prev?.[index];
    if (p) {
      return { ...entry, size: interpolate(p.size, entry.size, t) };
    }
    return { ...entry, size: interpolate(0, entry.size, t) };
  });
}

export interface ScatterProps {
  xAxisId?: AxisId;
  yAxisId?: AxisId;
  zAxisId?: AxisId;
  dataKey?: DataKey<unknown>;
  data?: ChartData;
  name?: string | number;
  fill?: string;
  fillOpacity?: number | string;
  line?: boolean | CurveProps | ((points: ReadonlyArray<ScatterPointItem>) => JSX.Element);
  /**
   * Built-in symbol type ("circle", "cross", …) OR a custom shape render prop
   * (function form): called per point with its computed geometry + payload, its
   * return replaces the default <Symbols>. (recharts also accepts an element —
   * element form is deferred, see header.)
   */
  shape?: SymbolType | ((item: ScatterPointItem) => JSX.Element);
  legendType?: LegendType;
  tooltipType?: TooltipType;
  hide?: boolean;
  isAnimationActive?: boolean | "auto";
  animationBegin?: number;
  animationDuration?: AnimationDuration;
  animationEasing?: EasingInput;
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
  hide: false,
  isAnimationActive: "auto",
  animationBegin: 0,
  animationDuration: 400,
  animationEasing: "linear",
} as const satisfies Partial<ScatterProps>;

export const Scatter = (props: ScatterProps): JSX.Element => {
  const store = useAppStore();
  const merged = merge(scatterDefaultProps, props);
  const isPanorama = useIsPanorama();
  const id = useUniqueId("recharts-scatter", props.id);
  // `shape` is either a built-in symbol type or a custom render fn; resolve once.
  const customShape = typeof merged.shape === "function" ? merged.shape : undefined;
  const symbolType = typeof merged.shape === "function" ? "circle" : merged.shape;
  const { needClip } = useNeedsClip(merged.xAxisId, merged.yAxisId);

  let prev: ScatterSettings | null = null;

  createEffect(
    (): ScatterSettings => ({
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

  const labelContextEntries = createMemo(() => labelListEntries());

  const nameOf = (): string | undefined =>
    merged.name == null ? getTooltipNameProp(undefined, merged.dataKey) : String(merged.name);

  const tooltipConfig = createMemo<TooltipPayloadConfiguration>(() => ({
    dataDefinedOnItem: points()?.map((p) => p.tooltipPayload),
    getPosition: (index) => points()?.[Number(index)]?.tooltipPosition,
    settings: {
      stroke: undefined,
      fill: merged.fill,
      dataKey: merged.dataKey,
      nameKey: undefined,
      name: nameOf(),
      hide: merged.hide,
      type: merged.tooltipType,
      color: merged.fill,
      unit: "",
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

  // Item-type tooltip dispatch per point.
  const onItemEnter = useMouseEnterItemDispatch(props.onMouseEnter, merged.dataKey, id);
  const onItemLeave = useMouseLeaveItemDispatch(props.onMouseLeave);
  const onItemClick = useMouseClickItemDispatch(props.onClick, merged.dataKey, id);

  // Enter animation: symbols scale up from size 0. Keyed <Show> restarts on a new
  // id; isAnimationActive=false → t=1 → full size → byte-identical to static.
  const animationId = useAnimationId(() => points(), "recharts-scatter-");
  let prevPoints: ReadonlyArray<ScatterPointItem> | null = null;
  const renderScatterBody = (frame: ReadonlyArray<ScatterPointItem>): JSX.Element => (
    <>
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
              {customShape ? (
                customShape(entry)
              ) : (
                <Symbols
                  cx={entry.cx}
                  cy={entry.cy}
                  width={entry.width}
                  height={entry.height}
                  size={entry.size}
                  sizeType="area"
                  type={symbolType}
                  fill={entry.cell?.fill ?? entry.fill ?? merged.fill}
                  fill-opacity={merged.fillOpacity}
                  stroke={entry.cell?.stroke}
                />
              )}
            </Show>
          </Layer>
        )}
      </For>
      <CartesianLabelListContextProvider value={labelContextEntries}>
        {props.children}
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
                  const frame = toAnimatedScatterPoints(untrack(pts), prevPoints, t);
                  prevPoints = frame;
                  return (
                    <Show
                      when={needClip()}
                      fallback={
                        <Layer class="recharts-scatter" id={id}>
                          {renderScatterBody(frame)}
                        </Layer>
                      }
                    >
                      <Layer class="recharts-scatter" id={id} clip-path={`url(#clipPath-${id})`}>
                        <defs>
                          <GraphicalItemClipPath
                            clipPathId={id}
                            xAxisId={merged.xAxisId}
                            yAxisId={merged.yAxisId}
                          />
                        </defs>
                        {renderScatterBody(frame)}
                      </Layer>
                    </Show>
                  );
                }}
              </JavascriptAnimate>
            )}
          </Show>
        )}
      </Show>
    </>
  );
};
