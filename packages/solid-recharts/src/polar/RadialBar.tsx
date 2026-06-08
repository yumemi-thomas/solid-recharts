// Ported from recharts 3.8.1 src/polar/RadialBar.tsx (commit 7a23854).
//
// MINIMAL PORT — registers a RadialBarSettings polar item and renders one sector
// per data point via <RadialBarSector> (Shape→Sector). `computeRadialBarDataItems`
// is the pure sector-geometry function, ported faithfully for both the `radial`
// and `centric` layouts (incl. minPointSize + the background sector field).
//
// Solid deviations: `resolveDefaultProps`→`merge`; effect-dispatch registration
// → `createEffect`/`onCleanup` (addPolarGraphicalItem matched by id); the
// `@ts-expect-error` unknown-data spread → `toRecord` coercion. The layer class is
// `recharts-area` (a recharts quirk, kept for parity).
// Tooltip-entry + legend-payload registration are WIRED (the sectors are the
// per-item tooltip data; legend is a single entry — per-row legend deferred).
// DEFERRED (documented): STACKS (selector passes stackedData=undefined → the
// non-stacked `[baseValue, value]` path), background rendering, animation (final
// frame), label, activeShape/element-form shape, ZIndexLayer, per-sector item-hover
// dispatch (sectors lack tooltipPosition). The function-form custom `shape` render
// prop IS wired (via <Shape>'s `option`, replacing the default Sector).
// Cells ARE wired: a <Cell> child overrides the per-sector fill/stroke/class.
import { createEffect, createMemo, For, merge, onCleanup, Show, untrack } from "solid-js";
import type { JSX } from "@solidjs/web";
import { useAppSelector, useAppStore } from "../state/hooks";
import { useUniqueId } from "../util/useUniqueId";
import { useAnimationId } from "../util/useAnimationId";
import { JavascriptAnimate } from "../animation/JavascriptAnimate";
import type { EasingInput } from "../animation/easing";
import { Layer } from "../container/Layer";
import { type CellProps, collectCells } from "../component/Cell";
import {
  useMouseClickItemDispatch,
  useMouseEnterItemDispatch,
  useMouseLeaveItemDispatch,
} from "../context/tooltipContext";
import { SetTooltipEntrySettings } from "../state/SetTooltipEntrySettings";
import { SetLegendPayload } from "../state/SetLegendPayload";
import { TooltipPayloadConfiguration } from "../state/tooltipSlice";
import { SectorProps } from "../shape/Sector";
import {
  ActiveShape,
  AnimationDuration,
  DataKey,
  LayoutType,
  LegendType,
  PolarViewBoxRequired,
  TickItem,
  TooltipType,
} from "../util/types";
import { TooltipTriggerInfo } from "../context/tooltipContext";
import { RadialBarSector, RadialBarSectorProps } from "../util/RadialBarUtils";
import {
  selectRadialBarLegendPayload,
  selectRadialBarSectors,
} from "../state/selectors/radialBarSelectors";
import { RadialBarSettings } from "../state/types/RadialBarSettings";
import { BaseAxisWithScale } from "../state/selectors/axisSelectors";
import { ChartData } from "../state/chartDataSlice";
import { AxisId } from "../state/cartesianAxisSlice";
import {
  BarPositionPosition,
  getCateCoordinateOfBar,
  getTooltipNameProp,
  getValueByDataKey,
} from "../util/ChartUtils";
import { interpolate, mathSign } from "../util/DataUtils";

export type RadialBarDataItem = SectorProps &
  PolarViewBoxRequired &
  TooltipTriggerInfo & {
    value?: unknown;
    payload?: unknown;
    background?: SectorProps;
  };

/** Shape/activeShape are what RadialBarUtils consumes; the rest is the component surface. */
export interface RadialBarProps<DataPointType = Record<string, unknown>, DataValueType = unknown> {
  shape?: ActiveShape<RadialBarSectorProps, SVGPathElement>;
  activeShape?: ActiveShape<RadialBarSectorProps, SVGPathElement>;
  angleAxisId?: AxisId;
  radiusAxisId?: AxisId;
  dataKey?: DataKey<DataPointType, DataValueType>;
  stackId?: string | number;
  /** A background sector drawn behind each bar (recharts `background` prop). */
  background?: boolean | SectorProps;
  barSize?: number;
  minPointSize?: number;
  maxBarSize?: number;
  cornerRadius?: string | number;
  forceCornerRadius?: boolean;
  cornerIsExternal?: boolean;
  name?: string | number;
  fill?: string;
  fillOpacity?: number | string;
  stroke?: string;
  legendType?: LegendType;
  tooltipType?: TooltipType;
  hide?: boolean;
  isAnimationActive?: boolean | "auto";
  animationBegin?: number;
  animationDuration?: AnimationDuration;
  animationEasing?: EasingInput;
  id?: string;
  class?: string;
  /** User pointer handlers, forwarded to each sector's wrapping <Layer>. */
  onMouseEnter?: (data: RadialBarDataItem, index: number, event: MouseEvent) => void;
  onMouseLeave?: (data: RadialBarDataItem, index: number, event: MouseEvent) => void;
  onClick?: (data: RadialBarDataItem, index: number, event: MouseEvent) => void;
  onTouchMove?: (data: RadialBarDataItem, index: number, event: TouchEvent) => void;
  onTouchEnd?: (data: RadialBarDataItem, index: number, event: TouchEvent) => void;
  /** <Cell> children supplying per-sector fill/stroke/class overrides. */
  children?: JSX.Element;
}

/** Per-frame sector growth: endAngle sweeps from startAngle (or prev) to final; t=1 → final. */
function toAnimatedRadialBarSectors(
  sectors: ReadonlyArray<RadialBarDataItem>,
  prevSectors: ReadonlyArray<RadialBarDataItem> | null,
  t: number,
): ReadonlyArray<RadialBarDataItem> {
  if (t === 1) {
    return sectors;
  }
  return sectors.map((entry, index): RadialBarDataItem => {
    const prev = prevSectors?.[index];
    if (prev) {
      return {
        ...entry,
        startAngle: interpolate(prev.startAngle, entry.startAngle, t),
        endAngle: interpolate(prev.endAngle, entry.endAngle, t),
      };
    }
    return { ...entry, endAngle: interpolate(entry.startAngle, entry.endAngle, t) };
  });
}

export function computeRadialBarDataItems({
  displayedData,
  dataKey,
  baseValue,
  layout,
  radiusAxis,
  radiusAxisTicks,
  bandSize,
  pos,
  angleAxis,
  angleAxisTicks,
  minPointSize,
  cx,
  cy,
  startAngle: rootStartAngle,
  endAngle: rootEndAngle,
  cells,
}: {
  displayedData: ChartData;
  // Stacks are deferred — always undefined here (non-stacked path).
  stackedData: undefined;
  dataStartIndex: number;
  stackedDomain: ReadonlyArray<unknown> | null;
  /** Per-sector <Cell> presentation props, indexed by data position. */
  cells?: ReadonlyArray<CellProps> | undefined;
  dataKey: DataKey<unknown> | undefined;
  // recharts types this `number | unknown` (== `unknown`); the base value can be a
  // number or a categorical value depending on the axis.
  baseValue: unknown;
  layout: LayoutType;
  radiusAxis: BaseAxisWithScale;
  radiusAxisTicks: ReadonlyArray<TickItem> | undefined;
  bandSize: number;
  pos: BarPositionPosition;
  angleAxis: BaseAxisWithScale;
  minPointSize: number;
  cx: number;
  cy: number;
  angleAxisTicks: ReadonlyArray<TickItem> | undefined;
  startAngle: number;
  endAngle: number;
}): ReadonlyArray<RadialBarDataItem> {
  if (angleAxisTicks == null || radiusAxisTicks == null) {
    return [];
  }
  const angleTicks = angleAxisTicks;
  const radiusTicks = radiusAxisTicks;

  return displayedData.map((entry: unknown, index: number): RadialBarDataItem => {
    const raw: unknown = getValueByDataKey(entry, dataKey);
    const value: unknown[] = Array.isArray(raw) ? raw : [baseValue, raw];

    let innerRadius: number | undefined;
    let outerRadius: number | undefined;
    let startAngle: number | undefined;
    let endAngle: number | undefined;
    let background: SectorProps | undefined;

    if (layout === "radial") {
      startAngle = angleAxis.scale.map(value[0]) ?? rootStartAngle;
      endAngle = angleAxis.scale.map(value[1]) ?? rootEndAngle;
      innerRadius =
        getCateCoordinateOfBar({
          axis: radiusAxis,
          ticks: radiusTicks,
          bandSize,
          offset: pos.offset,
          entry,
          index,
        }) ?? undefined;
      if (innerRadius != null && endAngle != null && startAngle != null) {
        outerRadius = innerRadius + pos.size;
        const deltaAngle = endAngle - startAngle;
        if (Math.abs(minPointSize) > 0 && Math.abs(deltaAngle) < Math.abs(minPointSize)) {
          const delta =
            mathSign(deltaAngle || minPointSize) * (Math.abs(minPointSize) - Math.abs(deltaAngle));
          endAngle += delta;
        }
        background = {
          cx,
          cy,
          innerRadius,
          outerRadius,
          startAngle: rootStartAngle,
          endAngle: rootEndAngle,
        };
      }
    } else {
      innerRadius = radiusAxis.scale.map(value[0]);
      outerRadius = radiusAxis.scale.map(value[1]);
      startAngle =
        getCateCoordinateOfBar({
          axis: angleAxis,
          ticks: angleTicks,
          bandSize,
          offset: pos.offset,
          entry,
          index,
        }) ?? undefined;
      if (innerRadius != null && outerRadius != null && startAngle != null) {
        endAngle = startAngle + pos.size;
        const deltaRadius = outerRadius - innerRadius;
        if (Math.abs(minPointSize) > 0 && Math.abs(deltaRadius) < Math.abs(minPointSize)) {
          const delta =
            mathSign(deltaRadius || minPointSize) *
            (Math.abs(minPointSize) - Math.abs(deltaRadius));
          outerRadius += delta;
        }
      }
    }

    // DEVIATION: recharts spreads `...entry` (the raw data row) into the item to
    // carry arbitrary per-row props (e.g. data.fill) behind a @ts-expect-error.
    // The minimal port drops that raw-data spread, but DOES honor <Cell> children:
    // a cell's fill/stroke/class override the component props (per-row data
    // presentation is still deferred). RadialBarDataItem requires numbers
    // (PolarViewBoxRequired); recharts leaves these possibly-undefined and relies
    // on Sector's `?? 0`, so coercing here is behavior-equivalent.
    const cell = cells?.[index];
    const cellClass = typeof cell?.class === "string" ? cell.class : undefined;
    const rowFields =
      typeof entry === "object" && entry != null && !Array.isArray(entry) ? entry : {};
    return {
      ...rowFields,
      ...(background != null ? { background } : {}),
      ...(cell != null ? { fill: cell.fill, stroke: cell.stroke, class: cellClass } : {}),
      payload: entry,
      value: value[1],
      cx,
      cy,
      innerRadius: innerRadius ?? 0,
      outerRadius: outerRadius ?? 0,
      startAngle: startAngle ?? 0,
      endAngle: endAngle ?? 0,
      // Required by PolarViewBoxRequired; recharts gets it via the `any` data
      // spread. Sector ignores it (path uses start/end angles), so false is inert.
      clockWise: false,
    };
  });
}

export const radialBarDefaultProps = {
  angleAxisId: 0,
  radiusAxisId: 0,
  cornerRadius: 0,
  cornerIsExternal: false,
  forceCornerRadius: false,
  hide: false,
  isAnimationActive: "auto",
  animationBegin: 0,
  animationDuration: 1500,
  animationEasing: "ease",
  legendType: "rect",
  minPointSize: 0,
} as const satisfies Partial<RadialBarProps>;

export function RadialBar<DataPointType = Record<string, unknown>, DataValueType = unknown>(
  props: RadialBarProps<DataPointType, DataValueType>,
): JSX.Element {
  const store = useAppStore();
  const merged = merge(radialBarDefaultProps, props);
  const id = useUniqueId("recharts-radial-bar", props.id);

  const settings = (): RadialBarSettings => ({
    id,
    type: "radialBar",
    data: undefined,
    dataKey: merged.dataKey,
    hide: merged.hide,
    angleAxisId: merged.angleAxisId,
    radiusAxisId: merged.radiusAxisId,
    stackId: merged.stackId == null ? undefined : String(merged.stackId),
    barSize: merged.barSize,
    minPointSize: merged.minPointSize,
    maxBarSize: merged.maxBarSize,
  });

  let prev: RadialBarSettings | null = null;

  createEffect(
    (): RadialBarSettings => settings(),
    (s) => {
      if (store == null) {
        return;
      }
      if (prev === null) {
        store.actions.graphicalItems.addPolarGraphicalItem(s);
      } else if (prev !== s) {
        store.actions.graphicalItems.replacePolarGraphicalItem({ prev, next: s });
      }
      prev = s;
    },
  );

  onCleanup(() => {
    if (prev && store != null) {
      store.actions.graphicalItems.removePolarGraphicalItem(prev);
      prev = null;
    }
  });

  // Per-sector <Cell> overrides (collected from children, in data order).
  const cells = collectCells(() => props.children);
  const sectors = useAppSelector((state) =>
    selectRadialBarSectors(state, merged.radiusAxisId, merged.angleAxisId, settings(), cells()),
  );

  const visibleSectors = (): ReadonlyArray<RadialBarDataItem> | null => {
    const s = sectors();
    return !merged.hide && s != null && s.length > 0 ? s : null;
  };

  const cornerRadius = (): number | undefined =>
    typeof merged.cornerRadius === "string"
      ? parseInt(merged.cornerRadius, 10)
      : merged.cornerRadius;

  // recharts uses "recharts-area" as the radial-bar layer class (a quirk).
  const layerClass = (): string =>
    ["recharts-area", merged.class].filter((c): c is string => Boolean(c)).join(" ");

  // Tooltip entry: the sectors themselves are the per-item data (the searcher
  // resolves the value via dataKey). NOTE: the minimal port drops the raw-data
  // spread, so per-sector value resolution by dataKey is limited until that lands.
  const tooltipConfig = createMemo<TooltipPayloadConfiguration>(() => ({
    dataDefinedOnItem: sectors(),
    getPosition: () => undefined,
    settings: {
      graphicalItemId: id,
      stroke: merged.stroke,
      fill: merged.fill,
      nameKey: undefined,
      dataKey: merged.dataKey,
      name: getTooltipNameProp(merged.name, merged.dataKey),
      hide: merged.hide,
      type: merged.tooltipType,
      color: merged.fill,
      unit: "",
    },
  }));

  // One legend entry per data row (recharts' selectRadialBarLegendPayload) —
  // value/color come from each row's `name`/`fill`.
  const legendPayload = useAppSelector((state) =>
    selectRadialBarLegendPayload(state, merged.legendType),
  );

  // Enter animation: each sector's endAngle sweeps from its startAngle to the
  // final. Keyed <Show> restarts on a new id; isAnimationActive=false → t=1 →
  // final sectors → byte-identical to the static render.
  const animationId = useAnimationId(() => sectors(), "recharts-radialbar-");
  let prevSectors: ReadonlyArray<RadialBarDataItem> | null = null;

  // User pointer handlers are forwarded to each sector's wrapping <Layer>: the
  // mouse handlers wrap into the tooltip-item dispatch (called props-first), and
  // the touch handlers are plain per-sector callbacks. mouseenter does NOT bubble,
  // so the handler must sit on the same element the pointer enters — here the g.
  const onItemEnter = useMouseEnterItemDispatch(
    (data: RadialBarDataItem, index: number, event: MouseEvent) =>
      props.onMouseEnter?.(data, index, event),
    merged.dataKey,
    id,
  );
  const onItemLeave = useMouseLeaveItemDispatch(
    (data: RadialBarDataItem, index: number, event: MouseEvent) =>
      props.onMouseLeave?.(data, index, event),
  );
  const onItemClick = useMouseClickItemDispatch(
    (data: RadialBarDataItem, index: number, event: MouseEvent) =>
      props.onClick?.(data, index, event),
    merged.dataKey,
    id,
  );

  const onItemTouchMove =
    (entry: RadialBarDataItem, index: number) =>
    (event: TouchEvent): void => {
      props.onTouchMove?.(entry, index, event);
    };
  const onItemTouchEnd =
    (entry: RadialBarDataItem, index: number) =>
    (event: TouchEvent): void => {
      props.onTouchEnd?.(entry, index, event);
    };

  return (
    <>
      <SetTooltipEntrySettings tooltipEntrySettings={tooltipConfig()} />
      <SetLegendPayload id={id} legendPayload={legendPayload() ?? []} />
      <Show when={visibleSectors()}>
        {(secs) => (
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
                  const frame = toAnimatedRadialBarSectors(untrack(secs), prevSectors, t);
                  prevSectors = frame;
                  return (
                    <Layer class={layerClass()}>
                      <Layer class="recharts-radial-bar-sectors">
                        <For each={frame}>
                          {(entry, i) => (
                            <RadialBarSector
                              {...entry}
                              index={i()}
                              isActive={false}
                              option={merged.shape}
                              class={`recharts-radial-bar-sector ${entry.class ?? ""}`}
                              fill={entry.fill ?? merged.fill}
                              stroke={entry.stroke ?? merged.stroke}
                              cornerRadius={cornerRadius()}
                              forceCornerRadius={merged.forceCornerRadius}
                              cornerIsExternal={merged.cornerIsExternal}
                              onMouseEnter={onItemEnter(entry, i())}
                              onMouseLeave={onItemLeave(entry, i())}
                              onClick={onItemClick(entry, i())}
                              onTouchMove={onItemTouchMove(entry, i())}
                              onTouchEnd={onItemTouchEnd(entry, i())}
                            />
                          )}
                        </For>
                      </Layer>
                    </Layer>
                  );
                }}
              </JavascriptAnimate>
            )}
          </Show>
        )}
      </Show>
    </>
  );
}
