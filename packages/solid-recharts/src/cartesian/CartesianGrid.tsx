// Ported from recharts 3.8.1 src/cartesian/CartesianGrid.tsx (commit 7a23854).
//
// Draws the horizontal + vertical grid lines plus the background fill rect.
// When neither explicit points nor a coordinate generator is supplied the grid
// SELF-GENERATES its line positions: it reads the rendered axis ticks
// (selectTicksOfAxis) and runs them through getCoordinatesOfGrid, which adds the
// plot-area min/max edges when `syncWithTicks` is false — matching the reference
// default*CoordinatesGenerator + getCoordinatesOfGrid math.
// Deferred (documented): stripe fills (horizontalFill/verticalFill), custom line
// render functions / elements, ZIndexLayer.
// Solid deviations: hooks return accessors; `className`→`class`.
import { createMemo, For, merge, Show } from "solid-js";
import type { JSX } from "@solidjs/web";
import { useAppSelector } from "../state/hooks";
import { useIsPanorama } from "../context/PanoramaContext";
import { useOffsetInternal } from "../context/chartLayoutContext";
import { selectTicksOfAxis } from "../state/selectors/axisSelectors";
import { AxisId } from "../state/cartesianAxisSlice";
import { isPositiveNumber } from "../util/isWellBehavedNumber";
import { isNumber } from "../util/DataUtils";
import { svgPropertiesNoEvents } from "../util/svgPropertiesNoEvents";
import type { TickItem } from "../util/types";

export interface CartesianGridProps {
  horizontal?: boolean;
  vertical?: boolean;
  stroke?: string;
  strokeOpacity?: number | string;
  strokeDasharray?: string | number;
  horizontalPoints?: ReadonlyArray<number>;
  verticalPoints?: ReadonlyArray<number>;
  xAxisId?: AxisId;
  yAxisId?: AxisId;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  /**
   * If true, only the lines that correspond to the axes ticks values will be drawn.
   * If false, extra lines could be added at the min and max coordinates of each axis.
   * @defaultValue false
   */
  syncWithTicks?: boolean;
  /** The background color used to fill the space between grid lines. @defaultValue none */
  fill?: string;
  /** The opacity of the background fill. */
  fillOpacity?: number | string;
  /** Border-radius of the background rect. */
  ry?: number | string;
  class?: string;
}

const cartesianGridDefaults = {
  horizontal: true,
  vertical: true,
  stroke: "#ccc",
  fill: "none",
  syncWithTicks: false,
  xAxisId: 0,
  yAxisId: 0,
} as const satisfies Partial<CartesianGridProps>;

/**
 * Ported locally from ChartUtils.getCoordinatesOfGrid. When syncWithTicks is
 * false this appends the plot-area min/max edge coordinates if the ticks don't
 * already land on them.
 */
const getCoordinatesOfGrid = (
  ticks: ReadonlyArray<TickItem>,
  minValue: number,
  maxValue: number,
  syncWithTicks: boolean,
): number[] => {
  if (syncWithTicks) {
    return ticks.map((entry) => entry.coordinate);
  }

  let hasMin = false;
  let hasMax = false;

  const values = ticks.map((entry) => {
    if (entry.coordinate === minValue) {
      hasMin = true;
    }
    if (entry.coordinate === maxValue) {
      hasMax = true;
    }
    return entry.coordinate;
  });

  if (!hasMin) {
    values.push(minValue);
  }
  if (!hasMax) {
    values.push(maxValue);
  }

  return values;
};

export const CartesianGrid = (props: CartesianGridProps): JSX.Element => {
  const merged = merge(cartesianGridDefaults, props);
  const isPanorama = useIsPanorama();
  const offset = useOffsetInternal();
  const xTicks = useAppSelector((state) =>
    selectTicksOfAxis(state, "xAxis", merged.xAxisId, isPanorama),
  );
  const yTicks = useAppSelector((state) =>
    selectTicksOfAxis(state, "yAxis", merged.yAxisId, isPanorama),
  );

  const geom = createMemo(() => {
    const o = offset();
    // NaN width/height fall through to offset just like undefined: reference uses
    // `isNumber(props.x) ? props.x : offset.x`, and isNumber(NaN) is false.
    const x = isNumber(merged.x) ? merged.x : o.left;
    const y = isNumber(merged.y) ? merged.y : o.top;
    const width = isNumber(merged.width) ? merged.width : o.width;
    const height = isNumber(merged.height) ? merged.height : o.height;

    // Self-generate line positions when no explicit points are provided. The
    // base coordinates come from the axis ticks; getCoordinatesOfGrid then adds
    // the plot-area edges (offset min/max) when syncWithTicks is false.
    const verticalPoints =
      merged.verticalPoints ??
      getCoordinatesOfGrid(xTicks() ?? [], o.left, o.left + o.width, merged.syncWithTicks);
    const horizontalPoints =
      merged.horizontalPoints ??
      getCoordinatesOfGrid(yTicks() ?? [], o.top, o.top + o.height, merged.syncWithTicks);
    return { x, y, width, height, verticalPoints, horizontalPoints };
  });

  // stroke-dasharray accepts only string in JSX; coerce the number form.
  const dash = (): string | undefined =>
    merged.strokeDasharray == null ? undefined : String(merged.strokeDasharray);

  return (
    <Show when={isPositiveNumber(geom().width) && isPositiveNumber(geom().height) && !isPanorama}>
      <g class={["recharts-cartesian-grid", merged.class]}>
        <Show when={merged.fill != null && merged.fill !== "none"}>
          <rect
            x={geom().x}
            y={geom().y}
            ry={merged.ry}
            width={geom().width}
            height={geom().height}
            stroke="none"
            fill={merged.fill}
            fill-opacity={merged.fillOpacity}
            class="recharts-cartesian-grid-bg"
          />
        </Show>
        <Show when={merged.horizontal}>
          <g class="recharts-cartesian-grid-horizontal">
            <For each={geom().horizontalPoints}>
              {(yPoint) => (
                <line
                  stroke={merged.stroke}
                  stroke-dasharray={dash()}
                  fill="none"
                  // recharts emits the grid box x/y/width/height on each line (non-line
                  // SVG attrs) — spread via the canonical helper to keep parity + types.
                  {...svgPropertiesNoEvents({
                    x: geom().x,
                    y: geom().y,
                    width: geom().width,
                    height: geom().height,
                  })}
                  x1={geom().x}
                  y1={yPoint}
                  x2={geom().x + geom().width}
                  y2={yPoint}
                />
              )}
            </For>
          </g>
        </Show>
        <Show when={merged.vertical}>
          <g class="recharts-cartesian-grid-vertical">
            <For each={geom().verticalPoints}>
              {(xPoint) => (
                <line
                  stroke={merged.stroke}
                  stroke-dasharray={dash()}
                  fill="none"
                  {...svgPropertiesNoEvents({
                    x: geom().x,
                    y: geom().y,
                    width: geom().width,
                    height: geom().height,
                  })}
                  x1={xPoint}
                  y1={geom().y}
                  x2={xPoint}
                  y2={geom().y + geom().height}
                />
              )}
            </For>
          </g>
        </Show>
      </g>
    </Show>
  );
};
