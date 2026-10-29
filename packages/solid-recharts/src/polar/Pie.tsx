// Ported from recharts 3.8.1 src/polar/Pie.tsx (commit 7a23854).
//
// MINIMAL PORT — renders one <Sector> per data slice with byte-identical
// geometry. `computePieSectors` is the pure sector-geometry function, ported
// faithfully (sum>0 branch, minAngle redistribution, paddingAngle). It is
// consumed by `pieSelectors.selectPieSectors`.
//
// Solid deviations: `resolveDefaultProps`→`merge`; effect-dispatch registration
// (RegisterGraphicalItemId + SetPolarGraphicalItem) → `createEffect`/`onCleanup`
// pushing PieSettings into the graphicalItems slice (matched by id); the
// `@ts-expect-error`-laden unknown-data spreads are replaced with typed coercion
// (no `any`/`as`).
//
// Tooltip-entry + legend-payload registration + per-sector item-hover dispatch
// are WIRED (item-type tooltip). selectPieLegend drives the (sector-independent)
// legend so it renders even when every value is 0.
// WIRED: labels + labelLine (function/object/boolean forms; default text+connector),
// `<Label>` children (position=center incl. dx/dy via the polar Label path),
// activeShape / inactiveShape (function + object + boolean forms, via <Shape> keyed
// off the active-tooltip index/dataKey/graphical-item id, with `recharts-active-shape`),
// the function-form custom `shape` render prop, the full external event surface
// (onClick/onMouse*/onTouch*, called `(sector, index, event)`), per-sector
// data-attrs + tabIndex, the empty-data render gate (root `.recharts-pie` always
// rendered), and onAnimationStart/End callbacks.
// Cells ARE wired: a <Cell> child (or a data-row `fill`/`stroke`) overrides the
// per-slice fill/stroke/class; with no `data` prop the <Cell> rows become the data.
// PERMANENT-N/A (by design, NOT deferred): element-form shape/activeShape/
// inactiveShape/label (Solid has no cloneElement — use the function form).
// zIndex relayering IS wired: the whole `.recharts-pie` root Layer is wrapped in
// <ZIndexLayer> (default DefaultZIndexes.area = 100) when it has sectors, matching
// recharts (the empty/hidden root Layer stays inline, mounting no portal).
// DEFERRED: `maxRadius`/`cornerRadius` rounding edge cases, float-precise per-frame
// animation angle matrices.
import { createEffect, createMemo, For, merge, Show, untrack } from "solid-js";
import type { JSX } from "@solidjs/web";
import { useAppSelector, useAppStore } from "../state/hooks";
import { useUniqueId } from "../util/useUniqueId";
import {
  AnimatedItems,
  type AnimationInterpolateFn,
  useAnimationCallbacks,
} from "../animation/AnimatedItems";
import { matchAppend, type AnimationMatchByProp } from "../animation/matchBy";
import type { MutableRef } from "../animation/useAnimationStartSnapshot";
import { usePolarChartLayout } from "../context/chartLayoutContext";
import type { EasingInput } from "../animation/easing";
import type { AnimationDuration, PolarLayout } from "../util/types";
import { Layer } from "../container/Layer";
import { Sector } from "../shape/Sector";
import { Text } from "../component/Text";
import { Shape } from "../util/ActiveShapeUtils";
import type { ActiveShape, ShapeAnimationProps } from "../util/types";
import { type CellProps, collectCells } from "../component/Cell";
import { selectPieSectors, selectPieLegend } from "../state/selectors/pieSelectors";
import {
  selectActiveTooltipIndex,
  selectActiveTooltipDataKey,
  selectActiveTooltipGraphicalItemId,
} from "../state/selectors/tooltipSelectors";
import {
  DATA_ITEM_INDEX_ATTRIBUTE_NAME,
  DATA_ITEM_GRAPHICAL_ITEM_ID_ATTRIBUTE_NAME,
} from "../util/Constants";
import { SetTooltipEntrySettings } from "../state/SetTooltipEntrySettings";
import type { Formatter } from "../component/DefaultTooltipContent";
import { SetLegendPayload } from "../state/SetLegendPayload";
import { TooltipPayloadConfiguration } from "../state/tooltipSlice";
import {
  useMouseClickItemDispatch,
  useMouseEnterItemDispatch,
  useMouseLeaveItemDispatch,
} from "../context/tooltipContext";
import { getTooltipNameProp } from "../util/ChartUtils";
import { PieSettings } from "../state/types/PieSettings";
import { ChartData } from "../state/chartDataSlice";
import { GraphicalItemId } from "../state/graphicalItemsSlice";
import { TooltipPayload } from "../state/tooltipSlice";
import { ChartOffsetInternal, Coordinate, DataKey, LegendType, TooltipType } from "../util/types";
import { DefaultZIndexes } from "../zIndex/DefaultZIndexes";
import { ZIndexLayer } from "../zIndex/ZIndexLayer";
import { getMaxRadius, polarToCartesian } from "../util/PolarUtils";
import { getPercentValue, interpolate, isNumber, isNumOrStr, mathSign } from "../util/DataUtils";
import { getValueByDataKey } from "../util/ChartUtils";
import { registerInStore } from "../state/registerInStore";

export type PieCoordinate = {
  cx: number;
  cy: number;
  innerRadius: number;
  outerRadius: number;
  maxRadius: number;
};

/**
 * One computed pie slice. Carries the sector geometry plus the data needed for
 * tooltips/labels (the label/tooltip consumers are deferred in the minimal port).
 */
export interface PieSectorDataItem extends PieCoordinate {
  startAngle: number;
  endAngle: number;
  midAngle: number;
  middleRadius: number;
  cornerRadius: number | undefined;
  paddingAngle: number;
  percent: number;
  name: string | number;
  value: number;
  dataKey: DataKey<unknown> | undefined;
  payload: unknown;
  fill: string;
  stroke: string | undefined;
  /** Per-slice strokeWidth from the data row / a matching <Cell> (if any). */
  strokeWidth: number | string | undefined;
  /** Per-slice class from a matching <Cell> (if any). */
  class: string | undefined;
  tooltipPayload: TooltipPayload;
  tooltipPosition: Coordinate;
}

/** Extra props recharts passes to the shape render-prop / active+inactive shapes. */
export type PieSectorShapeProps = PieSectorDataItem &
  ShapeAnimationProps & {
    index: number;
    isActive: boolean;
    tabIndex: number;
    "data-recharts-item-index": number;
    "data-recharts-item-id": string;
  };

/** The type of the Pie `shape` / `activeShape` / `inactiveShape` props (recharts parity name). */
export type PieShape = ActiveShape<PieSectorShapeProps, SVGPathElement>;

/** Props a Pie label render-function / element receives (sector + computed text anchor + endpoint). */
export type PieLabelRenderProps = PieSectorDataItem & {
  index: number;
  textAnchor: string;
  x: number;
  y: number;
};

// Element-form label/labelLine (a pre-built JSX element) is PERMANENT-N/A — Solid
// has no cloneElement to inject computed props. The boolean/object/function forms
// ARE supported (and cover the ported tests).
export type PieLabel =
  | boolean
  | Partial<PieLabelRenderProps>
  | ((props: PieLabelRenderProps) => JSX.Element | string | number);

export type PieLabelLine =
  | boolean
  | Record<string, unknown>
  | ((props: { points?: ReadonlyArray<Coordinate>; [k: string]: unknown }) => JSX.Element);

/** Spread an unknown data entry into a plain record (`{}` for non-objects). */
const toRecord = (entry: unknown): Record<string, unknown> =>
  typeof entry === "object" && entry != null ? { ...entry } : {};

const getOuterRadius = (
  dataPoint: unknown,
  outerRadius: number | string | ((element: unknown) => number | string),
  maxPieRadius: number,
): number => {
  if (typeof outerRadius === "function") {
    return getPercentValue(outerRadius(dataPoint), maxPieRadius, maxPieRadius * 0.8);
  }
  return getPercentValue(outerRadius, maxPieRadius, maxPieRadius * 0.8);
};

const parseCoordinateOfPie = (
  pieSettings: PieSettings,
  offset: ChartOffsetInternal,
  dataPoint: unknown,
): PieCoordinate => {
  const { top, left, width, height } = offset;
  const maxPieRadius = getMaxRadius(width, height);
  const cx = left + getPercentValue(pieSettings.cx, width, width / 2);
  const cy = top + getPercentValue(pieSettings.cy, height, height / 2);
  const innerRadius = getPercentValue(pieSettings.innerRadius, maxPieRadius, 0);
  const outerRadius = getOuterRadius(dataPoint, pieSettings.outerRadius, maxPieRadius);
  const maxRadius = pieSettings.maxRadius || Math.sqrt(width * width + height * height) / 2;

  return { cx, cy, innerRadius, outerRadius, maxRadius };
};

const parseDeltaAngle = (startAngle: number, endAngle: number): number => {
  const sign = mathSign(endAngle - startAngle);
  const deltaAngle = Math.min(Math.abs(endAngle - startAngle), 360);

  return sign * deltaAngle;
};

export function computePieSectors({
  pieSettings,
  displayedData,
  cells,
  offset,
}: {
  pieSettings: PieSettings;
  displayedData: ChartData;
  /** Per-slice <Cell> presentation props, indexed by data position. */
  cells?: ReadonlyArray<CellProps> | undefined;
  offset: ChartOffsetInternal;
}): ReadonlyArray<PieSectorDataItem> | undefined {
  const { cornerRadius, startAngle, endAngle, dataKey, nameKey, tooltipType } = pieSettings;
  const minAngle = Math.abs(pieSettings.minAngle);
  const deltaAngle = parseDeltaAngle(startAngle, endAngle);
  const absDeltaAngle = Math.abs(deltaAngle);
  const paddingAngle = displayedData.length <= 1 ? 0 : (pieSettings.paddingAngle ?? 0);

  const notZeroItemCount = displayedData.filter(
    (entry) => getValueByDataKey(entry, dataKey, 0) !== 0,
  ).length;
  const totalPaddingAngle =
    (absDeltaAngle >= 360 ? notZeroItemCount : notZeroItemCount - 1) * paddingAngle;

  const sum = displayedData.reduce<number>((result, entry) => {
    const val: unknown = getValueByDataKey(entry, dataKey, 0);
    return result + (isNumber(val) ? val : 0);
  }, 0);

  // Only apply minAngle redistribution when at least one non-zero segment's
  // natural angle falls below the minAngle threshold.
  const needsMinAngleAdjustment =
    minAngle > 0 &&
    sum > 0 &&
    displayedData.some((entry) => {
      const val: unknown = getValueByDataKey(entry, dataKey, 0);
      const percent = (isNumber(val) ? val : 0) / sum;
      return val !== 0 && percent * absDeltaAngle < minAngle;
    });
  const effectiveMinAngle = needsMinAngleAdjustment ? minAngle : 0;

  const realTotalAngle = absDeltaAngle - notZeroItemCount * effectiveMinAngle - totalPaddingAngle;

  if (sum <= 0) {
    return undefined;
  }

  let prev: PieSectorDataItem | undefined;
  return displayedData.map((entry: unknown, i: number): PieSectorDataItem => {
    const valRaw: unknown = getValueByDataKey(entry, dataKey, 0);
    const val: number = isNumber(valRaw) ? valRaw : 0;
    const nameRaw: unknown = getValueByDataKey(entry, nameKey, i);
    const name: string | number = isNumOrStr(nameRaw) ? nameRaw : i;
    const coordinate = parseCoordinateOfPie(pieSettings, offset, entry);
    const percent = val / sum;

    // <Cell> props win over the raw data row (recharts merges cells[i].props
    // onto the entry); both can supply fill/stroke/class.
    const entryWithCellInfo = { ...toRecord(entry), ...toRecord(cells?.[i]) };
    const sectorColor =
      typeof entryWithCellInfo.fill === "string" ? entryWithCellInfo.fill : pieSettings.fill;
    const sectorStroke =
      typeof entryWithCellInfo.stroke === "string" ? entryWithCellInfo.stroke : pieSettings.stroke;
    // PieSettings carries no strokeWidth (the presentationProps-reduced deviation,
    // see PieSettings.ts) — the component-level strokeWidth is applied at render.
    const sectorStrokeWidth =
      typeof entryWithCellInfo.strokeWidth === "number" ||
      typeof entryWithCellInfo.strokeWidth === "string"
        ? entryWithCellInfo.strokeWidth
        : undefined;
    const sectorClass =
      typeof entryWithCellInfo.class === "string" ? entryWithCellInfo.class : undefined;

    let tempStartAngle: number;
    if (i) {
      // prev is defined for i > 0.
      tempStartAngle =
        (prev?.endAngle ?? startAngle) +
        mathSign(deltaAngle) * paddingAngle * (valRaw !== 0 ? 1 : 0);
    } else {
      tempStartAngle = startAngle;
    }

    const tempEndAngle =
      tempStartAngle +
      mathSign(deltaAngle) * ((valRaw !== 0 ? effectiveMinAngle : 0) + percent * realTotalAngle);
    const midAngle = (tempStartAngle + tempEndAngle) / 2;
    const middleRadius = (coordinate.innerRadius + coordinate.outerRadius) / 2;

    const tooltipPayload: TooltipPayload = [
      {
        name,
        value: val,
        payload: entryWithCellInfo,
        dataKey,
        type: tooltipType,
        color: sectorColor,
        fill: sectorColor,
        graphicalItemId: pieSettings.id,
      },
    ];
    const tooltipPosition = polarToCartesian(coordinate.cx, coordinate.cy, middleRadius, midAngle);

    const sector: PieSectorDataItem = {
      // recharts spreads the raw data row (entryWithCellInfo) into the sector so
      // arbitrary per-row fields (e.g. amt/pv/uv) surface on the item passed to
      // event handlers and labels. The geometry (coordinate) and computed fields
      // below intentionally win over any same-named raw field.
      ...entryWithCellInfo,
      ...coordinate,
      percent,
      cornerRadius: typeof cornerRadius === "string" ? parseFloat(cornerRadius) : cornerRadius,
      name,
      tooltipPayload,
      midAngle,
      middleRadius,
      tooltipPosition,
      value: val,
      dataKey,
      startAngle: tempStartAngle,
      endAngle: tempEndAngle,
      payload: entryWithCellInfo,
      paddingAngle: valRaw !== 0 ? mathSign(deltaAngle) * paddingAngle : 0,
      fill: sectorColor,
      stroke: sectorStroke,
      strokeWidth: sectorStrokeWidth,
      class: sectorClass,
    };
    prev = sector;
    return sector;
  });
}

// Default per-frame interpolation for Pie sectors (the `animationInterpolateFn`
// the new AnimatedItems engine drives). Mirrors recharts 3.9 `defaultPieAnimateItems`:
// it walks the matched/added items in order, accumulating `curAngle` from the first
// non-removed sector's `next.startAngle`, and interpolates each sector's angular
// SWEEP (matched: prev-sweep→next-sweep; added: 0→next-sweep) per frame. Removed
// sectors are dropped. `interpolate` rounds the delta to 4 decimals, so the settled
// (t=1) frame is byte-identical to the reference (e.g. the closing sector lands at
// 255.0003, not 255). Pie is POLAR, so the LayoutType is PolarLayout (unused here,
// matching the reference — angle accumulation is layout-independent).
export const defaultPieAnimateItems: AnimationInterpolateFn<PieSectorDataItem, PolarLayout> = (
  items,
  animationElapsedTime,
) => {
  if (items == null) return [];
  const stepData: PieSectorDataItem[] = [];
  // The arrow predicate is an inferred type guard (TS 5.5+), so `firstNonRemoved`
  // is already narrowed to a non-`removed` item — both `added` and `matched` carry `next`.
  const firstNonRemoved = items.find((item) => item.status !== "removed");
  let curAngle: number = firstNonRemoved != null ? firstNonRemoved.next.startAngle : 0;

  items.forEach((item, index) => {
    if (item.status === "removed") return;
    const paddingAngle = index > 0 ? (item.next.paddingAngle ?? 0) : 0;

    if (item.status === "matched") {
      const angle = interpolate(
        item.prev.endAngle - item.prev.startAngle,
        item.next.endAngle - item.next.startAngle,
        animationElapsedTime,
      );
      const latest = {
        ...item.next,
        startAngle: curAngle + paddingAngle,
        endAngle: curAngle + angle + paddingAngle,
      };
      stepData.push(latest);
      curAngle = latest.endAngle;
    } else {
      // added
      const deltaAngle = interpolate(
        0,
        item.next.endAngle - item.next.startAngle,
        animationElapsedTime,
      );
      const latest = {
        ...item.next,
        startAngle: curAngle + paddingAngle,
        endAngle: curAngle + deltaAngle + paddingAngle,
      };
      stepData.push(latest);
      curAngle = latest.endAngle;
    }
  });
  return stepData;
};

export interface PieProps<DataPointType = Record<string, unknown>, DataValueType = unknown> {
  cx?: number | string;
  cy?: number | string;
  startAngle?: number;
  endAngle?: number;
  paddingAngle?: number;
  innerRadius?: number | string;
  outerRadius?: number | string | ((element: unknown) => number | string);
  cornerRadius?: number | string;
  data?: ChartData;
  dataKey?: DataKey<DataPointType, DataValueType>;
  nameKey?: DataKey<DataPointType>;
  name?: string | number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number | string;
  legendType?: LegendType;
  tooltipType?: TooltipType;
  /** Formats this Pie's tooltip value; takes precedence over the Tooltip-level `formatter`. */
  formatter?: Formatter;
  minAngle?: number;
  maxRadius?: number;
  hide?: boolean;
  /**
   * Custom sector shape (function form): called per slice with its computed
   * geometry + payload, its return replaces the default <Sector>. (recharts also
   * accepts an element / activeShape — those forms are deferred, see header.)
   */
  shape?: ActiveShape<PieSectorShapeProps, SVGPathElement>;
  /**
   * The shape rendered for the ACTIVE sector (hover/touch/keyboard). Object form
   * merges its fields onto the sector; function form is called with the sector
   * props; boolean true uses the default Sector with the `recharts-active-shape`
   * class. (Element form is N/A by design — Solid has no cloneElement.)
   */
  activeShape?: ActiveShape<PieSectorShapeProps, SVGPathElement>;
  /** The shape rendered for INACTIVE sectors when there is an active sector. */
  inactiveShape?: ActiveShape<PieSectorShapeProps, SVGPathElement>;
  /** Renders one label per sector (see {@link PieLabel}). */
  label?: PieLabel;
  /** Draws a connector line from each sector to its label (see {@link PieLabelLine}). */
  labelLine?: PieLabelLine;
  rootTabIndex?: number;
  onAnimationStart?: () => void;
  onAnimationEnd?: () => void;
  /** Per-sector pointer/touch handlers, called `(sector, index, event)`. */
  onClick?: (data: PieSectorDataItem, index: number, event: MouseEvent) => void;
  onMouseDown?: (data: PieSectorDataItem, index: number, event: MouseEvent) => void;
  onMouseUp?: (data: PieSectorDataItem, index: number, event: MouseEvent) => void;
  onMouseMove?: (data: PieSectorDataItem, index: number, event: MouseEvent) => void;
  onMouseOver?: (data: PieSectorDataItem, index: number, event: MouseEvent) => void;
  onMouseOut?: (data: PieSectorDataItem, index: number, event: MouseEvent) => void;
  onMouseEnter?: (data: PieSectorDataItem, index: number, event: MouseEvent) => void;
  onMouseLeave?: (data: PieSectorDataItem, index: number, event: MouseEvent) => void;
  onTouchStart?: (data: PieSectorDataItem, index: number, event: TouchEvent) => void;
  onTouchMove?: (data: PieSectorDataItem, index: number, event: TouchEvent) => void;
  onTouchEnd?: (data: PieSectorDataItem, index: number, event: TouchEvent) => void;
  isAnimationActive?: boolean | "auto";
  animationBegin?: number;
  animationDuration?: AnimationDuration;
  animationEasing?: EasingInput;
  /** Custom per-frame interpolation for the pie sectors (v3.9). */
  animationInterpolateFn?: AnimationInterpolateFn<PieSectorDataItem, PolarLayout>;
  /** How prev/next sectors are matched across data updates (v3.9). @defaultValue matchAppend */
  animationMatchBy?: AnimationMatchByProp<PieSectorDataItem>;
  /**
   * Z-Index of this component and its children; the higher, the more on top.
   * @defaultValue 100 (DefaultZIndexes.area)
   */
  zIndex?: number;
  id?: string;
  class?: string;
  angleAxisId?: GraphicalItemId | number;
  radiusAxisId?: GraphicalItemId | number;
  /** <Cell> children supplying per-slice fill/stroke/class overrides. */
  children?: JSX.Element;
}

const getTextAnchor = (x: number, cx: number): string => {
  if (x > cx) {
    return "start";
  }
  if (x < cx) {
    return "end";
  }
  return "middle";
};

/** Class string from a label/labelLine object option (`{ className }` or `{ class }`). */
const getClassFromOption = (option: unknown): string | undefined => {
  if (typeof option === "object" && option != null) {
    const rec: Record<string, unknown> = { ...option };
    if (typeof rec.className === "string") {
      return rec.className;
    }
    if (typeof rec.class === "string") {
      return rec.class;
    }
  }
  return undefined;
};

/** Renders the connector line for one label (element / function / object / default Curve). */
function renderLabelLineItem(
  option: PieLabelLine,
  lineProps: {
    points: ReadonlyArray<Coordinate>;
    stroke: string | undefined;
    [k: string]: unknown;
  },
): JSX.Element {
  if (typeof option === "function") {
    return option(lineProps);
  }
  const cls = ["recharts-pie-label-line", getClassFromOption(option)]
    .filter((c): c is string => Boolean(c))
    .join(" ");
  // The connector is a straight 2-point line; render a plain <path> (recharts uses
  // a linear <Curve>, but Curve reads chart-layout context which would trip a
  // STRICT_READ inside the label <For>).
  const [p0, p1] = lineProps.points;
  const d = p0 != null && p1 != null ? `M${p0.x},${p0.y}L${p1.x},${p1.y}` : "";
  return <path class={cls} fill="none" stroke={lineProps.stroke} d={d} />;
}

const isTextAnchor = (v: string): v is "start" | "middle" | "end" | "inherit" =>
  v === "start" || v === "middle" || v === "end" || v === "inherit";

/** The object-form props of a label/labelLine option (`{}` for boolean/function). */
const optionProps = (option: unknown): Record<string, unknown> =>
  typeof option === "object" && option != null ? { ...option } : {};

/** Numeric `offsetRadius` from an object-form label option, else the default 20. */
const getOffsetRadius = (option: unknown): number => {
  const props = optionProps(option);
  return typeof props.offsetRadius === "number" ? props.offsetRadius : 20;
};

/** Renders one label (function/element/object/default Text). */
function renderLabelItem(
  option: PieLabel,
  labelProps: PieLabelRenderProps,
  value: unknown,
): JSX.Element {
  let label: unknown = value;
  if (typeof option === "function") {
    const rendered = option(labelProps);
    // A function returning an element renders that element directly.
    if (rendered != null && typeof rendered === "object") {
      return rendered;
    }
    label = rendered;
  }
  const cls = ["recharts-pie-label-text", getClassFromOption(option)]
    .filter((c): c is string => Boolean(c))
    .join(" ");
  const text = typeof label === "string" || typeof label === "number" ? label : undefined;
  const fill = typeof labelProps.fill === "string" ? labelProps.fill : undefined;
  const textAnchor = isTextAnchor(labelProps.textAnchor) ? labelProps.textAnchor : "middle";
  return (
    <Text
      x={labelProps.x}
      y={labelProps.y}
      stroke="none"
      fill={fill}
      textAnchor={textAnchor}
      verticalAnchor="middle"
      class={cls}
    >
      {text}
    </Text>
  );
}

export const pieDefaultProps = {
  animationBegin: 400,
  animationDuration: 1500,
  animationEasing: "ease",
  animationInterpolateFn: defaultPieAnimateItems,
  animationMatchBy: matchAppend,
  isAnimationActive: "auto",
  cx: "50%",
  cy: "50%",
  dataKey: "value",
  endAngle: 360,
  fill: "#808080",
  hide: false,
  innerRadius: 0,
  legendType: "rect",
  minAngle: 0,
  nameKey: "name",
  outerRadius: "80%",
  paddingAngle: 0,
  startAngle: 0,
  stroke: "#fff",
  zIndex: DefaultZIndexes.area,
} as const satisfies Partial<PieProps>;

export function Pie<DataPointType = Record<string, unknown>, DataValueType = unknown>(
  props: PieProps<DataPointType, DataValueType>,
): JSX.Element {
  const store = useAppStore();
  const merged = merge(pieDefaultProps, props);
  const id = useUniqueId("recharts-pie", () => props.id);

  if (store != null) {
    registerInStore<PieSettings>(
      () => ({
        id,
        type: "pie",
        data: merged.data,
        dataKey: merged.dataKey,
        hide: merged.hide,
        angleAxisId: merged.angleAxisId ?? 0,
        radiusAxisId: merged.radiusAxisId ?? 0,
        name: merged.name,
        nameKey: merged.nameKey,
        tooltipType: merged.tooltipType,
        legendType: merged.legendType,
        fill: merged.fill,
        stroke: merged.stroke,
        cx: merged.cx,
        cy: merged.cy,
        startAngle: merged.startAngle,
        endAngle: merged.endAngle,
        paddingAngle: merged.paddingAngle,
        minAngle: merged.minAngle,
        innerRadius: merged.innerRadius,
        outerRadius: merged.outerRadius,
        cornerRadius: merged.cornerRadius,
        maxRadius: merged.maxRadius,
      }),
      {
        add: (next) => store.actions.graphicalItems.addPolarGraphicalItem(next),
        replace: (prev, next) =>
          store.actions.graphicalItems.replacePolarGraphicalItem({ prev, next }),
        remove: (prev) => store.actions.graphicalItems.removePolarGraphicalItem(prev),
      },
    );
  }

  // Per-slice <Cell> overrides (collected from children, in data order).
  const cells = collectCells(() => props.children);
  const sectors = useAppSelector((state) => selectPieSectors(state, id, cells()));

  // Layer takes a single class string (user-class forwarding parity with clsx).
  const layerClass = (): string =>
    ["recharts-pie", merged.class].filter((c): c is string => Boolean(c)).join(" ");

  // Item-type tooltip: one payload per sector, positioned at the sector's middle.
  const tooltipConfig = createMemo<TooltipPayloadConfiguration>(() => ({
    dataDefinedOnItem: sectors()?.map((s) => s.tooltipPayload),
    getPosition: (index) => sectors()?.[Number(index)]?.tooltipPosition,
    settings: {
      stroke: merged.stroke,
      strokeWidth: merged.strokeWidth,
      fill: merged.fill,
      dataKey: merged.dataKey,
      nameKey: merged.nameKey,
      name: getTooltipNameProp(merged.name, merged.dataKey),
      hide: merged.hide,
      type: merged.tooltipType,
      color: merged.fill,
      unit: "",
      formatter: merged.formatter,
      graphicalItemId: id,
    },
  }));

  // Legend: one entry per displayed-data row (selectPieLegend) — independent of
  // the sectors, so it still renders when every value is zero (sum<=0 → no sectors).
  const legendPayload = useAppSelector((state) => selectPieLegend(state, id, cells()) ?? []);

  // Active-sector tracking (hover/touch/keyboard) drives activeShape/inactiveShape.
  const activeIndex = useAppSelector(selectActiveTooltipIndex);
  const activeDataKey = useAppSelector(selectActiveTooltipDataKey);
  const activeGraphicalItemId = useAppSelector(selectActiveTooltipGraphicalItemId);

  // Per-sector item-hover dispatch, chained with the user handlers (data, index, event).
  // Getter args: the hooks read handler/dataKey at event time (fresh, never stale).
  const onItemEnter = useMouseEnterItemDispatch<PieSectorDataItem>(
    () => props.onMouseEnter,
    () => merged.dataKey,
    id,
  );
  const onItemLeave = useMouseLeaveItemDispatch<PieSectorDataItem>(() => props.onMouseLeave);
  const onItemClick = useMouseClickItemDispatch<PieSectorDataItem>(
    () => props.onClick,
    () => merged.dataKey,
    id,
  );

  // Plain per-sector handlers (no tooltip dispatch) forwarded to the wrapping Layer.
  const fwdMouse =
    (
      handler: ((data: PieSectorDataItem, index: number, e: MouseEvent) => void) | undefined,
      entry: PieSectorDataItem,
      index: number,
    ) =>
    (event: MouseEvent): void =>
      handler?.(entry, index, event);
  const fwdTouch =
    (
      handler: ((data: PieSectorDataItem, index: number, e: TouchEvent) => void) | undefined,
      entry: PieSectorDataItem,
      index: number,
    ) =>
    (event: TouchEvent): void =>
      handler?.(entry, index, event);

  // Enter / re-animation: the sectors grow from their start angle, driven by the
  // new v3.9 engine via <AnimatedItems>. `previousSectorsRef` holds the latest
  // visible frame so a re-animation (data change) tweens from where the sectors
  // currently are; it is managed by AnimatedItems via useAnimationStartSnapshot.
  // Pie is POLAR — the AnimatedItems LayoutType is PolarLayout ("centric" for a
  // PieChart). At isAnimationActive=false the engine jumps to t=1 →
  // defaultPieAnimateItems(_, 1) === the byte-identical final frame.
  const previousSectorsRef: MutableRef<ReadonlyArray<PieSectorDataItem> | null | undefined> = {
    current: null,
  };
  // recharts parity (Pie.tsx PieImpl: `if (hide || sectors == null) previousSectorsRef.current
  // = null`): while hidden or without sectors, drop the previous-frame snapshot so a Pie that
  // re-appears re-runs the ENTER animation from a collapsed state instead of resuming the
  // tween from the last visible (mid-progress) frame. Plain-ref write (no reactive graph).
  createEffect(
    () => merged.hide || sectors() == null,
    (shouldReset) => {
      if (shouldReset) {
        previousSectorsRef.current = null;
      }
    },
  );
  const polarLayout = usePolarChartLayout();

  // Tracks animation in-progress (gates the labels). ownedWrite: handleAnimationEnd
  // can fire from the driver's effect-cleanup when a mid-animation chart is disposed
  // (route/soft navigation) — a legal teardown write.
  const { isAnimating, handleAnimationStart, handleAnimationEnd } = useAnimationCallbacks(
    () => props.onAnimationStart?.(),
    () => props.onAnimationEnd?.(),
  );

  const rootTabIndex = (): number => merged.rootTabIndex ?? 0;

  const isSectorActive = (index: number): boolean => {
    const ai = activeIndex();
    return (
      String(index) === ai &&
      (activeDataKey() == null || merged.dataKey === activeDataKey()) &&
      (activeGraphicalItemId() == null || activeGraphicalItemId() === id)
    );
  };

  const showLabels = (): boolean => !isAnimating();

  const renderLabels = (secs: ReadonlyArray<PieSectorDataItem>): JSX.Element => {
    // Capture reactive props ONCE here (this fn runs inside a tracking scope);
    // the <For> child below must not read reactive values directly (STRICT_READ).
    const label = merged.label;
    if (!label) {
      return null;
    }
    const labelLine = merged.labelLine ?? true;
    const offsetRadius = getOffsetRadius(label);
    // Recharts builds the labels with a plain `.map` over the (static) sectors —
    // do the same here (no <For>): each entry is a plain object cloned from the
    // sector, so the rendered <Text>/<path> read only plain values.
    const labels = secs.map((src, i) => {
      const entry = { ...src };
      const midAngle = (entry.startAngle + entry.endAngle) / 2;
      const endPoint = polarToCartesian(
        entry.cx,
        entry.cy,
        entry.outerRadius + offsetRadius,
        midAngle,
      );
      const labelProps: PieLabelRenderProps = {
        ...entry,
        stroke: "none",
        ...(typeof label !== "function" ? optionProps(label) : {}),
        index: i,
        textAnchor: getTextAnchor(endPoint.x, entry.cx),
        x: endPoint.x,
        y: endPoint.y,
      };
      const lineProps = {
        stroke: entry.fill,
        ...(typeof labelLine !== "function" ? optionProps(labelLine) : {}),
        points: [polarToCartesian(entry.cx, entry.cy, entry.outerRadius, midAngle), endPoint],
      };
      return (
        <Layer>
          {labelLine ? renderLabelLineItem(labelLine, lineProps) : null}
          {/* The fallback label text (when `label` is `true`) is the slice value. */}
          {renderLabelItem(label, labelProps, entry.value)}
        </Layer>
      );
    });
    return <Layer class="recharts-pie-labels">{labels}</Layer>;
  };

  // recharts always renders the root <Layer class="recharts-pie"> (with rootTabIndex)
  // even when hidden / empty; only the sectors live behind the data gate. When there
  // ARE sectors, recharts wraps that root Layer in <ZIndexLayer> (default 100) so a
  // `zIndex` prop relayers the whole pie into its portal. Following Bar's template,
  // the ZIndexLayer lives INSIDE the gate <Show> (never wrapping it) so an empty/
  // hidden pie mounts NO portal — the `fallback` renders the inline empty root Layer.
  return (
    <>
      <SetTooltipEntrySettings tooltipEntrySettings={tooltipConfig()} />
      <SetLegendPayload id={id} legendPayload={legendPayload() ?? []} />
      <Show
        when={!merged.hide && polarLayout() ? sectors() : undefined}
        fallback={
          <Layer tabIndex={rootTabIndex()} class={layerClass()}>
            {props.children}
          </Layer>
        }
      >
        {(secs) => (
          <ZIndexLayer zIndex={merged.zIndex}>
            <Layer tabIndex={rootTabIndex()} class={layerClass()}>
              <AnimatedItems
                animationInput={secs()}
                animationIdPrefix="recharts-pie-"
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
                  <Layer>
                    <For each={frame}>
                      {(entry, i) => {
                        // recharts skips fully-collapsed sectors (start === end
                        // === 0) unless it is the only one — the first entrance
                        // frame renders no sectors at all (reference Pie L722).
                        if (entry.startAngle === 0 && entry.endAngle === 0 && frame.length !== 1) {
                          return null;
                        }
                        const isActive = (): boolean => isSectorActive(i());
                        const hasActive = (): boolean => {
                          const ai = activeIndex();
                          return ai != null && ai !== "";
                        };
                        const sectorOption = ():
                          | ActiveShape<PieSectorShapeProps, SVGPathElement>
                          | undefined => {
                          if (isActive()) {
                            return merged.activeShape;
                          }
                          if (hasActive()) {
                            return merged.inactiveShape;
                          }
                          return undefined;
                        };
                        const shapeProps = (): PieSectorShapeProps => ({
                          ...entry,
                          // Entry-level (data row / <Cell>) strokeWidth wins over
                          // the component prop, mirroring the reference's
                          // presentationProps-then-entry spread order.
                          strokeWidth: entry.strokeWidth ?? merged.strokeWidth,
                          cornerRadius: entry.cornerRadius ?? 0,
                          index: i(),
                          isActive: isActive(),
                          tabIndex: -1,
                          // v3.9 ShapeAnimationProps forwarded into the function-form
                          // shape: the AnimatedItems frame's elapsed-time + entrance
                          // flag, and isAnimating combined per upstream (still true
                          // until the settled t=1 frame).
                          animationElapsedTime,
                          isAnimating: isAnimating() || animationElapsedTime < 1,
                          isEntrance,
                          [DATA_ITEM_INDEX_ATTRIBUTE_NAME]: i(),
                          [DATA_ITEM_GRAPHICAL_ITEM_ID_ATTRIBUTE_NAME]: id,
                        });
                        return (
                          <Layer
                            tabIndex={-1}
                            class="recharts-pie-sector"
                            onMouseEnter={onItemEnter(entry, i())}
                            onMouseLeave={onItemLeave(entry, i())}
                            onClick={onItemClick(entry, i())}
                            onMouseDown={fwdMouse(props.onMouseDown, entry, i())}
                            onMouseUp={fwdMouse(props.onMouseUp, entry, i())}
                            onMouseMove={fwdMouse(props.onMouseMove, entry, i())}
                            onMouseOver={fwdMouse(props.onMouseOver, entry, i())}
                            onMouseOut={fwdMouse(props.onMouseOut, entry, i())}
                            onTouchStart={fwdTouch(props.onTouchStart, entry, i())}
                            onTouchMove={fwdTouch(props.onTouchMove, entry, i())}
                            onTouchEnd={fwdTouch(props.onTouchEnd, entry, i())}
                          >
                            <Shape<PieSectorShapeProps, SVGPathElement>
                              option={sectorOption() ?? merged.shape}
                              DefaultShape={Sector}
                              shapeProps={shapeProps()}
                            />
                          </Layer>
                        );
                      }}
                    </For>
                  </Layer>
                )}
              </AnimatedItems>
              <Show when={showLabels()}>{renderLabels(untrack(secs))}</Show>
              {props.children}
            </Layer>
          </ZIndexLayer>
        )}
      </Show>
    </>
  );
}
