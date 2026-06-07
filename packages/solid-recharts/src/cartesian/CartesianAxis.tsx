// Ported from recharts 3.8.1 src/cartesian/CartesianAxis.tsx (commit 7a23854).
//
// MINIMAL PORT — draws the axis line + tick lines + tick labels. The pure tick
// geometry helpers (getTickLineCoord/getTickTextAnchor/getTickVerticalAnchor) are
// ported verbatim. Deferred (documented): the axis `label` (title) via Label, the
// getTicks interval/minTickGap thinning (all selected ticks render — the ticks
// the selector already produces), custom tick render functions / elements,
// ZIndexLayer, RenderedTicksReporter, Y-axis auto-width. Solid deviations:
// forwardRef dropped; React CSSProperties n/a; `className`→`class`.
import { createMemo, For, merge, Show } from "solid-js";
import type { JSX } from "@solidjs/web";
import { Layer } from "../container/Layer";
import { Text, TextAnchor, TextVerticalAnchor } from "../component/Text";
import { isNullish, isNumber } from "../util/DataUtils";
import { CartesianTickItem, Coordinate, RectangleCoordinate } from "../util/types";
import { XAxisOrientation, YAxisOrientation } from "../state/cartesianAxisSlice";

export type Orientation = XAxisOrientation | YAxisOrientation;

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

export interface CartesianAxisProps {
  axisType: "xAxis" | "yAxis";
  x: number;
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
  tick?: boolean;
  tickFormatter?: (value: unknown, index: number) => string;
  interval?: number | string;
  unit?: string | number;
  hide?: boolean;
  class?: string;
}

const cartesianAxisDefaults = {
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
    />
  );
};

export const CartesianAxis = (props: CartesianAxisProps): JSX.Element => {
  const merged = merge(cartesianAxisDefaults, props);

  const textAnchor = (): TextAnchor => getTickTextAnchor(merged.orientation, merged.mirror);
  const verticalAnchor = (): TextVerticalAnchor =>
    getTickVerticalAnchor(merged.orientation, merged.mirror);

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

  return (
    <Show when={!merged.hide}>
      <Layer class={`recharts-cartesian-axis recharts-${merged.axisType}`}>
        <Show when={merged.axisLine}>
          <AxisLine
            x={merged.x}
            y={merged.y}
            width={merged.width}
            height={merged.height}
            orientation={merged.orientation}
            mirror={merged.mirror}
            stroke={merged.stroke}
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
                    stroke={merged.stroke}
                    fill="none"
                  />
                </Show>
                <Show when={merged.tick}>
                  <Text
                    class="recharts-cartesian-axis-tick-value"
                    x={item.tick.x}
                    y={item.tick.y}
                    text-anchor={textAnchor()}
                    verticalAnchor={verticalAnchor()}
                    stroke="none"
                    fill={merged.stroke}
                  >
                    {labelOf(item.entry, item.index)}
                  </Text>
                </Show>
              </Layer>
            )}
          </For>
        </g>
      </Layer>
    </Show>
  );
};
