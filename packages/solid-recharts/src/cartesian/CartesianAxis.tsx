// Ported from recharts 3.8.1 src/cartesian/CartesianAxis.tsx (commit 7a23854).
//
// Draws the axis line + tick lines + tick labels + the axis `label` (title) via
// CartesianLabelFromLabelProp + a `<Label>` child. Tick parity with recharts:
// `tick` accepts boolean / settings-object (`{ class }`) / function-renderer;
// `x` defaults to 0; `axisType` defaults to "xAxis"; `scale` is accepted-and-ignored
// (recharts dropped it on CartesianAxis in 3.0); `viewBox` is accepted; a user
// `textAnchor` overrides the orientation-derived one. The pure tick geometry helpers
// (getTickLineCoord/getTickTextAnchor/getTickVerticalAnchor) are ported verbatim.
// Deferred (documented): the getTicks interval/minTickGap thinning (all selected ticks
// render — the ticks the selector already produces), ELEMENT-form `tick`/`label`
// (Solid can't React.cloneElement an already-evaluated element to inject computed
// x/y/payload — use the function form instead), ZIndexLayer, RenderedTicksReporter,
// Y-axis auto-width. Solid deviations: forwardRef dropped; React CSSProperties n/a;
// `className`→`class`.
import { createMemo, For, merge, Show } from "solid-js";
import type { JSX } from "@solidjs/web";
import { Layer } from "../container/Layer";
import {
  CartesianLabelContextProvider,
  CartesianLabelFromLabelProp,
  type ImplicitLabelType,
} from "../component/Label";
import { Text, TextAnchor, TextVerticalAnchor } from "../component/Text";
import { isNullish, isNumber } from "../util/DataUtils";
import {
  type CartesianTickContentProps,
  CartesianTickItem,
  type CartesianViewBox,
  Coordinate,
  RectangleCoordinate,
  type TickProp,
} from "../util/types";
import { svgPropertiesNoEvents } from "../util/svgPropertiesNoEvents";
import { XAxisOrientation, YAxisOrientation } from "../state/cartesianAxisSlice";

export type Orientation = XAxisOrientation | YAxisOrientation;

type AxisLabelPadding = { top?: number; bottom?: number; left?: number; right?: number } | string;

function getTickLineCoord(
  data: CartesianTickItem,
  x: number,
  y: number,
  width: number,
  height: number,
  orientation: Orientation,
  tickSize: number,
  mirror: boolean,
  tickMargin: number,
): { line: RectangleCoordinate; tick: Coordinate } {
  let x1, x2, y1, y2, tx, ty;
  const sign = mirror ? -1 : 1;
  const finalTickSize = data.tickSize || tickSize;
  const tickCoord = isNumber(data.tickCoord) ? data.tickCoord : data.coordinate;

  switch (orientation) {
    case "top":
      x1 = x2 = data.coordinate;
      y2 = y + +!mirror * height;
      y1 = y2 - sign * finalTickSize;
      ty = y1 - sign * tickMargin;
      tx = tickCoord;
      break;
    case "left":
      y1 = y2 = data.coordinate;
      x2 = x + +!mirror * width;
      x1 = x2 - sign * finalTickSize;
      tx = x1 - sign * tickMargin;
      ty = tickCoord;
      break;
    case "right":
      y1 = y2 = data.coordinate;
      x2 = x + +mirror * width;
      x1 = x2 + sign * finalTickSize;
      tx = x1 + sign * tickMargin;
      ty = tickCoord;
      break;
    default:
      x1 = x2 = data.coordinate;
      y2 = y + +mirror * height;
      y1 = y2 + sign * finalTickSize;
      ty = y1 + sign * tickMargin;
      tx = tickCoord;
      break;
  }

  return { line: { x1, y1, x2, y2 }, tick: { x: tx, y: ty } };
}

function getTickTextAnchor(orientation: Orientation, mirror: boolean): TextAnchor {
  switch (orientation) {
    case "left":
      return mirror ? "start" : "end";
    case "right":
      return mirror ? "end" : "start";
    default:
      return "middle";
  }
}

function getTickVerticalAnchor(orientation: Orientation, mirror: boolean): TextVerticalAnchor {
  switch (orientation) {
    case "left":
    case "right":
      return "middle";
    case "top":
      return mirror ? "start" : "end";
    default:
      return mirror ? "end" : "start";
  }
}

/**
 * The settings-object form of `tick` (e.g. `tick={{ class: "custom" }}`): extra
 * attributes merged onto the default tick `<Text>`. Solid-idiomatic `class` (recharts'
 * React equivalent is `tick?: boolean | SVGProps | ReactElement | function`).
 */
export type CartesianTickSettings = {
  class?: string;
  fill?: string;
  stroke?: string;
};

export interface CartesianAxisProps {
  /** Which axis this is. @defaultValue "xAxis" */
  axisType?: "xAxis" | "yAxis";
  /** Left offset of the axis box. @defaultValue 0 */
  x?: number;
  y: number;
  width: number;
  height: number;
  orientation?: Orientation;
  ticks: ReadonlyArray<CartesianTickItem>;
  tickSize?: number;
  tickMargin?: number;
  mirror?: boolean;
  stroke?: string;
  axisLine?: boolean;
  tickLine?: boolean;
  // boolean is already covered by TickProp's JSX.Element (Solid's JSX.Element includes
  // boolean); the settings-object form is the only addition over recharts' TickProp.
  tick?: CartesianTickSettings | TickProp<CartesianTickContentProps>;
  tickFormatter?: (value: unknown, index: number) => string;
  /**
   * The recharts viewBox of the chart. Accepted for API parity; the axis title is
   * positioned from the axis box (x/y/width/height) just like recharts.
   */
  viewBox?: CartesianViewBox;
  /**
   * Recharts ignores `scale` on CartesianAxis since 3.0 (it reads ticks directly).
   * Accepted for API parity and ignored.
   */
  scale?: unknown;
  /** Overrides the orientation-derived `text-anchor` on each tick label. */
  textAnchor?: TextAnchor;
  interval?: number | string;
  /** Axis name, forwarded to a function-form tick's props (default undefined). */
  name?: string;
  /** Tick label rotation, forwarded to a function-form tick's props. @defaultValue 0 */
  angle?: number;
  /** Axis padding, forwarded verbatim to a function-form tick's props. */
  padding?: AxisLabelPadding;
  unit?: string | number;
  hide?: boolean;
  class?: string;
  /** Axis title — string/number/object/function/`true`, or a `<Label>` child. */
  label?: ImplicitLabelType;
  children?: JSX.Element;
}

const cartesianAxisDefaults = {
  axisType: "xAxis",
  x: 0,
  orientation: "bottom",
  stroke: "#666",
  tickLine: true,
  axisLine: true,
  tick: true,
  mirror: false,
  tickSize: 6,
  tickMargin: 2,
} as const satisfies Partial<CartesianAxisProps>;

const AxisLine = (props: {
  x: number;
  y: number;
  width: number;
  height: number;
  orientation: Orientation;
  mirror: boolean;
  stroke: string;
}): JSX.Element => {
  const coords = (): RectangleCoordinate => {
    const { x, y, width, height, orientation, mirror } = props;
    if (orientation === "top" || orientation === "bottom") {
      const needHeight = +(
        (orientation === "top" && !mirror) ||
        (orientation === "bottom" && mirror)
      );
      return { x1: x, y1: y + needHeight * height, x2: x + width, y2: y + needHeight * height };
    }
    const needWidth = +((orientation === "left" && !mirror) || (orientation === "right" && mirror));
    return { x1: x + needWidth * width, y1: y, x2: x + needWidth * width, y2: y + height };
  };
  return (
    <line
      class="recharts-cartesian-axis-line"
      x1={coords().x1}
      y1={coords().y1}
      x2={coords().x2}
      y2={coords().y2}
      stroke={props.stroke}
      fill="none"
      // recharts forwards the axis's own svg props (incl. `width`) onto the line via
      // `otherSvgProps`; mirror that with the canonical svg-prop spread (`width` is the
      // attribute consumers read off the line element).
      {...svgPropertiesNoEvents({ width: props.width })}
    />
  );
};

export const CartesianAxis = (props: CartesianAxisProps): JSX.Element => {
  const merged = merge(cartesianAxisDefaults, props);

  // merge() keeps an explicit `stroke={undefined}` (e.g. forwarded from a
  // strokeless <YAxis/>) as undefined; resolve the default at use sites.
  const strokeColor = (): string => merged.stroke ?? cartesianAxisDefaults.stroke;

  const textAnchor = (): TextAnchor => getTickTextAnchor(merged.orientation, merged.mirror);
  // A user-provided `textAnchor` prop overrides the orientation-derived default.
  const resolvedTextAnchor = (): TextAnchor => merged.textAnchor ?? textAnchor();
  const verticalAnchor = (): TextVerticalAnchor =>
    getTickVerticalAnchor(merged.orientation, merged.mirror);

  // The settings-object form of `tick` (e.g. `{ class: "custom" }`): not a
  // function, not a boolean, not an already-rendered element/array.
  const isTickSettings = (t: CartesianAxisProps["tick"]): t is CartesianTickSettings =>
    t != null &&
    typeof t === "object" &&
    !Array.isArray(t) &&
    !(typeof Node !== "undefined" && t instanceof Node);
  const tickSettings = (): CartesianTickSettings | null =>
    isTickSettings(merged.tick) ? merged.tick : null;

  const visibleTicks = createMemo(() => {
    const interval = merged.interval;
    if (typeof interval !== "number" || interval <= 0) {
      return merged.ticks;
    }
    return merged.ticks.filter((_, index) => index % (interval + 1) === 0);
  });

  const tickCoords = createMemo(() =>
    visibleTicks().map((entry, index) => ({
      entry,
      index,
      ...getTickLineCoord(
        entry,
        merged.x,
        merged.y,
        merged.width,
        merged.height,
        merged.orientation,
        merged.tickSize,
        merged.mirror,
        merged.tickMargin,
      ),
    })),
  );

  const labelOf = (entry: CartesianTickItem, index: number): string => {
    const formatted =
      typeof merged.tickFormatter === "function"
        ? merged.tickFormatter(entry.value, index)
        : isNullish(entry.value)
          ? ""
          : // Recharts stringifies tick values directly, including Date objects.
            // eslint-disable-next-line typescript/no-base-to-string
            String(entry.value);
    return `${formatted}${merged.unit ?? ""}`;
  };

  // Default tick `padding` forwarded to a function-form tick (recharts forwards the
  // axis's own padding prop; the implicit default is zero on both edges).
  const defaultPadding = (): AxisLabelPadding =>
    merged.axisType === "yAxis" ? { top: 0, bottom: 0 } : { left: 0, right: 0 };

  // The props recharts passes to a function-form `tick` renderer, built to match its
  // shape exactly (class = axis class + tick-value class; payload = the tick item).
  const tickContentProps = (item: {
    entry: CartesianTickItem;
    index: number;
    tick: Coordinate;
  }): CartesianTickContentProps => {
    const e = item.entry;
    return {
      x: item.tick.x,
      y: item.tick.y,
      payload: {
        coordinate: e.coordinate,
        value: e.value,
        index: e.index,
        offset: e.offset,
        // recharts' getTicks sets tickCoord (= coordinate when un-thinned) and isShow
        // on each rendered tick item; this port doesn't thin, so every tick is shown.
        tickCoord: e.tickCoord ?? e.coordinate,
        isShow: e.isShow ?? true,
      },
      index: item.index,
      visibleTicksCount: visibleTicks().length,
      class: `recharts-${merged.axisType} ${merged.axisType} recharts-cartesian-axis-tick-value`,
      fill: strokeColor(),
      stroke: "none",
      textAnchor: resolvedTextAnchor(),
      verticalAnchor: verticalAnchor(),
      orientation: merged.orientation,
      height: merged.height,
      width: merged.width,
      padding: merged.padding ?? defaultPadding(),
      name: merged.name,
      tickFormatter: merged.tickFormatter,
      angle: merged.angle ?? 0,
    };
  };

  return (
    <Show when={!merged.hide}>
      {/* recharts emits both the namespaced and the bare axis class (`recharts-yAxis yAxis`). */}
      <Layer class={`recharts-cartesian-axis recharts-${merged.axisType} ${merged.axisType}`}>
        <Show when={merged.axisLine}>
          <AxisLine
            x={merged.x}
            y={merged.y}
            width={merged.width}
            height={merged.height}
            orientation={merged.orientation}
            mirror={merged.mirror}
            stroke={strokeColor()}
          />
        </Show>
        <g class={`recharts-cartesian-axis-ticks recharts-${merged.axisType}-ticks`}>
          <For each={tickCoords()}>
            {(item) => (
              <Layer class="recharts-cartesian-axis-tick">
                <Show when={merged.tickLine}>
                  <line
                    class="recharts-cartesian-axis-tick-line"
                    x1={item.line.x1}
                    y1={item.line.y1}
                    x2={item.line.x2}
                    y2={item.line.y2}
                    stroke={strokeColor()}
                    fill="none"
                  />
                </Show>
                <Show when={merged.tick}>
                  {/* Function-form tick: invoke with recharts' tick-content props.
                      Object-form tick (`{ class: "custom" }`): default <Text> with
                      the extra attrs merged in. Ternary (not <Show>) so the constant
                      branch doesn't trip STRICT_READ. ELEMENT-form tick is unsupported
                      (Solid can't clone-and-inject computed x/y into an evaluated node). */}
                  {typeof merged.tick === "function" ? (
                    merged.tick(tickContentProps(item))
                  ) : (
                    <Text
                      class={["recharts-cartesian-axis-tick-value", tickSettings()?.class]
                        .filter(Boolean)
                        .join(" ")}
                      x={item.tick.x}
                      y={item.tick.y}
                      textAnchor={resolvedTextAnchor()}
                      verticalAnchor={verticalAnchor()}
                      stroke="none"
                      fill={tickSettings()?.fill ?? strokeColor()}
                    >
                      {labelOf(item.entry, item.index)}
                    </Text>
                  )}
                </Show>
              </Layer>
            )}
          </For>
        </g>
        {/* Axis title: the `label` prop (string/number/object/fn) and any `<Label>`
            child both position against the axis viewBox via CartesianLabelContext. */}
        <CartesianLabelContextProvider
          x={merged.x}
          y={merged.y}
          width={merged.width}
          height={merged.height}
          lowerWidth={merged.width}
          upperWidth={merged.width}
        >
          <CartesianLabelFromLabelProp label={merged.label} />
          {merged.children}
        </CartesianLabelContextProvider>
      </Layer>
    </Show>
  );
};
