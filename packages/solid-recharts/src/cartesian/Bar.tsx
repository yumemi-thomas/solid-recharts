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
import { createEffect, createMemo, createSignal, For, merge, Show } from "solid-js";
import type { JSX } from "@solidjs/web";
import { noop } from "../util/DataUtils";
import { useAppSelector, useAppStore } from "../state/hooks";
import {
  AnimatedItems,
  type AnimationInterpolateFn,
  useAnimationCallbacks,
} from "../animation/AnimatedItems";
import { matchAppend, type AnimationMatchByProp } from "../animation/matchBy";
import type { MutableRef } from "../animation/useAnimationStartSnapshot";
import type { EasingInput } from "../animation/easing";
import { useCartesianChartLayout } from "../context/chartLayoutContext";
import { RegisterGraphicalItemId } from "../context/RegisterGraphicalItemId";
import { SetErrorBarContext } from "../context/ErrorBarContext";
import type { ErrorBarDataItem, ErrorBarDataPointFormatter } from "./ErrorBar";
import { SetTooltipEntrySettings } from "../state/SetTooltipEntrySettings";
import { TooltipPayloadConfiguration } from "../state/tooltipSlice";
import { SetLegendPayload } from "../state/SetLegendPayload";
import { LegendPayload } from "../component/DefaultLegendContent";
import type { Formatter } from "../component/DefaultTooltipContent";
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
  ShapeAnimationProps,
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
import type { RectRadius } from "../shape/Rectangle";
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
import { registerInStore } from "../state/registerInStore";

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

export type BarShapeProps = Omit<BarRectangleItem, "value" | "tooltipPosition"> &
  // v3.9: a function-form custom shape also receives animationElapsedTime / isAnimating /
  // isEntrance while the bar animates (recharts BarShapeProps = BarRectangleItem & ShapeAnimationProps & …).
  ShapeAnimationProps & {
    // value/tooltipPosition are optional here: a bar shape receives them, but the same
    // shape option also renders backgrounds (which omit them — see BarRectangleProps).
    value?: BarRectangleItem["value"];
    tooltipPosition?: BarRectangleItem["tooltipPosition"];
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
// Default per-frame interpolation for Bar rectangles (the `animationInterpolateFn`
// the new AnimatedItems engine drives). Mirrors recharts 3.9 `defaultBarAnimateItems`:
// matched rects tween between prev/next; added rects grow from `stackedBarStart`;
// removed rects shrink back to the baseline before disappearing at t=1.
const defaultBarAnimateItems: AnimationInterpolateFn<BarRectangleItem, CartesianLayout> = (
  items,
  t,
  layout,
) => {
  if (items == null) return [];
  if (t === 1) {
    return items.flatMap((item) => (item.status === "removed" ? [] : [item.next]));
  }
  return items.flatMap((item): BarRectangleItem[] => {
    if (item.status === "removed") {
      if (layout === "horizontal") {
        return [
          {
            ...item.prev,
            height: interpolate(item.prev.height, 0, t),
            y: interpolate(item.prev.y, item.prev.y + item.prev.height, t),
          },
        ];
      }
      return [{ ...item.prev, width: interpolate(item.prev.width, 0, t) }];
    }
    if (item.status === "matched") {
      return [
        {
          ...item.next,
          x: interpolate(item.prev.x, item.next.x, t),
          y: interpolate(item.prev.y, item.next.y, t),
          width: interpolate(item.prev.width, item.next.width, t),
          height: interpolate(item.prev.height, item.next.height, t),
        },
      ];
    }
    // added
    const { next } = item;
    if (layout === "horizontal") {
      return [
        {
          ...next,
          height: interpolate(0, next.height, t),
          y: interpolate(next.stackedBarStart, next.y, t),
        },
      ];
    }
    return [
      {
        ...next,
        width: interpolate(0, next.width, t),
        x: interpolate(next.stackedBarStart, next.x, t),
      },
    ];
  });
};

function BarBackground(props: {
  background?: ActiveShape<BarShapeProps, SVGPathElement> | undefined;
  data: ReadonlyArray<BarRectangleItem>;
  dataKey: DataKey<unknown> | undefined;
  graphicalItemId: string;
  onClick?: BarMouseEvent;
  onMouseEnter?: BarMouseEvent;
  onMouseLeave?: BarMouseEvent;
  onMouseMove?: BarMouseEvent;
  onMouseDown?: BarMouseEvent;
  onMouseUp?: BarMouseEvent;
  onMouseOver?: BarMouseEvent;
  onMouseOut?: BarMouseEvent;
  onTouchMove?: BarMouseEvent;
  onTouchEnd?: BarMouseEvent;
}): JSX.Element {
  const activeIndex = useAppSelector(selectActiveTooltipIndex);
  // Getter args: the hooks read handler/dataKey at event time (fresh, never stale).
  const onMouseEnter = useMouseEnterItemDispatch(
    () => props.onMouseEnter,
    () => props.dataKey,
    () => props.graphicalItemId,
  );
  const onMouseLeave = useMouseLeaveItemDispatch(() => props.onMouseLeave);
  const onClick = useMouseClickItemDispatch(
    () => props.onClick,
    () => props.dataKey,
    () => props.graphicalItemId,
  );

  // Per-background-rectangle BarRectangle props (DATA, not JSX). Recomputes on data /
  // active-index change; the `<Show>`/`<For>` below render it. Returning JSX from a
  // memo and feeding it into <ZIndexLayer> (a Portal) leaked ownerless effects on
  // recompute — see the Bar main-layer note. The <Show> wraps <ZIndexLayer> so the
  // Portal subtree stays stable and only the <For> rows update.
  const backgroundRects = createMemo<ReadonlyArray<BarRectangleProps> | undefined>(() => {
    const backgroundFromProps = props.background;
    if (!backgroundFromProps) {
      return undefined;
    }
    // NOTE: intentionally does NOT read activeIndex() here — that would rebuild
    // the whole rects array (and recreate every background-rect DOM node) on
    // every hover move. `isActive` is derived per-rect in the JSX below, so the
    // array stays stable across hover and only the active flag updates.
    const dataKey = props.dataKey;
    const backgroundProps = svgPropertiesNoEventsFromUnknown(backgroundFromProps);
    const backgroundEventProps = svgPropertiesAndEventsFromUnknown({
      onMouseOver: props.onMouseOver,
      onMouseOut: props.onMouseOut,
      onMouseMove: props.onMouseMove,
      onMouseDown: props.onMouseDown,
      onMouseUp: props.onMouseUp,
      onTouchMove: props.onTouchMove,
      onTouchEnd: props.onTouchEnd,
    });

    const rects = props.data.flatMap((entry, i): BarRectangleProps[] => {
      const bg = entry.background;
      if (bg == null) {
        return [];
      }
      const { value: _value, background: _bg, tooltipPosition: _tp, ...rest } = entry;
      return [
        {
          option: backgroundFromProps,
          isActive: false, // placeholder; derived reactively per-rect in the JSX below
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
        },
      ];
    });
    return rects.length > 0 ? rects : undefined;
  });

  return (
    <Show when={backgroundRects()}>
      {(rects) => (
        <ZIndexLayer zIndex={getZIndexFromUnknown(props.background, DefaultZIndexes.barBackground)}>
          <Layer>
            <For each={rects()}>
              {(barRectangleProps) => (
                <BarRectangle
                  {...barRectangleProps}
                  isActive={String(barRectangleProps.originalDataIndex) === activeIndex()}
                />
              )}
            </For>
          </Layer>
        </ZIndexLayer>
      )}
    </Show>
  );
}

function barEntryShapeProps(
  entry: BarRectangleItem,
  displayIndex: number,
  dataKey: DataKey<unknown> | undefined,
  fill: string,
  stroke: string | undefined,
  cellClass: string | undefined,
  radius: RectRadius | undefined,
  // v3.9: forwarded so a function-form custom shape can react to the animation state.
  animationState: ShapeAnimationProps,
): Omit<BarRectangleProps, "option" | "isActive"> {
  const { background: _bg, value: _v, tooltipPosition: _tp, ...rest } = entry;
  return {
    ...rest,
    fill,
    stroke,
    radius,
    dataKey,
    index: displayIndex,
    class: cellClass,
    animationElapsedTime: animationState.animationElapsedTime,
    isAnimating: animationState.isAnimating,
    isEntrance: animationState.isEntrance,
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
  radius?: RectRadius;
  animationElapsedTime?: number;
  isAnimating?: boolean;
  isEntrance?: boolean;
  onMouseMove?: (event: MouseEvent) => void;
  onMouseDown?: (event: MouseEvent) => void;
  onMouseUp?: (event: MouseEvent) => void;
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
        props.radius,
        {
          animationElapsedTime: props.animationElapsedTime,
          isAnimating: props.isAnimating,
          isEntrance: props.isEntrance,
        },
      )}
      option={props.shape}
      isActive={false}
      onMouseMove={props.onMouseMove}
      onMouseDown={props.onMouseDown}
      onMouseUp={props.onMouseUp}
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
  radius?: RectRadius;
  animationElapsedTime?: number;
  isAnimating?: boolean;
  isEntrance?: boolean;
  isEntryActive: (entry: BarRectangleItem, dataKey: DataKey<unknown> | undefined) => boolean;
  onMouseMove?: (event: MouseEvent) => void;
  onMouseDown?: (event: MouseEvent) => void;
  onMouseUp?: (event: MouseEvent) => void;
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
          props.radius,
          {
            animationElapsedTime: props.animationElapsedTime,
            isAnimating: props.isAnimating,
            isEntrance: props.isEntrance,
          },
        )}
        option={option}
        isActive={isVisuallyActive()}
        onTransitionEnd={handleTransitionEnd}
        onMouseMove={props.onMouseMove}
        onMouseDown={props.onMouseDown}
        onMouseUp={props.onMouseUp}
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
  radius?: RectRadius;
  animationElapsedTime?: number;
  isAnimating?: boolean;
  isEntrance?: boolean;
  isEntryActive: (entry: BarRectangleItem, dataKey: DataKey<unknown> | undefined) => boolean;
  onMouseEnter: (event: MouseEvent) => void;
  onMouseLeave: (event: MouseEvent) => void;
  onClick: (event: MouseEvent) => void;
  onMouseMove?: (event: MouseEvent) => void;
  onMouseDown?: (event: MouseEvent) => void;
  onMouseUp?: (event: MouseEvent) => void;
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
      {/* move/down/up ride the rectangle path itself (reference puts them on the
          wrapping g via adaptEventsOfChild; the path is the g's only child, and
          these events bubble, so this is behavior-equivalent). */}
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
          radius={props.radius}
          animationElapsedTime={props.animationElapsedTime}
          isAnimating={props.isAnimating}
          isEntrance={props.isEntrance}
          isEntryActive={props.isEntryActive}
          onMouseMove={props.onMouseMove}
          onMouseDown={props.onMouseDown}
          onMouseUp={props.onMouseUp}
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
          radius={props.radius}
          animationElapsedTime={props.animationElapsedTime}
          isAnimating={props.isAnimating}
          isEntrance={props.isEntrance}
          onMouseMove={props.onMouseMove}
          onMouseDown={props.onMouseDown}
          onMouseUp={props.onMouseUp}
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
  /** Formats this Bar's tooltip value; takes precedence over the Tooltip-level `formatter`. */
  formatter?: Formatter;
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
  /** Corner radius of each bar (single number or [tl, tr, br, bl]). @defaultValue 0 */
  radius?: RectRadius;
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
  // `ActiveShape` already includes `boolean`, so no explicit `| boolean` needed.
  activeBar?: ActiveShape<BarShapeProps, SVGPathElement>;
  onAnimationStart?: () => void;
  onAnimationEnd?: () => void;
  isAnimationActive?: boolean | "auto";
  animationBegin?: number;
  animationDuration?: AnimationDuration;
  animationEasing?: EasingInput;
  /** Custom per-frame interpolation for the bar rectangles (v3.9). */
  animationInterpolateFn?: AnimationInterpolateFn<BarRectangleItem, CartesianLayout>;
  /** How prev/next rectangles are matched across data updates (v3.9). @defaultValue matchAppend */
  animationMatchBy?: AnimationMatchByProp<BarRectangleItem>;
  id?: string;
  class?: string;
  /** Legend icon type. @defaultValue 'rect' */
  legendType?: LegendType;
  onClick?: BarMouseEvent;
  onMouseEnter?: BarMouseEvent;
  onMouseLeave?: BarMouseEvent;
  onMouseMove?: BarMouseEvent;
  onMouseDown?: BarMouseEvent;
  onMouseUp?: BarMouseEvent;
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
  animationInterpolateFn: defaultBarAnimateItems,
  animationMatchBy: matchAppend,
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
  const id = useUniqueId("recharts-bar", () => props.id);
  const stackId = useStackId(() => props.stackId);
  // Custom shape render prop (function form).
  const shape = (): ActiveShape<BarShapeProps, SVGPathElement> => merged.shape ?? defaultBarShape;

  if (store != null) {
    registerInStore<BarSettings>(
      () => ({
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
        hasCustomShape: shape() !== defaultBarShape,
      }),
      {
        add: (next) => store.actions.graphicalItems.addCartesianGraphicalItem(next),
        replace: (prev, next) =>
          store.actions.graphicalItems.replaceCartesianGraphicalItem({ prev, next }),
        remove: (prev) => store.actions.graphicalItems.removeCartesianGraphicalItem(prev),
      },
    );
  }

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
      formatter: merged.formatter,
      graphicalItemId: id,
    },
  }));

  // Item-type tooltip dispatch: hovering/clicking a single rectangle activates the
  // tooltip for this bar (the `item` eventType path — `<Tooltip shared={false}>`).
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
  // Legend payload entry for this bar.
  const legendPayload = createMemo<ReadonlyArray<LegendPayload>>(() => [
    {
      inactive: merged.hide,
      dataKey: merged.dataKey,
      type: merged.legendType,
      // recharts' defaultBarProps has NO `fill` — the #3182bd default is applied
      // only at render time, so the legend color is the RAW prop fill (undefined
      // when unset → Bar legend has no default color).
      color: props.fill,
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
  const { needClip } = useNeedsClip(
    () => merged.xAxisId,
    () => merged.yAxisId,
  );
  const barClipPath = createMemo(() => (needClip() ? `url(#clipPath-${id})` : undefined));
  // Holds the latest visible rectangles frame so a re-animation (data change)
  // tweens from where the bars currently are. Managed by AnimatedItems via
  // useAnimationStartSnapshot.
  const previousRectanglesRef: MutableRef<ReadonlyArray<BarRectangleItem> | null | undefined> = {
    current: null,
  };
  // Cartesian layout for the interpolation fn (Bar is only horizontal | vertical).
  const cartesianLayout = (): CartesianLayout =>
    layout() === "vertical" ? "vertical" : "horizontal";
  // Animation state, sourced the same way upstream does (useAnimationCallbacks):
  // `isAnimating` flips true on start / false on end (and forwards the user
  // onAnimationStart/onAnimationEnd callbacks). Labels are hidden while animating
  // (recharts: BarLabelListProvider showLabels={!isAnimating}); custom shapes also
  // receive `isAnimating` (combined with `animationElapsedTime < 1` below, matching
  // upstream's `isAnimating || animationElapsedTime < 1`).
  const { isAnimating, handleAnimationStart, handleAnimationEnd } = useAnimationCallbacks(
    () => props.onAnimationStart?.(),
    () => props.onAnimationEnd?.(),
  );
  const labelContextEntries = createMemo(() => (isAnimating() ? undefined : labelListEntries()));

  // Gate: render only in a cartesian layout AND when there are rectangles to draw.
  // Mirrors <Line>/<Area>'s inline `<Show when={!hide && points()}>` template: the
  // animated subtree is created ONCE under this Show and its inner reactive reads
  // update in place.
  //
  // Two NO_OWNER_EFFECT leaks shaped this structure (the `<Show>` wraps `<ZIndexLayer>`,
  // NOT the other way around):
  //   1. The previous `barLayer = createMemo(() => <JSX>)` returned a JSX subtree from
  //      a memo; on a data change the memo recomputed and the `{barLayer()}` insert
  //      re-created the whole subtree during the flush queue, leaking ownerless
  //      render-effects. A non-keyed `<Show>` keeps the subtree stable across data
  //      changes (only inner reads update), so that leak is gone.
  //   2. Unlike <Line>/<Area>, Bar wraps its content in <ZIndexLayer>, which renders
  //      its children through a <Portal> (bar zIndex is non-zero). A <Portal> whose
  //      children are a reactive `<Show>` makes the Portal's internal `insert`
  //      re-create an ownerless render-effect when the portal target settles (e.g. a
  //      no-data chart with a sibling chart mounting). Keeping <ZIndexLayer> OUTSIDE
  //      the Show would put a live `<Show>` into the Portal even with no rects; nesting
  //      it INSIDE the Show means an empty Bar mounts no Portal at all (nothing to
  //      leak), and a populated Bar mounts a stable subtree into the Portal.
  // (`[]` is truthy, matching the old memo which rendered an empty `<For>` for an
  // empty rects array.)
  const renderableRects = createMemo<ReadonlyArray<BarRectangleItem> | undefined>(() => {
    const chartLayout = layout();
    if (chartLayout !== "horizontal" && chartLayout !== "vertical") {
      return undefined;
    }
    return shouldRenderBars() || undefined;
  });

  return (
    <>
      <SetTooltipEntrySettings tooltipEntrySettings={tooltipConfig()} />
      <SetLegendPayload id={id} legendPayload={legendPayload()} />
      <Show when={renderableRects()}>
        {(rects) => (
          <ZIndexLayer zIndex={merged.zIndex}>
            <Layer id={id} class={merged.class ? `recharts-bar ${merged.class}` : "recharts-bar"}>
              <Show when={needClip()}>
                <defs>
                  <GraphicalItemClipPath
                    clipPathId={id}
                    xAxisId={merged.xAxisId}
                    yAxisId={merged.yAxisId}
                  />
                </defs>
              </Show>
              <Layer class="recharts-bar-rectangles" clipPath={barClipPath()}>
                <BarBackground
                  background={merged.background}
                  data={rects()}
                  dataKey={merged.dataKey}
                  graphicalItemId={id}
                  onClick={props.onClick}
                  onMouseEnter={props.onMouseEnter}
                  onMouseLeave={props.onMouseLeave}
                  onMouseMove={props.onMouseMove}
                  onMouseDown={props.onMouseDown}
                  onMouseUp={props.onMouseUp}
                  onMouseOver={props.onMouseOver}
                  onMouseOut={props.onMouseOut}
                  onTouchMove={props.onTouchMove}
                  onTouchEnd={props.onTouchEnd}
                />
                <CartesianLabelListContextProvider value={labelContextEntries}>
                  <AnimatedItems
                    animationInput={rects()}
                    animationIdPrefix="recharts-bar-"
                    items={rects()}
                    previousItemsRef={previousRectanglesRef}
                    isAnimationActive={merged.isAnimationActive}
                    animationBegin={merged.animationBegin}
                    animationDuration={merged.animationDuration}
                    animationEasing={merged.animationEasing}
                    onAnimationStart={handleAnimationStart}
                    onAnimationEnd={handleAnimationEnd}
                    animationInterpolateFn={merged.animationInterpolateFn}
                    animationMatchBy={merged.animationMatchBy}
                    layout={cartesianLayout()}
                  >
                    {(frame, animationElapsedTime, isEntrance) => (
                      <Layer>
                        {/* keyed={false} (index-keyed): `frame` is a fresh array of
                            fresh rect objects every animation tick; reference-keyed
                            <For> would dispose+recreate every bar's DOM node and
                            rebuild its ~10 event closures per frame. Index-keying
                            reuses the rows (geometry updates reactively via the
                            getter-wrapped props) and builds the handlers once per
                            slot. `r` is now an accessor — event handlers read `r()`
                            at dispatch time so they see the current frame's rect. */}
                        <For each={frame} keyed={false}>
                          {(r, i) => (
                            // Render every selector-output rectangle, matching recharts
                            // (zero-dimension genuinely-empty bars are already dropped at
                            // the selector level — selectBarRectangles). We must NOT also
                            // filter on width/height here: mid-animation a growing bar is
                            // momentarily collapsed (t≈0 → height/width 0) and recharts
                            // keeps that element in the DOM, so the rectangles render while
                            // the chart animates (e.g. a Brush window narrowing). Filtering
                            // here suppressed all animated bars until the animation was
                            // driven to a non-zero frame.
                            <BarRectangleLayer
                              entry={r()}
                              displayIndex={i}
                              dataKey={merged.dataKey}
                              activeBar={merged.activeBar}
                              fill={r().fill ?? r().cell?.fill ?? merged.fill}
                              stroke={r().stroke ?? r().cell?.stroke ?? merged.stroke}
                              radius={merged.radius}
                              shape={shape()}
                              animationElapsedTime={animationElapsedTime}
                              // Mirror upstream's `isAnimating || animationElapsedTime < 1`.
                              isAnimating={isAnimating() || animationElapsedTime < 1}
                              isEntrance={isEntrance}
                              isEntryActive={isEntryActive}
                              cellClass={typeof r().class === "string" ? r().class : undefined}
                              onMouseEnter={(event) =>
                                onItemEnter(r(), r().originalDataIndex)(event)
                              }
                              onMouseLeave={(event) =>
                                onItemLeave(r(), r().originalDataIndex)(event)
                              }
                              onClick={(event) => onItemClick(r(), r().originalDataIndex)(event)}
                              onMouseOver={
                                props.onMouseOver != null
                                  ? (event) =>
                                      props.onMouseOver?.(r(), r().originalDataIndex, event)
                                  : undefined
                              }
                              onMouseOut={
                                props.onMouseOut != null
                                  ? (event) => props.onMouseOut?.(r(), r().originalDataIndex, event)
                                  : undefined
                              }
                              onMouseMove={
                                props.onMouseMove != null
                                  ? (event) =>
                                      props.onMouseMove?.(r(), r().originalDataIndex, event)
                                  : undefined
                              }
                              onMouseDown={
                                props.onMouseDown != null
                                  ? (event) =>
                                      props.onMouseDown?.(r(), r().originalDataIndex, event)
                                  : undefined
                              }
                              onMouseUp={
                                props.onMouseUp != null
                                  ? (event) => props.onMouseUp?.(r(), r().originalDataIndex, event)
                                  : undefined
                              }
                              onTouchMove={
                                props.onTouchMove != null
                                  ? (event) => props.onTouchMove?.(r(), i, event)
                                  : undefined
                              }
                              onTouchEnd={
                                props.onTouchEnd != null
                                  ? (event) => props.onTouchEnd?.(r(), i, event)
                                  : undefined
                              }
                            />
                          )}
                        </For>
                      </Layer>
                    )}
                  </AnimatedItems>
                  <LabelListFromLabelProp label={merged.label} />
                </CartesianLabelListContextProvider>
              </Layer>
            </Layer>
          </ZIndexLayer>
        )}
      </Show>
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
