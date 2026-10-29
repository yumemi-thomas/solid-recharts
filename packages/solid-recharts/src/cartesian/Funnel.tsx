// Ported from recharts 3.8.1 src/cartesian/Funnel.tsx (commit 7a23854).
//
// MINIMAL PORT — a stack of trapezoids whose widths track the dataKey value
// (largest on top), reused by FunnelChart. `computeFunnelTrapezoids` is the pure
// geometry function, ported faithfully (incl. `reversed` and the `lastShapeType`
// triangle/rectangle tail). Funnel has no axes: its settings are resolved from
// props and fed straight to the selector (no graphical-items slice registration).
//
// Solid deviations: `resolveDefaultProps`→`merge`; `findAllByType(children, Cell)`
// → `collectCells` (the CellReader port); the `@ts-expect-error` ranged-value casts
// → typed narrowing. Cells + per-row fill/stroke ARE wired (cell → data → prop).
// Tooltip (item-type) registration + per-trapezoid hover dispatch are wired.
// Animation (the v3.9 AnimatedItems + AnimationController engine, growing each
// trapezoid from a collapsed center via `defaultFunnelAnimateItems`),
// function-form `shape`/`activeShape`, labels (LabelList + `label` prop), and the
// full per-trapezoid pointer-handler set (onClick/onMouseDown/Up/Move/Over/Out/
// Enter/Leave/onTouchStart/Move/End, props-first `(data, index, event)`) ARE wired.
// No legend registration and no ZIndexLayer — matching recharts (upstream Funnel
// registers no legend payload and renders inline without a zIndex portal).
import { createMemo, For, merge, Show } from "solid-js";
import type { JSX } from "@solidjs/web";
import { useAppSelector } from "../state/hooks";
import { useUniqueId } from "../util/useUniqueId";
import {
  AnimatedItems,
  useAnimationCallbacks,
  type AnimationInterpolateFn,
} from "../animation/AnimatedItems";
import { matchAppend, type AnimationMatchByProp } from "../animation/matchBy";
import type { MutableRef } from "../animation/useAnimationStartSnapshot";
import { useCartesianChartLayout } from "../context/chartLayoutContext";
import type { EasingInput } from "../animation/easing";
import { Layer } from "../container/Layer";
import { FunnelTrapezoid } from "../util/FunnelUtils";
import { collectCells } from "../component/Cell";
import {
  CartesianLabelListContextProvider,
  LabelListFromLabelProp,
  type CartesianLabelListEntry,
  type ImplicitLabelListType,
} from "../component/LabelList";
import { selectActiveIndex } from "../state/selectors/tooltipSelectors";
import { SetTooltipEntrySettings } from "../state/SetTooltipEntrySettings";
import type { Formatter } from "../component/DefaultTooltipContent";
import { TooltipPayload, TooltipPayloadConfiguration } from "../state/tooltipSlice";
import {
  useMouseClickItemDispatch,
  useMouseEnterItemDispatch,
  useMouseLeaveItemDispatch,
} from "../context/tooltipContext";
import {
  ActiveShape,
  AnimationDuration,
  CartesianLayout,
  ChartOffsetInternal,
  Coordinate,
  CartesianViewBoxRequired,
  DataKey,
  LegendType,
  ShapeAnimationProps,
  TooltipType,
  TrapezoidViewBox,
} from "../util/types";
import { getPercentValue, interpolate } from "../util/DataUtils";
import { getValueByDataKey } from "../util/ChartUtils";
import { ChartData } from "../state/chartDataSlice";
import {
  type ResolvedFunnelSettings,
  selectFunnelTrapezoids,
} from "../state/selectors/funnelSelectors";

export type FunnelTrapezoidItem = TrapezoidViewBox & {
  value?: number | string;
  payload?: unknown;
  tooltipPosition: Coordinate;
  name: string;
  labelViewBox: TrapezoidViewBox;
  parentViewBox: CartesianViewBoxRequired;
  val: number | ReadonlyArray<number>;
  tooltipPayload: TooltipPayload;
  /** Resolved fill (cell → data row → funnel prop). */
  fill?: string;
  stroke?: string;
  /** The data row's `name` rides through as an SVG attribute on the path. */
  [key: string]: unknown;
};

const getRealWidthHeight = (
  customWidth: number | string | undefined,
  offset: ChartOffsetInternal,
): { realWidth: number; realHeight: number; offsetX: number; offsetY: number } => {
  const { width, height, left, top } = offset;
  return {
    realWidth: getPercentValue(customWidth, width, width),
    realHeight: height,
    offsetX: left,
    offsetY: top,
  };
};

const asNumber = (value: unknown): number => (typeof value === "number" ? value : 0);

export function computeFunnelTrapezoids({
  dataKey,
  nameKey,
  displayedData,
  tooltipType,
  lastShapeType,
  reversed,
  offset,
  customWidth,
  graphicalItemId,
}: {
  dataKey: DataKey<unknown> | undefined;
  nameKey: DataKey<unknown> | undefined;
  offset: ChartOffsetInternal;
  displayedData: ReadonlyArray<Record<string, unknown>>;
  tooltipType?: TooltipType;
  lastShapeType?: "triangle" | "rectangle";
  reversed?: boolean;
  customWidth: number | string | undefined;
  graphicalItemId: string;
}): ReadonlyArray<FunnelTrapezoidItem> {
  const { realHeight, realWidth, offsetX, offsetY } = getRealWidthHeight(customWidth, offset);
  const values = displayedData.map((entry) => asNumber(getValueByDataKey(entry, dataKey, 0)));
  const maxValue = Math.max(...values);
  const len = displayedData.length;
  const rowHeight = realHeight / len;
  const parentViewBox: CartesianViewBoxRequired = {
    x: offset.left,
    y: offset.top,
    width: offset.width,
    height: offset.height,
  };

  let trapezoids: ReadonlyArray<FunnelTrapezoidItem> = displayedData.map(
    (entry, i): FunnelTrapezoidItem => {
      const rawVal: unknown = getValueByDataKey(entry, dataKey, 0);
      const name = String(getValueByDataKey(entry, nameKey, i));
      let val = asNumber(Array.isArray(rawVal) ? rawVal[0] : rawVal);
      let nextVal: number;

      if (i !== len - 1) {
        const nextDataValue: unknown = getValueByDataKey(displayedData[i + 1], dataKey, 0);
        if (typeof nextDataValue === "number") {
          nextVal = nextDataValue;
        } else if (Array.isArray(nextDataValue)) {
          val = asNumber(nextDataValue[0]);
          nextVal = asNumber(nextDataValue[1]);
        } else {
          nextVal = 0;
        }
      } else if (Array.isArray(rawVal) && rawVal.length === 2) {
        val = asNumber(rawVal[0]);
        nextVal = asNumber(rawVal[1]);
      } else if (lastShapeType === "rectangle") {
        nextVal = val;
      } else {
        nextVal = 0;
      }

      const x =
        maxValue === 0 ? offsetX : ((maxValue - val) * realWidth) / (2 * maxValue) + offsetX;
      const y = rowHeight * i + offsetY;
      const upperWidth = maxValue === 0 ? 0 : (val / maxValue) * realWidth;
      const lowerWidth = maxValue === 0 ? 0 : (nextVal / maxValue) * realWidth;

      const tooltipPayload: TooltipPayload = [
        { name, value: val, payload: entry, dataKey, type: tooltipType, graphicalItemId },
      ];
      const tooltipPosition: Coordinate = { x: x + upperWidth / 2, y: y + rowHeight / 2 };
      const trapezoidViewBox: TrapezoidViewBox = {
        x,
        y,
        upperWidth,
        lowerWidth,
        width: Math.max(upperWidth, lowerWidth),
        height: rowHeight,
      };

      return {
        // Data/cell fields first (fill/stroke/name); computed geometry wins after,
        // matching recharts' `omit(entry, ['width'])` (keeps the trapezoid width).
        ...entry,
        ...trapezoidViewBox,
        name,
        val,
        value: val,
        tooltipPayload,
        tooltipPosition,
        payload: entry,
        parentViewBox,
        labelViewBox: trapezoidViewBox,
      };
    },
  );

  if (reversed) {
    trapezoids = trapezoids.map((entry, index): FunnelTrapezoidItem => {
      const reversedViewBox: TrapezoidViewBox = {
        x: entry.x - (entry.lowerWidth - entry.upperWidth) / 2,
        y: entry.y - index * rowHeight + (len - 1 - index) * rowHeight,
        upperWidth: entry.lowerWidth,
        lowerWidth: entry.upperWidth,
        width: Math.max(entry.lowerWidth, entry.upperWidth),
        height: rowHeight,
      };
      return {
        ...entry,
        ...reversedViewBox,
        tooltipPosition: {
          ...entry.tooltipPosition,
          y: entry.y - index * rowHeight + (len - 1 - index) * rowHeight + rowHeight / 2,
        },
        labelViewBox: reversedViewBox,
      };
    });
  }

  return trapezoids;
}

type FunnelPointerEvent = MouseEvent | TouchEvent;

/** Per-trapezoid event handler: `(data, index, event)`, props-first like recharts. */
export type FunnelMouseEvent = (
  data: FunnelTrapezoidItem,
  index: number,
  event: FunnelPointerEvent,
) => void;

export interface FunnelProps<DataPointType = Record<string, unknown>, DataValueType = unknown> {
  dataKey?: DataKey<DataPointType, DataValueType>;
  nameKey?: DataKey<DataPointType>;
  data?: ChartData;
  width?: string | number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  name?: string | number;
  legendType?: LegendType;
  tooltipType?: TooltipType;
  /** Formats this Funnel's tooltip value; takes precedence over the Tooltip-level `formatter`. */
  formatter?: Formatter;
  lastShapeType?: "triangle" | "rectangle";
  reversed?: boolean;
  hide?: boolean;
  isAnimationActive?: boolean | "auto";
  animationBegin?: number;
  animationDuration?: AnimationDuration;
  animationEasing?: EasingInput;
  /** Custom per-frame interpolation for the trapezoids (v3.9). */
  animationInterpolateFn?: AnimationInterpolateFn<FunnelTrapezoidItem, CartesianLayout>;
  /** How prev/next trapezoids are matched across data updates (v3.9). @defaultValue matchAppend */
  animationMatchBy?: AnimationMatchByProp<FunnelTrapezoidItem>;
  onAnimationStart?: () => void;
  onAnimationEnd?: () => void;
  /**
   * Custom trapezoid renderer; replaces the default <Trapezoid>. Supports the
   * function form (called with the item), the object form (partial props merged
   * into the default <Trapezoid>), and the boolean form. During animations the
   * item also carries `animationElapsedTime`, `isAnimating`, and `isEntrance`
   * (v3.9 ShapeAnimationProps). (Element form is N/A — Solid has no cloneElement.)
   */
  shape?: ActiveShape<FunnelTrapezoidItem & ShapeAnimationProps, SVGPathElement>;
  /** Custom renderer for the active (hovered) trapezoid; same forms as `shape`. */
  activeShape?: ActiveShape<FunnelTrapezoidItem & ShapeAnimationProps, SVGPathElement>;
  /** Labels rendered from a `label` prop (in addition to <LabelList> children). */
  label?: ImplicitLabelListType;
  id?: string;
  class?: string;
  /** Per-trapezoid pointer event handlers, `(data, index, event)` props-first. */
  onClick?: FunnelMouseEvent;
  onMouseDown?: FunnelMouseEvent;
  onMouseUp?: FunnelMouseEvent;
  onMouseMove?: FunnelMouseEvent;
  onMouseOver?: FunnelMouseEvent;
  onMouseOut?: FunnelMouseEvent;
  onMouseEnter?: FunnelMouseEvent;
  onMouseLeave?: FunnelMouseEvent;
  onTouchStart?: FunnelMouseEvent;
  onTouchMove?: FunnelMouseEvent;
  onTouchEnd?: FunnelMouseEvent;
  /** <Cell> children supplying per-trapezoid fill/stroke/class overrides. */
  children?: JSX.Element;
}

// Default per-frame interpolation for the Funnel trapezoids (the
// `animationInterpolateFn` the new AnimatedItems engine drives). Mirrors recharts
// 3.9 `defaultFunnelAnimateItems`: matched trapezoids tween between prev/next;
// added trapezoids grow from a collapsed center point; removed ones vanish
// immediately (no shrink-out for Funnel).
const defaultFunnelAnimateItems: AnimationInterpolateFn<FunnelTrapezoidItem, CartesianLayout> = (
  items,
  t,
) => {
  if (items == null) return [];
  if (t === 1) {
    return items.flatMap((item) => (item.status === "removed" ? [] : [item.next]));
  }
  return items.flatMap((item): FunnelTrapezoidItem[] => {
    if (item.status === "removed") return [];
    if (item.status === "matched") {
      return [
        {
          ...item.next,
          x: interpolate(item.prev.x, item.next.x, t),
          y: interpolate(item.prev.y, item.next.y, t),
          upperWidth: interpolate(item.prev.upperWidth, item.next.upperWidth, t),
          lowerWidth: interpolate(item.prev.lowerWidth, item.next.lowerWidth, t),
          height: interpolate(item.prev.height, item.next.height, t),
        },
      ];
    }
    // added
    const { next } = item;
    return [
      {
        ...next,
        x: interpolate(next.x + next.upperWidth / 2, next.x, t),
        y: interpolate(next.y + next.height / 2, next.y, t),
        upperWidth: interpolate(0, next.upperWidth, t),
        lowerWidth: interpolate(0, next.lowerWidth, t),
        height: interpolate(0, next.height, t),
      },
    ];
  });
};

export const funnelDefaultProps = {
  fill: "#808080",
  stroke: "#fff",
  hide: false,
  isAnimationActive: "auto",
  animationBegin: 400,
  animationDuration: 1500,
  animationEasing: "ease",
  animationInterpolateFn: defaultFunnelAnimateItems,
  animationMatchBy: matchAppend,
  lastShapeType: "triangle",
  legendType: "rect",
  nameKey: "name",
  reversed: false,
} as const satisfies Partial<FunnelProps>;

export function Funnel<DataPointType = Record<string, unknown>, DataValueType = unknown>(
  props: FunnelProps<DataPointType, DataValueType>,
): JSX.Element {
  const merged = merge(funnelDefaultProps, props);
  const id = useUniqueId("recharts-funnel", () => props.id);

  const cells = collectCells(() => props.children);

  // Funnel-level presentation that each trapezoid inherits (data/cell props win).
  const presentationProps = createMemo<Record<string, unknown>>(() => ({
    fill: merged.fill,
    stroke: merged.stroke,
    strokeWidth: merged.strokeWidth,
  }));

  const funnelSettings = createMemo<ResolvedFunnelSettings>(() => ({
    dataKey: merged.dataKey,
    nameKey: merged.nameKey,
    data: merged.data,
    tooltipType: merged.tooltipType,
    lastShapeType: merged.lastShapeType,
    reversed: merged.reversed,
    customWidth: merged.width,
    cells: cells(),
    presentationProps: presentationProps(),
    id,
  }));

  const trapezoids = useAppSelector((state) => selectFunnelTrapezoids(state, funnelSettings()));

  // Item-type tooltip: the trapezoids carry their own payload; hovering one
  // activates the tooltip for that row.
  const tooltipConfig = createMemo<TooltipPayloadConfiguration>(() => ({
    dataDefinedOnItem: merged.data,
    getPosition: (index) => trapezoids()?.[Number(index)]?.tooltipPosition,
    settings: {
      stroke: merged.stroke,
      strokeWidth: merged.strokeWidth,
      fill: merged.fill,
      dataKey: merged.dataKey,
      name: merged.name,
      nameKey: merged.nameKey,
      hide: merged.hide,
      type: merged.tooltipType,
      color: merged.fill,
      unit: "",
      formatter: merged.formatter,
      graphicalItemId: id,
    },
  }));

  // Getter args: the hooks read handler/dataKey at event time (fresh, never stale).
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

  // Active (hovered) trapezoid index for `activeShape` (item-type tooltip).
  const activeItemIndex = useAppSelector((state) =>
    selectActiveIndex(state, "item", state.tooltip.settings.trigger, undefined),
  );

  // One LabelList entry per trapezoid (its labelViewBox + name/payload), provided
  // to <LabelList> children and the `label` prop via context.
  const labelListEntries = createMemo<ReadonlyArray<CartesianLabelListEntry>>(() =>
    (trapezoids() ?? []).map((entry) => {
      const viewBox: TrapezoidViewBox = entry.labelViewBox;
      return {
        ...viewBox,
        value: entry.name,
        payload: entry.payload,
        parentViewBox: entry.parentViewBox,
        viewBox,
        fill: entry.fill,
      };
    }),
  );

  // FunnelChart runs in a "horizontal" cartesian layout; the interpolation fn
  // ignores the layout value but AnimatedItems requires one (and a defined layout
  // gates the render, mirroring upstream's `if (layout == null) return null`).
  const layout = useCartesianChartLayout();

  // Holds the latest visible trapezoid frame so a re-animation (data change) tweens
  // from where the trapezoids currently are. Managed by AnimatedItems via
  // useAnimationStartSnapshot.
  const previousTrapezoidsRef: MutableRef<ReadonlyArray<FunnelTrapezoidItem> | null | undefined> = {
    current: null,
  };

  const { isAnimating, handleAnimationStart, handleAnimationEnd } = useAnimationCallbacks(
    () => props.onAnimationStart?.(),
    () => props.onAnimationEnd?.(),
  );
  const labelContextEntries = createMemo(() => (isAnimating() ? undefined : labelListEntries()));

  const layerClass = (): string =>
    ["recharts-trapezoids", merged.class].filter((c): c is string => Boolean(c)).join(" ");

  // Gate: render only in a (defined) cartesian layout AND when there are trapezoids
  // to draw. The animated subtree is created ONCE under this Show and its inner
  // reactive reads update in place (the same NO_OWNER-safe shape Bar uses).
  const renderableTrapezoids = createMemo<ReadonlyArray<FunnelTrapezoidItem> | undefined>(() => {
    if (merged.hide || layout() == null) {
      return undefined;
    }
    const items = trapezoids();
    return items != null && items.length > 0 ? items : undefined;
  });

  return (
    <>
      <SetTooltipEntrySettings tooltipEntrySettings={tooltipConfig()} />
      <CartesianLabelListContextProvider value={labelContextEntries}>
        <Show when={renderableTrapezoids()}>
          {(items) => (
            <Layer class={layerClass()}>
              <AnimatedItems
                animationInput={items()}
                animationIdPrefix="recharts-funnel-"
                items={items()}
                previousItemsRef={previousTrapezoidsRef}
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
                  <Layer>
                    <For each={frame}>
                      {(entry, i) => {
                        // recharts: the hovered trapezoid resolves the `activeShape`
                        // option, every other one resolves `shape`; both are drawn
                        // through the shared <FunnelTrapezoid>/<Shape> wrapper, which
                        // emits the `recharts-active-shape` (active) / `recharts-shape`
                        // Layer and the default <Trapezoid> when the option is a
                        // boolean/undefined.
                        const isActive = (): boolean =>
                          Boolean(merged.activeShape) && activeItemIndex() === String(i());
                        // v3.9 ShapeAnimationProps forwarded into the custom-shape
                        // invocation, mirroring upstream FunnelTrapezoids. Combine
                        // `< 1` like upstream so the shape sees `isAnimating` through
                        // the whole entrance frame.
                        const shapeAnimationProps = (): ShapeAnimationProps => ({
                          animationElapsedTime,
                          isAnimating: isAnimating() || animationElapsedTime < 1,
                          isEntrance,
                        });
                        return (
                          <Layer
                            class="recharts-funnel-trapezoid"
                            onMouseEnter={onItemEnter(entry, i())}
                            onMouseLeave={onItemLeave(entry, i())}
                            onClick={onItemClick(entry, i())}
                            onMouseDown={
                              props.onMouseDown != null
                                ? (event) => props.onMouseDown?.(entry, i(), event)
                                : undefined
                            }
                            onMouseUp={
                              props.onMouseUp != null
                                ? (event) => props.onMouseUp?.(entry, i(), event)
                                : undefined
                            }
                            onMouseMove={
                              props.onMouseMove != null
                                ? (event) => props.onMouseMove?.(entry, i(), event)
                                : undefined
                            }
                            onMouseOver={
                              props.onMouseOver != null
                                ? (event) => props.onMouseOver?.(entry, i(), event)
                                : undefined
                            }
                            onMouseOut={
                              props.onMouseOut != null
                                ? (event) => props.onMouseOut?.(entry, i(), event)
                                : undefined
                            }
                            onTouchStart={
                              props.onTouchStart != null
                                ? (event) => props.onTouchStart?.(entry, i(), event)
                                : undefined
                            }
                            onTouchMove={
                              props.onTouchMove != null
                                ? (event) => props.onTouchMove?.(entry, i(), event)
                                : undefined
                            }
                            onTouchEnd={
                              props.onTouchEnd != null
                                ? (event) => props.onTouchEnd?.(entry, i(), event)
                                : undefined
                            }
                          >
                            <FunnelTrapezoid
                              {...entry}
                              {...shapeAnimationProps()}
                              isActive={isActive()}
                              option={isActive() ? merged.activeShape : merged.shape}
                            />
                          </Layer>
                        );
                      }}
                    </For>
                  </Layer>
                )}
              </AnimatedItems>
            </Layer>
          )}
        </Show>
        <LabelListFromLabelProp label={merged.label} />
        {props.children}
      </CartesianLabelListContextProvider>
    </>
  );
}
