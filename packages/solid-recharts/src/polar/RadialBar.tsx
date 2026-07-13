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
// Background rendering IS wired: one `.recharts-radial-bar-background-sector` per
// row with a computed background geometry, in a ZIndexLayer (default barBackground
// = -50, overridable via a numeric `zIndex` on the background prop); boolean /
// props-object / function-form backgrounds are all honored.
// zIndex relayering of the MAIN sectors IS wired too: the item content is wrapped
// in <ZIndexLayer> (default DefaultZIndexes.bar = 300), matching recharts.
// Labels ARE wired: a PolarLabelListContext of per-sector polar viewBoxes feeds
// <LabelListFromLabelProp>, so the implicit `label` prop (true / object / function)
// renders the curved recharts-radial-bar-label along each sector arc.
// activeShape IS wired (the active sector renders with activeShape via <Shape>'s
// `option`); the active index comes from the tooltip state (e.g. Tooltip
// defaultIndex), since per-sector hover dispatch is still gated on the deferred
// sector tooltipPosition. The full pointer/touch handler set is forwarded to each
// sector. The function-form custom `shape` render prop IS wired.
// STACKS are wired (the selector feeds this item's d3 stack series; sectors render
// from the truncated [start, end] stack tuple). DEFERRED (documented): animation
// (final frame), element-form shape, per-sector item-hover dispatch (sectors lack
// tooltipPosition).
// Cells ARE wired: a <Cell> child overrides the per-sector fill/stroke/class.
import { createMemo, For, merge, Show, untrack } from "solid-js";
import type { JSX } from "@solidjs/web";
import { useAppSelector, useAppStore } from "../state/hooks";
import { useUniqueId } from "../util/useUniqueId";
import {
  AnimatedItems,
  useAnimationCallbacks,
  type AnimationInterpolateFn,
} from "../animation/AnimatedItems";
import { matchAppend, type AnimationMatchByProp } from "../animation/matchBy";
import type { MutableRef } from "../animation/useAnimationStartSnapshot";
import { usePolarChartLayout } from "../context/chartLayoutContext";
import type { EasingInput } from "../animation/easing";
import { Layer } from "../container/Layer";
import { type CellProps, collectCells } from "../component/Cell";
import {
  type ImplicitLabelListType,
  type PolarLabelListEntry,
  PolarLabelListContextProvider,
  LabelListFromLabelProp,
} from "../component/LabelList";
import {
  useMouseClickItemDispatch,
  useMouseEnterItemDispatch,
  useMouseLeaveItemDispatch,
} from "../context/tooltipContext";
import { SetTooltipEntrySettings } from "../state/SetTooltipEntrySettings";
import type { Formatter } from "../component/DefaultTooltipContent";
import { SetLegendPayload } from "../state/SetLegendPayload";
import { TooltipPayloadConfiguration } from "../state/tooltipSlice";
import { SectorProps } from "../shape/Sector";
import {
  ActiveShape,
  AnimationDuration,
  DataKey,
  LayoutType,
  LegendType,
  PolarLayout,
  PolarViewBoxRequired,
  ShapeAnimationProps,
  TickItem,
  TooltipType,
} from "../util/types";
import { TooltipTriggerInfo } from "../context/tooltipContext";
import { parseCornerRadius, RadialBarSector, RadialBarSectorProps } from "../util/RadialBarUtils";
import { ZIndexLayer, type ZIndexable } from "../zIndex/ZIndexLayer";
import { DefaultZIndexes } from "../zIndex/DefaultZIndexes";
import { getZIndexFromUnknown } from "../zIndex/getZIndexFromUnknown";
import { svgPropertiesNoEventsFromUnknown } from "../util/svgPropertiesNoEvents";
import {
  selectRadialBarLegendPayload,
  selectRadialBarSectors,
} from "../state/selectors/radialBarSelectors";
import {
  selectActiveTooltipDataKey,
  selectActiveTooltipGraphicalItemId,
  selectActiveTooltipIndex,
} from "../state/selectors/tooltipSelectors";
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
import { interpolate, isNumber, mathSign } from "../util/DataUtils";
import type { StackSeries } from "../util/stacks/stackTypes";
import { registerInStore } from "../state/registerInStore";

export type RadialBarDataItem = SectorProps &
  PolarViewBoxRequired &
  TooltipTriggerInfo &
  // v3.9: while animating, each sector carries the animation state so a custom-shape
  // render prop can react to it (forwarded through RadialBarSector → Shape → shape fn).
  ShapeAnimationProps & {
    value?: unknown;
    payload?: unknown;
    background?: SectorProps;
  };

/** Shape/activeShape are what RadialBarUtils consumes; the rest is the component surface. */
export interface RadialBarProps<DataPointType = Record<string, unknown>, DataValueType = unknown> {
  /**
   * If set a function, the function will be called to render a customized shape.
   * During animations, the function shape also receives `animationElapsedTime`,
   * `isAnimating`, and `isEntrance` (v3.9 {@link ShapeAnimationProps}). By default,
   * renders a sector.
   */
  shape?: ActiveShape<RadialBarSectorProps & ShapeAnimationProps, SVGPathElement>;
  activeShape?: ActiveShape<RadialBarSectorProps, SVGPathElement>;
  angleAxisId?: AxisId;
  radiusAxisId?: AxisId;
  dataKey?: DataKey<DataPointType, DataValueType>;
  stackId?: string | number;
  /** A background sector drawn behind each bar (recharts `background` prop):
   * boolean / props-object (optionally carrying a `zIndex`) / function shape. */
  background?: boolean | (SectorProps & ZIndexable);
  /** Per-sector labels (via the polar LabelList). @defaultValue false */
  label?: ImplicitLabelListType;
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
  strokeWidth?: number | string;
  legendType?: LegendType;
  tooltipType?: TooltipType;
  /** Formats this RadialBar's tooltip value; takes precedence over the Tooltip-level `formatter`. */
  formatter?: Formatter;
  hide?: boolean;
  onAnimationStart?: () => void;
  onAnimationEnd?: () => void;
  isAnimationActive?: boolean | "auto";
  animationBegin?: number;
  animationDuration?: AnimationDuration;
  animationEasing?: EasingInput;
  /** Custom per-frame interpolation for the sectors (v3.9). */
  animationInterpolateFn?: AnimationInterpolateFn<RadialBarDataItem, PolarLayout>;
  /** How prev/next sectors are matched across data updates (v3.9). @defaultValue matchAppend */
  animationMatchBy?: AnimationMatchByProp<RadialBarDataItem>;
  /**
   * Z-Index of this component and its children; the higher, the more on top.
   * @defaultValue 300 (DefaultZIndexes.bar)
   */
  zIndex?: number;
  id?: string;
  class?: string;
  /** User pointer handlers, forwarded to each sector's wrapping <Layer>. */
  onMouseEnter?: (data: RadialBarDataItem, index: number, event: MouseEvent) => void;
  onMouseLeave?: (data: RadialBarDataItem, index: number, event: MouseEvent) => void;
  onClick?: (data: RadialBarDataItem, index: number, event: MouseEvent) => void;
  onMouseDown?: (data: RadialBarDataItem, index: number, event: MouseEvent) => void;
  onMouseUp?: (data: RadialBarDataItem, index: number, event: MouseEvent) => void;
  onMouseMove?: (data: RadialBarDataItem, index: number, event: MouseEvent) => void;
  onMouseOver?: (data: RadialBarDataItem, index: number, event: MouseEvent) => void;
  onMouseOut?: (data: RadialBarDataItem, index: number, event: MouseEvent) => void;
  onTouchStart?: (data: RadialBarDataItem, index: number, event: TouchEvent) => void;
  onTouchMove?: (data: RadialBarDataItem, index: number, event: TouchEvent) => void;
  onTouchEnd?: (data: RadialBarDataItem, index: number, event: TouchEvent) => void;
  /** <Cell> children supplying per-sector fill/stroke/class overrides. */
  children?: JSX.Element;
}

// Default per-frame interpolation for RadialBar sectors (the `animationInterpolateFn`
// the new AnimatedItems engine drives). Mirrors recharts 3.9
// `defaultRadialBarAnimateItems`: matched sectors tween startAngle/endAngle between
// prev/next; added sectors sweep endAngle from startAngle to final; removed sectors
// drop immediately. t=1 → final (removed dropped).
const defaultRadialBarAnimateItems: AnimationInterpolateFn<RadialBarDataItem, PolarLayout> = (
  items,
  animationElapsedTime,
) => {
  if (items == null) return [];
  if (animationElapsedTime === 1) {
    return items.flatMap((item) => (item.status === "removed" ? [] : [item.next]));
  }
  return items.flatMap((item): RadialBarDataItem[] => {
    if (item.status === "removed") return [];
    if (item.status === "matched") {
      return [
        {
          ...item.next,
          startAngle: interpolate(item.prev.startAngle, item.next.startAngle, animationElapsedTime),
          endAngle: interpolate(item.prev.endAngle, item.next.endAngle, animationElapsedTime),
        },
      ];
    }
    // added
    return [
      {
        ...item.next,
        endAngle: interpolate(item.next.startAngle, item.next.endAngle, animationElapsedTime),
      },
    ];
  });
};

// Background sectors (recharts' RadialBarWithState.renderBackground): one
// `.recharts-radial-bar-background-sector` per data row that has a computed
// `background` geometry, rendered in a ZIndexLayer (default barBackground = -50,
// overridable via a `zIndex` on the background prop). A function/object-form
// `background` is honored via the sector's `option`.
function RadialBarBackground(props: {
  sectors: ReadonlyArray<RadialBarDataItem>;
  background: boolean | (SectorProps & ZIndexable);
  cornerRadius: string | number | undefined;
}): JSX.Element {
  const backgroundFromProps = (): SectorProps | undefined =>
    typeof props.background === "object" && props.background != null ? props.background : undefined;
  // SVG presentation props from the background prop, minus `class` (composed below).
  const backgroundProps = (): Record<string, unknown> => {
    const all = svgPropertiesNoEventsFromUnknown(props.background) ?? {};
    const { class: _bgClass, ...rest } = all;
    return rest;
  };
  const backgroundClass = (): string | undefined => {
    const all = svgPropertiesNoEventsFromUnknown(props.background);
    return typeof all?.class === "string" ? all.class : undefined;
  };

  // Plain objects of DATA (not JSX) per row that carries a background geometry; the
  // <For> below renders them so the ZIndexLayer Portal subtree stays stable.
  const rows = createMemo<
    ReadonlyArray<RadialBarSectorProps & { option: SectorProps | undefined }>
  >(() =>
    props.sectors.flatMap((entry, i) => {
      const bg = entry.background;
      if (!bg) {
        return [];
      }
      const { value: _value, background: _bg, ...rest } = entry;
      return [
        {
          ...rest,
          fill: "#eee",
          ...bg,
          ...backgroundProps(),
          cornerRadius: parseCornerRadius(props.cornerRadius),
          index: i,
          option: backgroundFromProps(),
          isActive: false,
          class: ["recharts-radial-bar-background-sector", backgroundClass()]
            .filter((c): c is string => typeof c === "string")
            .join(" "),
        },
      ];
    }),
  );

  return (
    <Show when={rows().length > 0}>
      <ZIndexLayer zIndex={getZIndexFromUnknown(props.background, DefaultZIndexes.barBackground)}>
        <Layer>
          <For each={rows()}>{(row) => <RadialBarSector {...row} />}</For>
        </Layer>
      </ZIndexLayer>
    </Show>
  );
}

// recharts calls truncateByDomain with a @ts-expect-error (the domain can be
// categorical and the stack tuple isn't a full SeriesPoint); the port mirrors
// truncateByDomain's clamping inline on the narrowed two-number domain and passes
// the tuple through untouched otherwise (truncateByDomain does the same).
function truncateStackedValue(
  stackedValue: { 0: number; 1: number },
  domain: ReadonlyArray<unknown> | null,
): ReadonlyArray<unknown> {
  const result: [number, number] = [stackedValue[0], stackedValue[1]];
  if (domain == null || domain.length !== 2 || !isNumber(domain[0]) || !isNumber(domain[1])) {
    return result;
  }
  const minValue = Math.min(domain[0], domain[1]);
  const maxValue = Math.max(domain[0], domain[1]);
  if (!isNumber(result[0]) || result[0] < minValue) {
    result[0] = minValue;
  }
  if (!isNumber(result[1]) || result[1] > maxValue) {
    result[1] = maxValue;
  }
  if (result[0] > maxValue) {
    result[0] = maxValue;
  }
  if (result[1] < minValue) {
    result[1] = minValue;
  }
  return result;
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
  stackedData,
  stackedDomain,
  dataStartIndex,
}: {
  displayedData: ChartData;
  /** This item's d3 stack series when it participates in a stackId group. */
  stackedData: StackSeries | undefined;
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
    const stackedValue = stackedData?.[dataStartIndex + index];
    const raw: unknown = getValueByDataKey(entry, dataKey);
    const value: ReadonlyArray<unknown> =
      stackedValue != null
        ? truncateStackedValue(stackedValue, stackedDomain)
        : Array.isArray(raw)
          ? raw
          : [baseValue, raw];

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
      // recharts: a stacked item reports the [start, end] tuple, a plain one the value.
      value: stackedValue != null ? value : value[1],
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
  animationInterpolateFn: defaultRadialBarAnimateItems,
  animationMatchBy: matchAppend,
  legendType: "rect",
  minPointSize: 0,
  label: false,
  zIndex: DefaultZIndexes.bar,
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

  if (store != null) {
    registerInStore<RadialBarSettings>(() => settings(), {
      add: (next) => store.actions.graphicalItems.addPolarGraphicalItem(next),
      replace: (prev, next) =>
        store.actions.graphicalItems.replacePolarGraphicalItem({ prev, next }),
      remove: (prev) => store.actions.graphicalItems.removePolarGraphicalItem(prev),
    });
  }

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
      strokeWidth: merged.strokeWidth,
      fill: merged.fill,
      nameKey: undefined,
      dataKey: merged.dataKey,
      name: getTooltipNameProp(merged.name, merged.dataKey),
      hide: merged.hide,
      type: merged.tooltipType,
      color: merged.fill,
      unit: "",
      formatter: merged.formatter,
    },
  }));

  // One legend entry per data row (recharts' selectRadialBarLegendPayload) —
  // value/color come from each row's `name`/`fill`.
  const legendPayload = useAppSelector((state) =>
    selectRadialBarLegendPayload(state, merged.legendType),
  );

  const polarLayout = usePolarChartLayout();
  // Holds the latest visible sectors frame so a re-animation (data change) tweens
  // from where the sectors currently are. Managed by AnimatedItems via
  // useAnimationStartSnapshot.
  const previousSectorsRef: MutableRef<ReadonlyArray<RadialBarDataItem> | null | undefined> = {
    current: null,
  };
  // Labels are hidden while the sectors animate (recharts' showLabels={!isAnimating}).
  const { isAnimating, handleAnimationStart, handleAnimationEnd } = useAnimationCallbacks(
    () => props.onAnimationStart?.(),
    () => props.onAnimationEnd?.(),
  );

  // User pointer handlers are forwarded to each sector's wrapping <Layer>: the
  // mouse handlers wrap into the tooltip-item dispatch (called props-first), and
  // the touch handlers are plain per-sector callbacks. mouseenter does NOT bubble,
  // so the handler must sit on the same element the pointer enters — here the g.
  // Getter args: the hooks read handler/dataKey at event time (fresh, never stale).
  const onItemEnter = useMouseEnterItemDispatch<RadialBarDataItem>(
    () => props.onMouseEnter,
    () => merged.dataKey,
    id,
  );
  const onItemLeave = useMouseLeaveItemDispatch<RadialBarDataItem>(() => props.onMouseLeave);
  const onItemClick = useMouseClickItemDispatch<RadialBarDataItem>(
    () => props.onClick,
    () => merged.dataKey,
    id,
  );

  // Plain props-first pointer/touch callbacks (no tooltip dispatch — only
  // enter/leave/click drive the active tooltip). Each binds (entry, index).
  const onItemMouse =
    (handler: ((d: RadialBarDataItem, i: number, e: MouseEvent) => void) | undefined) =>
    (entry: RadialBarDataItem, index: number) =>
    (event: MouseEvent): void => {
      handler?.(entry, index, event);
    };
  const onItemMouseDown = onItemMouse(props.onMouseDown);
  const onItemMouseUp = onItemMouse(props.onMouseUp);
  const onItemMouseMove = onItemMouse(props.onMouseMove);
  const onItemMouseOver = onItemMouse(props.onMouseOver);
  const onItemMouseOut = onItemMouse(props.onMouseOut);

  const onItemTouchStart =
    (entry: RadialBarDataItem, index: number) =>
    (event: TouchEvent): void => {
      props.onTouchStart?.(entry, index, event);
    };
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

  // Active-sector tracking drives `activeShape` (the hovered sector renders with
  // the activeShape option instead of the regular shape). Matches Pie's pattern.
  const activeIndex = useAppSelector(selectActiveTooltipIndex);
  const activeDataKey = useAppSelector(selectActiveTooltipDataKey);
  const activeGraphicalItemId = useAppSelector(selectActiveTooltipGraphicalItemId);
  const isSectorActive = (index: number): boolean =>
    String(index) === activeIndex() &&
    (activeDataKey() == null || merged.dataKey === activeDataKey()) &&
    (activeGraphicalItemId() == null || activeGraphicalItemId() === id);
  // recharts: `isActive = Boolean(activeShape && activeIndex === String(i))` — the
  // active-shape wrapper (`.recharts-active-shape`) is gated on `activeShape` being
  // truthy, so a falsy `activeShape={false}` never marks a sector active.
  const isSectorActiveShape = (index: number): boolean =>
    Boolean(merged.activeShape) && isSectorActive(index);
  const sectorOption = (index: number): RadialBarProps["shape"] =>
    isSectorActive(index) && merged.activeShape != null ? merged.activeShape : merged.shape;

  return (
    <>
      <SetTooltipEntrySettings tooltipEntrySettings={tooltipConfig()} />
      <SetLegendPayload id={id} legendPayload={legendPayload() ?? []} />
      <Show when={visibleSectors()}>
        {(secs) => (
          // Wrapped in <ZIndexLayer> (default 300) so a `zIndex` prop relayers the
          // whole radial-bar item into its portal — recharts wraps the entire
          // `.recharts-area` Layer in ZIndexLayer. The background keeps its own
          // nested ZIndexLayer (barBackground = -50), re-portaling below the bars.
          // The stable `.recharts-area` Layer must be the ZIndexLayer's SINGLE DOM
          // child: a Portal whose mount receives multiple dynamic siblings (the
          // background/sectors/labels) directly APPENDS them instead of reconciling
          // (frames accumulate), so — like Pie's `.recharts-pie` — one stable <g>
          // wraps everything (this is also exactly recharts' `.recharts-area` wrap).
          <ZIndexLayer zIndex={merged.zIndex}>
            <Layer class={layerClass()}>
              <PolarLabelListContextProvider
                value={() =>
                  !isAnimating()
                    ? secs().map(
                        (sector): PolarLabelListEntry => ({
                          value: sector.value,
                          payload: sector.payload,
                          parentViewBox: undefined,
                          fill: typeof sector.fill === "string" ? sector.fill : undefined,
                          viewBox: {
                            cx: sector.cx,
                            cy: sector.cy,
                            innerRadius: sector.innerRadius,
                            outerRadius: sector.outerRadius,
                            startAngle: sector.startAngle,
                            endAngle: sector.endAngle,
                            clockWise: false,
                          },
                        }),
                      )
                    : undefined
                }
              >
                <Show when={merged.background}>
                  {(bg) => (
                    <RadialBarBackground
                      sectors={secs()}
                      background={bg()}
                      cornerRadius={merged.cornerRadius}
                    />
                  )}
                </Show>
                {/* Sector enter/update animation via the new v3.9 engine: matched sectors
                tween start/end angle from prev to next, added sectors sweep endAngle
                from startAngle to final. isAnimationActive=false → t=1 → final sectors
                → byte-identical to the static render. polarLayout is read untracked for
                the AnimatedItems layout prop (mirrors Pie): the outer Show already gates
                on visible sectors, so the layout is always defined here. */}
                <AnimatedItems
                  animationInput={secs()}
                  animationIdPrefix="recharts-radialbar-"
                  items={secs()}
                  previousItemsRef={previousSectorsRef}
                  isAnimationActive={merged.isAnimationActive}
                  animationBegin={merged.animationBegin}
                  animationDuration={merged.animationDuration}
                  animationEasing={merged.animationEasing}
                  onAnimationStart={handleAnimationStart}
                  onAnimationEnd={handleAnimationEnd}
                  animationInterpolateFn={merged.animationInterpolateFn}
                  animationMatchBy={merged.animationMatchBy}
                  layout={untrack(() => polarLayout()) ?? "centric"}
                >
                  {(frame, animationElapsedTime, isEntrance) => (
                    <Layer class="recharts-radial-bar-sectors">
                      <For each={frame}>
                        {(entry, i) => (
                          <RadialBarSector
                            {...entry}
                            index={i()}
                            isActive={isSectorActiveShape(i())}
                            option={sectorOption(i())}
                            animationElapsedTime={animationElapsedTime}
                            isAnimating={isAnimating() || animationElapsedTime < 1}
                            isEntrance={isEntrance}
                            class={`recharts-radial-bar-sector ${entry.class ?? ""}`}
                            fill={entry.fill ?? merged.fill}
                            stroke={entry.stroke ?? merged.stroke}
                            strokeWidth={entry.strokeWidth ?? merged.strokeWidth}
                            cornerRadius={cornerRadius()}
                            forceCornerRadius={merged.forceCornerRadius}
                            cornerIsExternal={merged.cornerIsExternal}
                            onMouseEnter={onItemEnter(entry, i())}
                            onMouseLeave={onItemLeave(entry, i())}
                            onClick={onItemClick(entry, i())}
                            onMouseDown={onItemMouseDown(entry, i())}
                            onMouseUp={onItemMouseUp(entry, i())}
                            onMouseMove={onItemMouseMove(entry, i())}
                            onMouseOver={onItemMouseOver(entry, i())}
                            onMouseOut={onItemMouseOut(entry, i())}
                            onTouchStart={onItemTouchStart(entry, i())}
                            onTouchMove={onItemTouchMove(entry, i())}
                            onTouchEnd={onItemTouchEnd(entry, i())}
                          />
                        )}
                      </For>
                    </Layer>
                  )}
                </AnimatedItems>
                <LabelListFromLabelProp label={merged.label} />
              </PolarLabelListContextProvider>
            </Layer>
          </ZIndexLayer>
        )}
      </Show>
    </>
  );
}
