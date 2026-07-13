import type { JSX } from "@solidjs/web";
import type { Element } from "solid-js";
import type * as d3Scales from "d3-scale";
import type { DotProps } from "../shape/Dot";
import type { ExternalMouseEvents } from "../chart/types";

// Minimal seed of recharts 3.8.1 src/util/types.ts (commit 7a23854).
//
// The reference `util/types` is a ~1400-line barrel that imports half the
// codebase (Area, Label, Text, axisSelectors, d3-scale, the public index). We do
// NOT port it whole — only the geometry/value types the currently-ported units
// reference, growing this file as later units need more ("declare/stub then
// backfill"). Definitions are copied faithfully; the sole
// deviation is `ChartCoordinate`'s `any` fields → `unknown` (this repo bans
// `any`; the type is `@deprecated` and those fields aren't read structurally by
// current consumers).

export type CartesianLayout = "horizontal" | "vertical";
export type PolarLayout = "centric" | "radial";
/**
 * @deprecated use either `CartesianLayout` or `PolarLayout` instead.
 * Mixing both charts families leads to ambiguity in the type system.
 * These two layouts share very few properties, so it is best to keep them separate.
 */
export type LayoutType = CartesianLayout | PolarLayout;

export type AllowInDimension = {
  x?: boolean;
  y?: boolean;
};

export interface Coordinate {
  x: number;
  y: number;
}

export type RectangleCoordinate = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

export type RectanglePosition = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/**
 * Internal offset used everywhere in the chart layout pipeline.
 * We use it internally but let's not expose it to the outside world.
 */
export type ChartOffsetInternal = {
  top: number;
  bottom: number;
  left: number;
  right: number;
  width: number;
  height: number;
  brushBottom: number;
};

/**
 * @deprecated do not use: too many properties, mixing too many concepts, cartesian and polar together, everything optional.
 * Instead, use either `Coordinate` or `PolarCoordinate`.
 */
export interface ChartCoordinate extends Coordinate {
  xAxis?: unknown;
  yAxis?: unknown;
  width?: unknown;
  height?: unknown;
  offset?: ChartOffsetInternal;
  angle?: number;
  radius?: number;
  cx?: number;
  cy?: number;
  startAngle?: number;
  endAngle?: number;
  innerRadius?: number;
  outerRadius?: number;
}

export type PolarCoordinate = Coordinate & {
  angle: number;
  startAngle: number;
  endAngle: number;
  clockWise: boolean;
  cx: number;
  cy: number;
  innerRadius: number;
  outerRadius: number;
  radius: number;
};

export const isPolarCoordinate = (c: Coordinate | PolarCoordinate): c is PolarCoordinate => {
  return "radius" in c && "startAngle" in c && "endAngle" in c;
};

export type Size = { width: number; height: number };

export type Percent = `${number}%`;

export type NonEmptyArray<T> = readonly [T, ...T[]];

export type SymbolType = "circle" | "cross" | "diamond" | "square" | "star" | "triangle" | "wye";

export type AnimationDuration = number;

export interface Margin {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface Padding {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export type StackOffsetType = "sign" | "expand" | "none" | "wiggle" | "silhouette" | "positive";

export interface EventThrottlingProps {
  /** Time interval to throttle events: ms, or 'raf' to use requestAnimationFrame. @defaultValue 'raf' */
  throttleDelay?: number | "raf";
  /** Which events to throttle ('all' for every event; [] for none). @defaultValue ["mousemove","touchmove","pointermove","scroll","wheel"] */
  throttledEvents?: ReadonlyArray<keyof GlobalEventHandlersEventMap> | "all";
}

export type BaseValue = number | "dataMin" | "dataMax";

export type TooltipEventType = "axis" | "item";

export type TooltipType = "none";

export type ChartStyle = Omit<JSX.CSSProperties, "height" | "width"> & {
  width?: number | string;
  height?: number | string;
};

export type LegendType =
  | "circle"
  | "cross"
  | "diamond"
  | "line"
  | "plainline"
  | "rect"
  | "square"
  | "star"
  | "triangle"
  | "wye"
  | "none";

/**
 * Seeded subset of recharts' (much larger, generic) CartesianChartProps — the
 * props the chart-container scaffold currently reads. `className` → `class`
 * (the sanctioned deviation). Grows as the chart surface expands.
 */
export interface CartesianChartProps<DataPointType = unknown> extends ExternalMouseEvents {
  width?: number | Percent;
  height?: number | Percent;
  data?: ReadonlyArray<DataPointType>;
  margin?: Partial<Margin>;
  layout?: LayoutType;
  responsive?: boolean;
  compact?: boolean;
  title?: string;
  desc?: string;
  class?: string;
  style?: ChartStyle;
  cursor?: string;
  id?: string;
  /** ARIA role applied to the chart `<svg>` (overrides the accessibilityLayer default). */
  role?: string;
  /** tabindex applied to the chart `<svg>` (overrides the accessibilityLayer default). */
  tabIndex?: number;
  /** A chart-level dataKey (used by some charts as the implicit series key). */
  dataKey?: DataKey<DataPointType>;
  children?: JSX.Element;
  // Reported into rootProps (UpdatableChartOptions):
  accessibilityLayer?: boolean;
  barCategoryGap?: number | string;
  barGap?: number | string;
  barSize?: number | string;
  maxBarSize?: number;
  stackOffset?: StackOffsetType;
  syncId?: number | string;
  syncMethod?: SyncMethod;
  baseValue?: BaseValue;
  reverseStackOrder?: boolean;
  // Reported into eventSettings:
  throttleDelay?: number | "raf";
  throttledEvents?: ReadonlyArray<keyof GlobalEventHandlersEventMap> | "all";
}

/**
 * Seeded subset of recharts' PolarChartProps (util/types.ts:1637) — the props
 * the polar chart-container scaffold currently reads. Mirrors CartesianChartProps
 * but `layout` is `PolarLayout` and adds the polar geometry props
 * (cx/cy/innerRadius/outerRadius/startAngle/endAngle). `className` → `class`.
 * Grows as the polar surface expands.
 */
export interface PolarChartProps<DataPointType = unknown> extends ExternalMouseEvents {
  width?: number | Percent;
  height?: number | Percent;
  data?: ReadonlyArray<DataPointType>;
  margin?: Partial<Margin>;
  layout?: PolarLayout;
  responsive?: boolean;
  compact?: boolean;
  title?: string;
  desc?: string;
  class?: string;
  style?: ChartStyle;
  cursor?: string;
  id?: string;
  /** ARIA role applied to the chart `<svg>` (overrides the accessibilityLayer default). */
  role?: string;
  /** tabindex applied to the chart `<svg>` (overrides the accessibilityLayer default). */
  tabIndex?: number;
  /** A chart-level dataKey (used by some charts as the implicit series key). */
  dataKey?: DataKey<DataPointType>;
  children?: JSX.Element;
  // Polar geometry (reported into polarOptions):
  cx?: number | string;
  cy?: number | string;
  startAngle?: number;
  endAngle?: number;
  innerRadius?: number | string;
  outerRadius?: number | string;
  // Reported into rootProps (UpdatableChartOptions):
  accessibilityLayer?: boolean;
  barCategoryGap?: number | string;
  barGap?: number | string;
  barSize?: number | string;
  maxBarSize?: number;
  stackOffset?: StackOffsetType;
  syncId?: number | string;
  syncMethod?: SyncMethod;
  reverseStackOrder?: boolean;
  // Reported into eventSettings:
  throttleDelay?: number | "raf";
  throttledEvents?: ReadonlyArray<keyof GlobalEventHandlersEventMap> | "all";
}

// SyncMethod's canonical definition now lives in synchronisation/types (ported);
// import it for local use (CartesianChartProps) and re-export so existing
// consumers keep importing it from util/types. Type-only cyclic import
// (synchronisation/types imports geometry types back from here) — erased at runtime.
import type { SyncMethod } from "../synchronisation/types";
export type { SyncMethod };

// Re-export from its canonical home (animation/easing) so consumers can import it
// from util/types, as the reference does.
export type { EasingInput } from "../animation/easing";

/**
 * @inline
 */
export interface CartesianViewBox {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

interface PolarViewBox {
  cx?: number;
  cy?: number;
  innerRadius?: number;
  outerRadius?: number;
  startAngle?: number;
  endAngle?: number;
  clockWise?: boolean;
}

export type CartesianViewBoxRequired = Required<CartesianViewBox>;

export type PolarViewBoxRequired = Required<PolarViewBox>;

/**
 * A box shaped like a trapezoid (used by Funnel and by Label positioning). The
 * upper and lower sides can have different widths; `width` is the larger of the
 * two. Ported from recharts util/types.
 */
export type TrapezoidViewBox = {
  /** The x-coordinate of the upper-left corner of the trapezoid. */
  x: number;
  /** The y-coordinate of the upper side of the trapezoid. */
  y: number;
  /** The width of the upper side. */
  upperWidth: number;
  /** The width of the lower side. */
  lowerWidth: number;
  /** The overall width: `Math.max(upperWidth, lowerWidth)`. */
  width: number;
  /** The height of the trapezoid. */
  height: number;
};

/**
 * @inline
 */
export type ViewBox = CartesianViewBoxRequired | PolarViewBoxRequired;

export interface TickItem {
  value: unknown;
  coordinate: number;
  index: number;
  /**
   * How far this tick is offset from the start of a category band.
   * On axes that do not have bands, this will always be zero.
   *
   * We never read offset internally in Recharts,
   * but it has been part of the external API so let's keep it here for people who do use it.
   */
  offset?: number;
}

export interface CartesianTickItem extends TickItem {
  tickCoord?: number;
  tickSize?: number;
  isShow?: boolean;
}

export interface GeometrySector {
  cx: number;
  cy: number;
  innerRadius: number;
  outerRadius: number;
  startAngle: number;
  endAngle: number;
}

export type GeometrySectorWithCornerRadius = GeometrySector & {
  cornerRadius: number;
  forceCornerRadius: boolean;
  cornerIsExternal: boolean;
};

export type RangeObj = PolarViewBoxRequired & {
  angle: number;
  radius: number;
};

type HTMLElementTarget = Pick<
  HTMLElement,
  "getBoundingClientRect" | "offsetWidth" | "offsetHeight"
>;
type SVGElementTarget = Pick<SVGGraphicsElement, "getBoundingClientRect" | "getBBox">;

/**
 * Simplified version of the MouseEvent so that we don't have to mock the whole thing in tests.
 * This is meant to represent the React.MouseEvent.
 */
export interface HTMLMousePointer {
  clientX: number;
  clientY: number;
  currentTarget: HTMLElementTarget;
}

export interface HTMLTouchPointer {
  touches: ArrayLike<Pick<Touch, "clientX" | "clientY">>;
  currentTarget: HTMLElementTarget;
}

/**
 * Simplified version of the MouseEvent for SVG elements.
 * SVG elements use getBBox() to get the intrinsic size instead of offsetWidth/offsetHeight.
 */
export interface SVGMousePointer {
  clientX: number;
  clientY: number;
  currentTarget: SVGElementTarget;
}

export interface SVGTouchPointer {
  touches: ArrayLike<Pick<Touch, "clientX" | "clientY">>;
  currentTarget: SVGElementTarget;
}

/**
 * Recharts accepts mouse events from both HTML and SVG elements.
 */
export type MousePointer = HTMLMousePointer | SVGMousePointer;
export type TouchPointer = HTMLTouchPointer | SVGTouchPointer;

/**
 * Coordinates relative to the top-left corner of the active element.
 * Also include scale which means that element that's scaled will return the same coordinates as element that's not scaled.
 */
export interface RelativePointer {
  relativeX: number;
  relativeY: number;
}

export interface NullableCoordinate {
  x: number | null;
  y: number | null;
}

export type CategoricalDomainItem = number | string | Date;

export type CategoricalDomain = ReadonlyArray<CategoricalDomainItem>;

/**
 * NumberDomain is an evaluated {@link AxisDomain}.
 * Unlike {@link AxisDomain}, it has no variety - it's a tuple of two number.
 * This is after all the keywords and functions were evaluated and what is left is [min, max].
 *
 * Know that the min, max values are not guaranteed to be nice numbers - values like -Infinity or NaN are possible.
 *
 * There are also `category` axes that have different things than numbers in their domain.
 */
export type NumberDomain = readonly [min: number, max: number];

export type AxisDomainItem =
  // `string & {}` keeps the literal suggestions ("auto"/…) visible in autocomplete
  // without them being redundant constituents of a bare `string`.
  (string & {}) | number | ((d: number) => string | number) | "auto" | "dataMin" | "dataMax";

/**
 * The domain of axis.
 * This is the definition
 *
 * Numeric domain is always defined by an array of exactly two values, for the min and the max of the axis.
 * Categorical domain is defined as array of all possible values.
 *
 * Can be specified in many ways:
 * - array of numbers
 * - with special strings like 'dataMin' and 'dataMax'
 * - with special string math like 'dataMin - 100'
 * - with keyword 'auto'
 * - or a function
 * - array of functions
 * - or a combination of the above
 */
export type AxisDomain =
  | ReadonlyArray<string>
  | ReadonlyArray<number>
  | Readonly<[AxisDomainItem, AxisDomainItem]>
  | (([dataMin, dataMax]: NumberDomain, allowDataOverflow: boolean) => NumberDomain);

type DataKeyFunction<DataPointType, DataValueType> = {
  bivarianceHack(obj: DataPointType): DataValueType;
}["bivarianceHack"];

/**
 * Extracts values from data objects — ported from recharts' `TypedDataKey`
 * (util/typedDataKey.ts). Simplifies to: a `string`/`number` key of the data
 * point, or a function `(obj) => value`. The conditional preserves key
 * autocomplete for strongly-typed rows.
 *
 * Deviation from recharts: `DataPointType` defaults to `unknown` (recharts uses
 * `any`, which this repo bans). When the row type is `unknown` the conditional
 * collapses to the loose `string | number | ((obj: unknown) => DataValueType)`
 * form — identical behavior, no `any`. The single place the user's row-typed
 * dataKey is erased to `DataKey<unknown>` (graphical-item registration) is the
 * sanctioned loosening point per AGENTS.md.
 */
export type TypedDataKey<
  DataPointType = unknown,
  DataValueType = unknown,
> = unknown extends DataPointType
  ? string | number | DataKeyFunction<DataPointType, DataValueType>
  : string extends keyof DataPointType
    ? string | number | DataKeyFunction<DataPointType, DataValueType>
    :
        | {
            [K in keyof DataPointType]: DataPointType[K] extends DataValueType
              ? K extends string | number
                ? K
                : never
              : never;
          }[keyof DataPointType]
        | (DataPointType extends ReadonlyArray<infer E>
            ? E extends DataValueType
              ? `${number}`
              : never
            : never)
        | DataKeyFunction<DataPointType, DataValueType>;

export type DataKey<DataPointType = unknown, DataValueType = unknown> = TypedDataKey<
  DataPointType,
  DataValueType
>;

// ---------------------------------------------------------------------------
// Axis foundation types (grown from recharts 3.8.1 util/types.ts as the axis
// vertical lands). Copied faithfully; deviations noted inline.
// ---------------------------------------------------------------------------

export type AxisType = "xAxis" | "yAxis" | "zAxis" | "angleAxis" | "radiusAxis";

/**
 * External axis type from props — evaluated to `'number'` | `'category'`
 * internally based on the chart layout before it reaches the store.
 */
export type AxisDomainTypeInput = "number" | "category" | "auto";

/**
 * Individual axes resolve the `'auto'` type to either `'number'` or `'category'`
 * (based on chart layout and axis kind) before storing it.
 */
export type EvaluatedAxisDomainType = "number" | "category";

export type RechartsScaleType =
  | "linear"
  | "pow"
  | "sqrt"
  | "log"
  | "symlog"
  | "identity"
  | "time"
  | "band"
  | "point"
  | "ordinal"
  | "quantile"
  | "quantize"
  | "utc"
  | "sequential"
  | "threshold";

/**
 * Extracts values from data objects. Users may instead provide a custom scale
 * function (see {@link CustomScaleDefinition}).
 */
export type ScaleType = "auto" | RechartsScaleType;

/**
 * The `scaleXxx` factory names exported by d3-scale (e.g. `scaleLinear`,
 * `scaleBand`). Derived from the d3-scale module so it always matches what is
 * actually available at runtime.
 */
export type D3ScaleType = Extract<keyof typeof d3Scales, `scale${string}`>;

/**
 * `tick` controls how an axis tick is rendered. recharts' type is
 * `TextProps | ReactElement | ((props: T) => ReactNode) | boolean`; the Solid
 * mapping is:
 * - `ReactElement` (a passed element) → {@link JSX.Element} (`@solidjs/web`).
 * - `((props: T) => ReactNode)` (render function) → `(props: T) => Element`
 *   ({@link Element} from `solid-js` is the renderer-neutral `ReactNode` analog).
 * - `boolean` (toggle the default tick): NOT a separate member here, because in
 *   Solid the renderable `Element`/`JSX.Element` union already subsumes `boolean`
 *   (`tick={true}`/`tick={false}` still typecheck). Listing it would be a
 *   redundant constituent.
 * - `TextProps` (props for the default `<Text>` tick): deferred until `<Text>`
 *   is ported — it joins this union then. (Not approximated with a loose object
 *   bag, which would wrongly accept arbitrary objects.)
 */
export type TickProp<T> = JSX.Element | ((props: T) => Element);

/**
 * The props a CartesianAxis passes to a function-form `tick` renderer
 * (`tick={(props) => <text .../>}`). Mirrors recharts' XAxis/YAxisTickContentProps.
 * Anchor/orientation literals are inlined to keep this in the low-level types module
 * (no import cycle with component/Text or cartesianAxisSlice).
 */
export interface CartesianTickContentProps {
  x: number;
  y: number;
  payload: {
    coordinate: number;
    value: unknown;
    index: number;
    offset?: number;
    tickCoord?: number;
    isShow?: boolean;
  };
  index: number;
  visibleTicksCount: number;
  class: string;
  fill: string;
  stroke: string;
  textAnchor: "start" | "middle" | "end" | "inherit";
  verticalAnchor: "start" | "middle" | "end";
  orientation: "top" | "bottom" | "left" | "right";
  height: number;
  width: number;
  padding: { top?: number; bottom?: number; left?: number; right?: number } | string;
  name: string | undefined;
  tickFormatter: ((value: unknown, index: number) => string) | undefined;
  angle: number;
}

/**
 * recharts parity names: upstream splits the tick-content props into a base type
 * plus X/Y variants that narrow `orientation`/`padding`. The port keeps ONE merged
 * {@link CartesianTickContentProps}; these aliases re-expose the upstream names
 * (with the X/Y orientation narrowing) for migration-friendly imports.
 */
export type BaseTickContentProps = Omit<CartesianTickContentProps, "orientation" | "padding">;

/** recharts parity name — {@link CartesianTickContentProps} narrowed to an X axis. */
export type XAxisTickContentProps = BaseTickContentProps & {
  orientation: "top" | "bottom";
  padding: CartesianTickContentProps["padding"];
};

/** recharts parity name — {@link CartesianTickContentProps} narrowed to a Y axis. */
export type YAxisTickContentProps = BaseTickContentProps & {
  orientation: "left" | "right";
  padding: CartesianTickContentProps["padding"];
};

/**
 * Formats a tick value for display. Deviation: recharts homes this in
 * `cartesian/CartesianAxis`; that component is deferred, so the type lives here
 * (its natural util home) and CartesianAxis can re-export it when ported.
 */
export type TickFormatter = (value: unknown, index: number) => string;

/**
 * 'preserveStart' keeps the left tick on collision and ensures the first tick is shown.
 * 'preserveEnd' keeps the right tick on collision and ensures the last tick is shown.
 * 'preserveStartEnd' keeps the left tick on collision and ensures first and last show.
 * 'equidistantPreserveStart' picks an N so every Nth tick shows without collision.
 * 'equidistantPreserveEnd' picks an N so every Nth tick shows, ensuring the last is visible.
 */
export type AxisInterval =
  | number
  | "preserveStart"
  | "preserveEnd"
  | "preserveStartEnd"
  | "equidistantPreserveStart"
  | "equidistantPreserveEnd";

/**
 * Ticks can be any type when the axis is `category`.
 * Ticks must be numbers when the axis is `number`.
 */
export type AxisTick = number | string;

// ---------------------------------------------------------------------------
// Dot / active-dot types (for <Line>/<Scatter>/<Area> dots). Deviations from
// recharts: `any` → `unknown`; `ReactNode` (render-fn return) → {@link Element};
// `ReactElement<SVGProps>` → {@link JSX.Element}; and recharts'
// `SVGPropsNoEvents<Omit<DotProps,…>>` is simplified to `DotProps` (our DotProps
// is already a Solid SVG-attr bag; Solid handles events via delegation).
// ---------------------------------------------------------------------------

export interface DotPoint {
  readonly x: number | null;
  readonly y: number | null;
  readonly value?: unknown;
  readonly payload?: unknown;
}

export type DotItemDotProps = DotProps & {
  points: ReadonlyArray<DotPoint>;
  index: number;
  payload: unknown;
  dataKey: DataKey<unknown> | undefined;
  value: unknown;
};

export type ActiveDotProps = DotProps & {
  payload: unknown;
  index: number;
  dataKey: DataKey<unknown> | undefined;
  cx: number | undefined;
  cy: number | undefined;
  r: number | string | undefined;
  fill: string;
  strokeWidth: number;
  stroke: string;
  value: unknown;
};

// Deviation: recharts also allows a raw `ReactElement<SVGProps>` dot. In Solid a
// custom dot is passed as a render function (the idiom), and `JSX.Element` is the
// broad renderable union (it subsumes `boolean` and muddies narrowing), so the
// raw-element constituent is dropped — `boolean | render-fn | props-object` is
// cleanly discriminable by `typeof`.
export type DotType = boolean | ((props: DotItemDotProps) => Element) | Partial<DotProps>;

/**
 * Animation metadata forwarded to custom chart shapes (v3.9).
 *
 * These props let a shape react to the current animation state without needing
 * to know how its parent chart component computes the animated geometry.
 *
 * @since 3.9
 */
export interface ShapeAnimationProps {
  /**
   * Normalized animation progress time in the approximately `[0, 1]` range.
   * 0 = start of animation, 1 = end of animation. It already includes easing,
   * so a custom Bézier curve may push it slightly out of range.
   */
  animationElapsedTime?: number;
  /**
   * Whether the parent chart element is currently animating.
   */
  isAnimating?: boolean;
  /**
   * Whether the current animation pass is the initial entrance animation.
   * Some components have different "first render" and "data update" animations;
   * this tracks which one is running.
   */
  isEntrance?: boolean;
}

/**
 * A customizable shape prop. Deviation: recharts' first constituent is a
 * `ReactElement` (cloned with injected props) — dropped here (same as DotType),
 * since Solid has no cloneElement; a function (render prop), a partial-props
 * object, or a boolean remain. `ElementType` is kept for signature parity.
 */
export type ActiveShape<
  PropsType = Record<string, unknown>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  ElementType = SVGElement,
> = ((props: PropsType, index?: string | number) => Element) | Partial<PropsType> | boolean;

export type ActiveDotType =
  | boolean
  | ((props: ActiveDotProps) => Element)
  | Partial<ActiveDotProps>;
