// Ported from recharts 3.8.1 src/cartesian/Bar.tsx (commit 7a23854).
//
// MINIMAL PORT — a second graphical item, reusing the axis spine + the band scale.
// Deferred (documented): range bars (scalar values only), element-form shape,
// ErrorBar.
// activeBar CSS transition + ZIndexLayer: vendor/recharts-reference/src/cartesian/Bar.tsx L573–671.
// (Stacks, animation, labels,
// tooltip/legend, Cells — per-bar fill/stroke/class via <Cell> children — and the
// function-form custom `shape` render prop are wired.)
// Solid deviations: `resolveDefaultProps`→`merge`; RegisterGraphicalItemId +
// Set* effect-dispatch components → a `createEffect` add/replace + `onCleanup`
// remove (the same idiom as <Line>).
import {
  createEffect,
  createMemo,
  createSignal,
  For,
  merge,
  onCleanup,
  Show,
  untrack,
} from "solid-js";
import type { JSX } from "@solidjs/web";
import { noop } from "../util/DataUtils";
import { useAppSelector, useAppStore } from "../state/hooks";
import { useAnimationId } from "../util/useAnimationId";
import { JavascriptAnimate } from "../animation/JavascriptAnimate";
import type { EasingInput } from "../animation/easing";
import { useCartesianChartLayout } from "../context/chartLayoutContext";
import { RegisterGraphicalItemId } from "../context/RegisterGraphicalItemId";
import { SetErrorBarContext } from "../context/ErrorBarContext";
import type { ErrorBarDataItem, ErrorBarDataPointFormatter } from "./ErrorBar";
import { SetTooltipEntrySettings } from "../state/SetTooltipEntrySettings";
import { TooltipPayloadConfiguration } from "../state/tooltipSlice";
import { SetLegendPayload } from "../state/SetLegendPayload";
import { LegendPayload } from "../component/DefaultLegendContent";
import {
  useMouseClickItemDispatch,
  useMouseEnterItemDispatch,
  useMouseLeaveItemDispatch,
} from "../context/tooltipContext";
import { useIsPanorama } from "../context/PanoramaContext";
import { useUniqueId } from "../util/useUniqueId";
import { Layer } from "../container/Layer";
import { GraphicalItemClipPath, useNeedsClip } from "./GraphicalItemClipPath";
import { type CellProps, collectCells } from "../component/Cell";
import {
  type CartesianLabelListEntry,
  CartesianLabelListContextProvider,
  type ImplicitLabelListType,
  LabelListFromLabelProp,
} from "../component/LabelList";
import { selectBarRectangles } from "../state/selectors/barSelectors";
import { BarSettings } from "../state/types/BarSettings";
import { AxisId } from "../state/cartesianAxisSlice";
import { ChartData } from "../state/chartDataSlice";
import {
  AnimationDuration,
  CartesianLayout,
  CartesianViewBoxRequired,
  Coordinate,
  DataKey,
  LegendType,
  TickItem,
  TooltipType,
  TrapezoidViewBox,
} from "../util/types";
import {
  getBaseValueOfBar,
  getCateCoordinateOfBar,
  getTooltipNameProp,
  getValueByDataKey,
  truncateByDomain,
} from "../util/ChartUtils";
import type { StackSeries } from "../util/stacks/stackTypes";
import { interpolate, isNan, isNotNil, mathSign } from "../util/DataUtils";
import {
  BarRectangle,
  defaultBarShape,
  MinPointSize,
  minPointSizeCallback,
  type BarRectangleProps,
} from "../util/BarUtils";
import { ActiveShape, ChartOffsetInternal } from "../util/types";
import { DefaultZIndexes } from "../zIndex/DefaultZIndexes";
import { getZIndexFromUnknown } from "../zIndex/getZIndexFromUnknown";
import { ZIndexLayer, type ZIndexable } from "../zIndex/ZIndexLayer";
import { svgPropertiesAndEventsFromUnknown } from "../util/svgPropertiesAndEvents";
import { svgPropertiesNoEventsFromUnknown } from "../util/svgPropertiesNoEvents";
import {
  selectActiveTooltipDataKey,
  selectActiveTooltipIndex,
} from "../state/selectors/tooltipSelectors";
import { BaseAxisWithScale } from "../state/selectors/axisSelectors";
import { StackId } from "../util/ChartUtils";
import { BarStackClipLayer, useStackId } from "./BarStack";

const defaultMinPointSize = 0;

type BarRectangleType = {
  x: number;
  y: number;
  width: number;
  height: number;
};

function spreadableDataEntry(entry: unknown): Record<string, unknown> {
  if (entry != null && typeof entry === "object" && !Array.isArray(entry)) {
    return { ...entry };
  }
  return {};
}

export interface BarRectangleItem {
  x: number;
  y: number;
  width: number;
  height: number;
  /** Full-span background rectangle geometry (plot area along the value axis). */
  background?: BarRectangleType;
  /** The bar's value (data-derived; recharts types it `number | [number, number]`). */
  value: unknown;
  payload?: unknown;
  tooltipPosition: Coordinate;
  parentViewBox: CartesianViewBoxRequired;
  stackedBarStart: number | undefined;
  /** Stable pre-filter index within the displayed data slice. */
  originalDataIndex: number;
  /** Per-bar presentation overrides from a matching <Cell> child (if any). */
  cell?: CellProps | undefined;
  /** From <Cell> children or data row spread (recharts merges cell.props onto the item). */
  fill?: string;
  stroke?: string;
  class?: string;
  /** Extra fields from the data row (`...entry` spread in recharts). */
  label?: string;
}

export type BarShapeProps = BarRectangleItem & {
  isActive: boolean;
  index: number;
  /** Fired when the bar's CSS enter/exit transition ends (set during animation). */
  onTransitionEnd?: () => void;
};

type BarPointerEvent = MouseEvent | TouchEvent;

export type BarMouseEvent = (data: BarRectangleItem, index: number, event: BarPointerEvent) => void;

export function computeBarRectangles({
  layout,
  barSettings,
  pos,
  offset,
  bandSize,
  xAxis,
  yAxis,
  xAxisTicks,
  yAxisTicks,
  displayedData,
  parentViewBox,
  stackedData,
  stackedDomain,
  cells,
  dataStartIndex = 0,
}: {
  layout: CartesianLayout;
  barSettings: BarSettings;
  pos: { offset: number; size: number };
  offset: ChartOffsetInternal;
  bandSize: number;
  xAxis: BaseAxisWithScale;
  yAxis: BaseAxisWithScale;
  xAxisTicks: TickItem[];
  yAxisTicks: TickItem[];
  displayedData: ChartData;
  parentViewBox: CartesianViewBoxRequired;
  /** Stacked series for this bar (undefined → unstacked [base, value]). */
  stackedData?: StackSeries | undefined;
  stackedDomain?: ReadonlyArray<number> | null;
  /** Per-bar <Cell> presentation props, indexed by displayed-data position. */
  cells?: ReadonlyArray<CellProps> | undefined;
  dataStartIndex?: number;
}): ReadonlyArray<BarRectangleItem> | undefined {
  const { dataKey, minPointSize: minPointSizeProp, hasCustomShape } = barSettings;
  const numericAxis = layout === "horizontal" ? yAxis : xAxis;
  const baseValue = getBaseValueOfBar({ numericAxis });
  const stackedBarStart = numericAxis.scale.map(baseValue);
  const getMinPointSize = minPointSizeCallback(minPointSizeProp, defaultMinPointSize);

  return displayedData
    .map((entry, index): BarRectangleItem | null => {
      // Stacked → [start, end] from the stacked data; unstacked → [base, value].
      let value: [unknown, unknown];
      if (stackedData) {
        const untruncated = stackedData[index + dataStartIndex];
        const truncated =
          untruncated != null && stackedDomain != null
            ? truncateByDomain(untruncated, stackedDomain)
            : untruncated;
        value = Array.isArray(truncated) ? [truncated[0], truncated[1]] : [baseValue, undefined];
      } else {
        const resolvedValue = getValueByDataKey(entry, dataKey);
        if (Array.isArray(resolvedValue)) {
          value = [resolvedValue[0], resolvedValue[1]];
        } else {
          value = [baseValue, resolvedValue];
        }
      }
      const minPointSize = getMinPointSize(value[1], index);

      let x: number | null;
      let y: number | null | undefined;
      let width: number;
      let height: number;
      let background: BarRectangleType;

      if (layout === "horizontal") {
        const baseValueScale = yAxis.scale.map(value[0]);
        const currentValueScale = yAxis.scale.map(value[1]);
        if (baseValueScale == null || currentValueScale == null) {
          return null;
        }
        x = getCateCoordinateOfBar({
          axis: xAxis,
          ticks: xAxisTicks,
          bandSize,
          offset: pos.offset,
          entry,
          index,
        });
        y = currentValueScale ?? baseValueScale ?? undefined;
        width = pos.size;
        const computedHeight = baseValueScale - currentValueScale;
        height = isNan(computedHeight) ? 0 : computedHeight;

        if (Math.abs(minPointSize) > 0 && Math.abs(height) < Math.abs(minPointSize)) {
          const delta =
            mathSign(height || minPointSize) * (Math.abs(minPointSize) - Math.abs(height));
          y -= delta;
          height += delta;
        }
      } else {
        const baseValueScale = xAxis.scale.map(value[0]);
        const currentValueScale = xAxis.scale.map(value[1]);
        if (baseValueScale == null || currentValueScale == null) {
          return null;
        }
        x = baseValueScale;
        const yCoord = getCateCoordinateOfBar({
          axis: yAxis,
          ticks: yAxisTicks,
          bandSize,
          offset: pos.offset,
          entry,
          index,
        });
        if (yCoord == null) {
          return null;
        }
        y = yCoord;
        width = currentValueScale - baseValueScale;
        height = pos.size;

        if (Math.abs(minPointSize) > 0 && Math.abs(width) < Math.abs(minPointSize)) {
          const delta =
            mathSign(width || minPointSize) * (Math.abs(minPointSize) - Math.abs(width));
          width += delta;
        }
      }

      if (
        x == null ||
        y == null ||
        width == null ||
        height == null ||
        (!hasCustomShape && (width === 0 || height === 0))
      ) {
        return null;
      }

      if (layout === "horizontal") {
        background = { x, y: offset.top, width, height: offset.height };
      } else {
        background = { x: offset.left, y, width: offset.width, height };
      }

      const labelValue = getValueByDataKey(entry, "label");
      const label = typeof labelValue === "string" ? labelValue : undefined;
      const cell = cells?.[index];
      const cellClass = typeof cell?.class === "string" ? cell.class : undefined;

      return {
        ...spreadableDataEntry(entry),
        x,
        y,
        width,
        height,
        value: stackedData ? value : value[1],
        payload: entry,
        ...(label != null ? { label } : {}),
        ...(cell?.fill != null ? { fill: cell.fill } : {}),
        ...(cell?.stroke != null ? { stroke: cell.stroke } : {}),
        ...(cellClass != null ? { class: cellClass } : {}),
        background,
        tooltipPosition: { x: x + width / 2, y: y + height / 2 },
        parentViewBox,
        stackedBarStart: stackedBarStart ?? undefined,
        originalDataIndex: index,
        ...(cell != null ? { cell } : {}),
      };
    })
    .filter(isNotNil);
}

/** Per-frame bar growth from the baseline (horizontal → height; vertical → width); t=1 → final. */
function toAnimatedBarRectangles(
  rects: ReadonlyArray<BarRectangleItem>,
  prev: ReadonlyArray<BarRectangleItem> | null,
  t: number,
  layout: CartesianLayout | undefined,
): ReadonlyArray<BarRectangleItem> {
  if (t === 1) {
    return rects;
  }
  return rects.map((entry, index): BarRectangleItem => {
    const p = prev?.[index];
    if (p) {
      return {
        ...entry,
        x: interpolate(p.x, entry.x, t),
        y: interpolate(p.y, entry.y, t),
        width: interpolate(p.width, entry.width, t),
        height: interpolate(p.height, entry.height, t),
      };
    }
    if (layout === "horizontal") {
      return {
        ...entry,
        y: interpolate(entry.stackedBarStart, entry.y, t),
        height: interpolate(0, entry.height, t),
      };
    }
    return {
      ...entry,
      x: interpolate(entry.stackedBarStart, entry.x, t),
      width: interpolate(0, entry.width, t),
    };
  });
}

function BarBackground(props: {
  background?: ActiveShape<BarShapeProps, SVGPathElement> | undefined;
  data: ReadonlyArray<BarRectangleItem>;
  dataKey: DataKey<unknown> | undefined;
  graphicalItemId: string;
  onClick?: BarMouseEvent;
  onMouseEnter?: BarMouseEvent;
  onMouseLeave?: BarMouseEvent;
  onMouseOver?: BarMouseEvent;
  onMouseOut?: BarMouseEvent;
  onTouchMove?: BarMouseEvent;
  onTouchEnd?: BarMouseEvent;
}): JSX.Element {
  const activeIndex = useAppSelector(selectActiveTooltipIndex);
  const onMouseEnter = useMouseEnterItemDispatch(
    props.onMouseEnter,
    props.dataKey,
    props.graphicalItemId,
  );
  const onMouseLeave = useMouseLeaveItemDispatch(props.onMouseLeave);
  const onClick = useMouseClickItemDispatch(props.onClick, props.dataKey, props.graphicalItemId);

  const backgroundLayer = createMemo(() => {
    const backgroundFromProps = props.background;
    if (!backgroundFromProps) {
      return null;
    }
    const active = activeIndex();
    const dataKey = props.dataKey;
    const backgroundProps = svgPropertiesNoEventsFromUnknown(backgroundFromProps);
    const backgroundEventProps = svgPropertiesAndEventsFromUnknown({
      onMouseOver: props.onMouseOver,
      onMouseOut: props.onMouseOut,
      onTouchMove: props.onTouchMove,
      onTouchEnd: props.onTouchEnd,
    });

    const rectangles = props.data.flatMap((entry, i) => {
      const bg = entry.background;
      if (bg == null) {
        return [];
      }
      const { value: _value, background: _bg, tooltipPosition: _tp, ...rest } = entry;
      const barRectangleProps: BarRectangleProps = {
        option: backgroundFromProps,
        isActive: String(entry.originalDataIndex) === active,
        ...rest,
        fill: "#eee",
        ...bg,
        ...(backgroundProps ?? {}),
        ...(backgroundEventProps ?? {}),
        onMouseEnter: onMouseEnter(entry, entry.originalDataIndex),
        onMouseLeave: onMouseLeave(entry, entry.originalDataIndex),
        onClick: onClick(entry, entry.originalDataIndex),
        dataKey,
        index: i,
        class: "recharts-bar-background-rectangle",
      };
      return [<BarRectangle {...barRectangleProps} />];
    });

    return (
      <ZIndexLayer
        zIndex={getZIndexFromUnknown(backgroundFromProps, DefaultZIndexes.barBackground)}
      >
        <Layer>{rectangles}</Layer>
      </ZIndexLayer>
    );
  });

  return <>{backgroundLayer()}</>;
}

function barEntryShapeProps(
  entry: BarRectangleItem,
  displayIndex: number,
  dataKey: DataKey<unknown> | undefined,
  fill: string,
  stroke: string | undefined,
  cellClass: string | undefined,
): Omit<BarRectangleProps, "option" | "isActive"> {
  const { background: _bg, value: _v, tooltipPosition: _tp, ...rest } = entry;
  return {
    ...rest,
    fill,
    stroke,
    dataKey,
    index: displayIndex,
    class: cellClass,
  };
}

function BarRectangleNeverActive(props: {
  shape: ActiveShape<BarShapeProps, SVGPathElement>;
  entry: BarRectangleItem;
  displayIndex: number;
  dataKey: DataKey<unknown> | undefined;
  fill: string;
  stroke?: string;
  cellClass?: string;
}): JSX.Element {
  return (
    <BarRectangle
      {...barEntryShapeProps(
        props.entry,
        props.displayIndex,
        props.dataKey,
        props.fill,
        props.stroke,
        props.cellClass,
      )}
      option={props.shape}
      isActive={false}
    />
  );
}

function BarRectangleWithActiveState(props: {
  shape: ActiveShape<BarShapeProps, SVGPathElement>;
  activeBar: Exclude<BarProps["activeBar"], false | undefined>;
  entry: BarRectangleItem;
  displayIndex: number;
  dataKey: DataKey<unknown> | undefined;
  fill: string;
  stroke?: string;
  cellClass?: string;
  isEntryActive: (entry: BarRectangleItem, dataKey: DataKey<unknown> | undefined) => boolean;
}): JSX.Element {
  const isActive = (): boolean => props.isEntryActive(props.entry, props.dataKey);

  const [stayInLayer, setStayInLayer] = createSignal(false);
  const [hasMountedActive, setHasMountedActive] = createSignal(false);

  createEffect(
    () => isActive(),
    (active) => {
      let rafId: number | undefined;
      if (active) {
        setStayInLayer(true);
        rafId = requestAnimationFrame(() => {
          setHasMountedActive(true);
        });
      } else {
        setHasMountedActive(false);
      }
      return () => {
        if (rafId != null) {
          cancelAnimationFrame(rafId);
        }
      };
    },
  );

  const isVisuallyActive = (): boolean => isActive() && hasMountedActive();
  const shouldRenderInLayer = (): boolean => isActive() || stayInLayer();

  const handleTransitionEnd = (): void => {
    if (!isActive()) {
      setStayInLayer(false);
    }
  };

  const renderRectangle = (): JSX.Element => {
    const active = isActive();
    let option: ActiveShape<BarShapeProps, SVGPathElement>;
    if (active) {
      option = props.activeBar === true ? props.shape : props.activeBar;
    } else {
      option = props.shape;
    }
    return (
      <BarRectangle
        {...barEntryShapeProps(
          props.entry,
          props.displayIndex,
          props.dataKey,
          props.fill,
          props.stroke,
          props.cellClass,
        )}
        option={option}
        isActive={isVisuallyActive()}
        onTransitionEnd={handleTransitionEnd}
      />
    );
  };

  return (
    <>
      <Show when={shouldRenderInLayer()}>
        <ZIndexLayer zIndex={DefaultZIndexes.activeBar}>
          <BarStackClipLayer index={props.entry.originalDataIndex}>
            {renderRectangle()}
          </BarStackClipLayer>
        </ZIndexLayer>
      </Show>
      <Show when={!shouldRenderInLayer()}>{renderRectangle()}</Show>
    </>
  );
}

function BarRectangleLayer(props: {
  entry: BarRectangleItem;
  displayIndex: number;
  dataKey: DataKey<unknown> | undefined;
  shape: ActiveShape<BarShapeProps, SVGPathElement>;
  activeBar: BarProps["activeBar"];
  fill: string;
  stroke?: string;
  cellClass?: string;
  isEntryActive: (entry: BarRectangleItem, dataKey: DataKey<unknown> | undefined) => boolean;
  onMouseEnter: (event: MouseEvent) => void;
  onMouseLeave: (event: MouseEvent) => void;
  onClick: (event: MouseEvent) => void;
  onMouseOver?: (event: MouseEvent) => void;
  onMouseOut?: (event: MouseEvent) => void;
  onTouchMove?: (event: TouchEvent) => void;
  onTouchEnd?: (event: TouchEvent) => void;
}): JSX.Element {
  return (
    <BarStackClipLayer
      index={props.entry.originalDataIndex}
      class="recharts-bar-rectangle"
      onMouseEnter={props.onMouseEnter}
      onMouseLeave={props.onMouseLeave}
      onClick={props.onClick}
      onMouseOver={props.onMouseOver}
      onMouseOut={props.onMouseOut}
      onTouchMove={props.onTouchMove}
      onTouchEnd={props.onTouchEnd}
    >
      {props.activeBar ? (
        <BarRectangleWithActiveState
          shape={props.shape}
          activeBar={props.activeBar}
          entry={props.entry}
          displayIndex={props.displayIndex}
          dataKey={props.dataKey}
          fill={props.fill}
          stroke={props.stroke}
          cellClass={props.cellClass}
          isEntryActive={props.isEntryActive}
        />
      ) : (
        <BarRectangleNeverActive
          shape={props.shape}
          entry={props.entry}
          displayIndex={props.displayIndex}
          dataKey={props.dataKey}
          fill={props.fill}
          stroke={props.stroke}
          cellClass={props.cellClass}
        />
      )}
    </BarStackClipLayer>
  );
}

export interface BarProps extends ZIndexable {
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
  fill?: string;
  fillOpacity?: number | string;
  opacity?: number | string;
  cursor?: string;
  stroke?: string;
  strokeWidth?: number;
  hide?: boolean;
  stackId?: StackId;
  barSize?: number;
  maxBarSize?: number;
  minPointSize?: MinPointSize;
  /** Per-bar labels (via LabelList). @defaultValue false */
  label?: ImplicitLabelListType;
  /**
   * Renders a full-span background per bar (`true`, props object, or render function).
   * @defaultValue false
   */
  background?: ActiveShape<BarShapeProps, SVGPathElement> & { zIndex?: number };
  /** Custom bar shape. @defaultValue Rectangle */
  shape?: ActiveShape<BarShapeProps, SVGPathElement>;
  /** Highlight the active bar (boolean uses default shape). @defaultValue false */
  activeBar?: ActiveShape<BarShapeProps, SVGPathElement> | boolean;
  onAnimationStart?: () => void;
  onAnimationEnd?: () => void;
  isAnimationActive?: boolean | "auto";
  animationBegin?: number;
  animationDuration?: AnimationDuration;
  animationEasing?: EasingInput;
  id?: string;
  class?: string;
  /** Legend icon type. @defaultValue 'rect' */
  legendType?: LegendType;
  onClick?: BarMouseEvent;
  onMouseEnter?: BarMouseEvent;
  onMouseLeave?: BarMouseEvent;
  onMouseOver?: BarMouseEvent;
  onMouseOut?: BarMouseEvent;
  onTouchMove?: BarMouseEvent;
  onTouchEnd?: BarMouseEvent;
  /** <Cell> children supplying per-bar fill/stroke/class overrides. */
  children?: JSX.Element;
}

export const barDefaultProps = {
  fill: "#3182bd",
  shape: defaultBarShape,
  background: false,
  hide: false,
  isAnimationActive: "auto",
  animationBegin: 0,
  animationDuration: 400,
  animationEasing: "ease",
  minPointSize: defaultMinPointSize,
  legendType: "rect",
  activeBar: false,
  zIndex: DefaultZIndexes.bar,
  xAxisId: 0,
  yAxisId: 0,
} as const;

// Coerces an error value (read via dataKey) to the number / [low, high] shape an
// ErrorBar needs; anything else yields undefined (no whisker). Mirrors Line.
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

// Maps a BarRectangleItem (erased to `unknown` through the ErrorBar context) to the
// {x, y, value, errorVal} an ErrorBar draws from. Stacked bars carry a [start, end]
// value array → use the end value (recharts' errorBarDataPointFormatter).
const barErrorBarFormatter: ErrorBarDataPointFormatter = (entry, dataKey): ErrorBarDataItem => {
  const x = getValueByDataKey(entry, "x");
  const y = getValueByDataKey(entry, "y");
  const rawValue = getValueByDataKey(entry, "value");
  // Array.isArray narrows `unknown` to `any[]`; keep the element `unknown` (the
  // `any → unknown` assignment is safe) so the typeof guard below stays sound.
  const value: unknown = Array.isArray(rawValue) ? rawValue[rawValue.length - 1] : rawValue;
  const payload = getValueByDataKey(entry, "payload");
  return {
    x: typeof x === "number" ? x : undefined,
    y: typeof y === "number" ? y : undefined,
    value: typeof value === "number" ? value : 0,
    errorVal: coerceErrorVal(getValueByDataKey(payload, dataKey)),
  };
};

export const Bar = (props: BarProps): JSX.Element => {
  const store = useAppStore();
  const merged = merge(barDefaultProps, props);
  const isPanorama = useIsPanorama();
  const id = useUniqueId("recharts-bar", props.id);
  const stackId = useStackId(props.stackId);
  // Custom shape render prop (function form), captured once.
  const shape = merged.shape ?? defaultBarShape;
  const activeBar = merged.activeBar;
  const hasCustomShape = shape !== defaultBarShape;

  let prev: BarSettings | null = null;

  createEffect(
    (): BarSettings => ({
      id,
      type: "bar",
      isPanorama,
      data: merged.data,
      dataKey: merged.dataKey,
      xAxisId: merged.xAxisId,
      yAxisId: merged.yAxisId,
      zAxisId: 0,
      hide: merged.hide,
      stackId,
      barSize: merged.barSize,
      maxBarSize: merged.maxBarSize,
      minPointSize: merged.minPointSize,
      hasCustomShape,
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

  // Per-bar <Cell> overrides (collected from children, in data order).
  const cells = collectCells(() => props.children);
  const rectangles = useAppSelector((state) => selectBarRectangles(state, id, isPanorama, cells()));

  // Registers this bar's tooltip payload entry (an explicit `name` prop wins,
  // else it falls back to a string dataKey).
  const tooltipConfig = createMemo<TooltipPayloadConfiguration>(() => ({
    dataDefinedOnItem: merged.data,
    getPosition: noop,
    settings: {
      stroke: merged.stroke,
      strokeWidth: merged.strokeWidth,
      // recharts' defaultBarProps has NO `fill` — the #3182bd default is applied
      // only at render time, so the tooltip entry carries the RAW prop fill
      // (undefined when unset). Use props.fill, not merged.fill, for parity.
      fill: props.fill,
      dataKey: merged.dataKey,
      nameKey: undefined,
      name: getTooltipNameProp(merged.name, merged.dataKey),
      hide: merged.hide,
      type: merged.tooltipType,
      color: props.fill,
      unit: merged.unit,
      graphicalItemId: id,
    },
  }));

  // Item-type tooltip dispatch: hovering/clicking a single rectangle activates the
  // tooltip for this bar (the `item` eventType path — `<Tooltip shared={false}>`).
  const onItemEnter = useMouseEnterItemDispatch(props.onMouseEnter, merged.dataKey, id);
  const onItemLeave = useMouseLeaveItemDispatch(props.onMouseLeave);
  const onItemClick = useMouseClickItemDispatch(props.onClick, merged.dataKey, id);
  // Capture optional handlers once (not `props.*` reads inside <For>/<Layer>).
  const onMouseOverHandler = props.onMouseOver;
  const onMouseOutHandler = props.onMouseOut;
  const onTouchMoveHandler = props.onTouchMove;
  const onTouchEndHandler = props.onTouchEnd;

  // Legend payload entry for this bar.
  const legendPayload = createMemo<ReadonlyArray<LegendPayload>>(() => [
    {
      inactive: merged.hide,
      dataKey: merged.dataKey,
      type: merged.legendType,
      color: merged.fill,
      value: getTooltipNameProp(merged.name, merged.dataKey),
      payload: props,
    },
  ]);

  const activeTooltipIndex = useAppSelector(selectActiveTooltipIndex);
  const activeTooltipDataKey = useAppSelector(selectActiveTooltipDataKey);
  const isEntryActive = (
    entry: BarRectangleItem,
    dataKey: DataKey<unknown> | undefined,
  ): boolean => {
    const idx = activeTooltipIndex();
    if (idx == null) {
      return false;
    }
    const dk = activeTooltipDataKey();
    return String(entry.originalDataIndex) === idx && (dk == null || dataKey === dk);
  };

  // One LabelList entry per rectangle (its trapezoid viewBox + value/payload),
  // provided to LabelList via context.
  const shouldRenderBars = createMemo(() => !merged.hide && rectangles());
  const labelListEntries = createMemo<ReadonlyArray<CartesianLabelListEntry>>(() => {
    const rects = rectangles();
    if (!rects) {
      return [];
    }
    return rects.map((r) => {
      const viewBox: TrapezoidViewBox = {
        x: r.x,
        y: r.y,
        upperWidth: r.width,
        lowerWidth: r.width,
        width: r.width,
        height: r.height,
      };
      return {
        ...viewBox,
        viewBox,
        parentViewBox: r.parentViewBox,
        value: r.value,
        payload: r.payload,
        fill: r.fill,
      };
    });
  });

  const layout = useCartesianChartLayout();
  // ErrorBar whiskers are centered on each bar: offset by half the bar's cross size
  // (recharts: vertical → height/2, else width/2). 0 when there are no rectangles.
  const errorBarOffset = (): number => {
    const r0 = rectangles()?.[0];
    if (r0 == null) {
      return 0;
    }
    return layout() === "vertical" ? r0.height / 2 : r0.width / 2;
  };
  const { needClip } = useNeedsClip(merged.xAxisId, merged.yAxisId);
  const animationId = useAnimationId(() => rectangles(), "recharts-bar-");
  let prevRects: ReadonlyArray<BarRectangleItem> | null = null;
  const [showLabels, setShowLabels] = createSignal(true);
  const labelContextEntries = createMemo(() => (showLabels() ? labelListEntries() : undefined));
  const handleAnimationStart = (): void => {
    props.onAnimationStart?.();
    setShowLabels(false);
  };
  const handleAnimationEnd = (): void => {
    props.onAnimationEnd?.();
    setShowLabels(true);
  };

  const barLayer = createMemo(() => {
    const chartLayout = layout();
    if (chartLayout !== "horizontal" && chartLayout !== "vertical") {
      return null;
    }
    const rects = shouldRenderBars();
    if (!rects) {
      return null;
    }
    const animId = animationId();
    const clip = needClip() ? `url(#clipPath-${id})` : undefined;
    const barClass = merged.class ? `recharts-bar ${merged.class}` : "recharts-bar";
    return (
      <Layer id={id} class={barClass}>
        <Show when={needClip()}>
          <defs>
            <GraphicalItemClipPath
              clipPathId={id}
              xAxisId={merged.xAxisId}
              yAxisId={merged.yAxisId}
            />
          </defs>
        </Show>
        <Layer class="recharts-bar-rectangles" {...(clip != null ? { "clip-path": clip } : {})}>
          <BarBackground
            background={merged.background}
            data={rects}
            dataKey={merged.dataKey}
            graphicalItemId={id}
            onClick={props.onClick}
            onMouseEnter={props.onMouseEnter}
            onMouseLeave={props.onMouseLeave}
            onMouseOver={props.onMouseOver}
            onMouseOut={props.onMouseOut}
            onTouchMove={props.onTouchMove}
            onTouchEnd={props.onTouchEnd}
          />
          <CartesianLabelListContextProvider value={labelContextEntries}>
            <Show when={animId} keyed>
              {(keyedAnimationId) => (
                <JavascriptAnimate
                  animationId={keyedAnimationId}
                  duration={merged.animationDuration}
                  easing={merged.animationEasing}
                  isActive={merged.isAnimationActive}
                  begin={merged.animationBegin}
                  onAnimationStart={handleAnimationStart}
                  onAnimationEnd={handleAnimationEnd}
                >
                  {(t) => {
                    const frame = toAnimatedBarRectangles(rects, prevRects, t, untrack(layout));
                    prevRects = frame;
                    return (
                      <Layer>
                        <For each={frame}>
                          {(r, i) =>
                            hasCustomShape || (r.width !== 0 && r.height !== 0) ? (
                              <BarRectangleLayer
                                entry={r}
                                displayIndex={i()}
                                dataKey={merged.dataKey}
                                activeBar={activeBar}
                                fill={r.fill ?? r.cell?.fill ?? merged.fill}
                                stroke={r.stroke ?? r.cell?.stroke ?? merged.stroke}
                                shape={shape}
                                isEntryActive={isEntryActive}
                                cellClass={typeof r.class === "string" ? r.class : undefined}
                                onMouseEnter={onItemEnter(r, r.originalDataIndex)}
                                onMouseLeave={onItemLeave(r, r.originalDataIndex)}
                                onClick={onItemClick(r, r.originalDataIndex)}
                                onMouseOver={
                                  onMouseOverHandler != null
                                    ? (event) => onMouseOverHandler(r, r.originalDataIndex, event)
                                    : undefined
                                }
                                onMouseOut={
                                  onMouseOutHandler != null
                                    ? (event) => onMouseOutHandler(r, r.originalDataIndex, event)
                                    : undefined
                                }
                                onTouchMove={
                                  onTouchMoveHandler != null
                                    ? (event) => onTouchMoveHandler(r, i(), event)
                                    : undefined
                                }
                                onTouchEnd={
                                  onTouchEndHandler != null
                                    ? (event) => onTouchEndHandler(r, i(), event)
                                    : undefined
                                }
                              />
                            ) : null
                          }
                        </For>
                      </Layer>
                    );
                  }}
                </JavascriptAnimate>
              )}
            </Show>
            <LabelListFromLabelProp label={merged.label} />
          </CartesianLabelListContextProvider>
        </Layer>
      </Layer>
    );
  });

  return (
    <>
      <SetTooltipEntrySettings tooltipEntrySettings={tooltipConfig()} />
      <SetLegendPayload id={id} legendPayload={legendPayload()} />
      <ZIndexLayer zIndex={merged.zIndex}>{barLayer()}</ZIndexLayer>
      {/* Children (e.g. <ErrorBar>, <LabelList>) mount ONCE here at the stable
          top-level return — NOT inside the rectangles-dependent `barLayer` memo,
          which would re-mount them on every rect recompute (ErrorBar would then
          churn add/removeErrorBar → re-extend the domain → recompute → loop).
          recharts wraps the bar body in RegisterGraphicalItemId + SetErrorBarContext;
          we provide them (plus the label-list context) here so children register and
          draw against the live rectangles while staying mounted. */}
      <RegisterGraphicalItemId type="bar" id={id}>
        {() => (
          <SetErrorBarContext
            xAxisId={merged.xAxisId}
            yAxisId={merged.yAxisId}
            data={rectangles() ?? []}
            dataPointFormatter={barErrorBarFormatter}
            errorBarOffset={errorBarOffset()}
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
