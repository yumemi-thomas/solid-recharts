// Ported from recharts 3.8.1 src/cartesian/CartesianGrid.tsx (commit 7a23854).
//
// Draws the horizontal + vertical grid lines, the alternating background
// "stripes" (horizontalFill / verticalFill), and the background fill rect.
// When neither explicit points nor a coordinate generator is supplied the grid
// SELF-GENERATES its line positions via the default coordinate generators,
// which read the axis props bundle (selectAxisPropsNeededForCartesianGridTicksGenerator)
// and run getTicks + getTicksOfAxis through getCoordinatesOfGrid.
//
// Solid deviations: hooks return accessors; `className`→`class`. Element-form
// `horizontal`/`vertical` (a JSX element cloned with cloneElement in React) is
// NOT supported — only boolean and function forms. Function-form receives the
// full GridLineTypeFunctionProps payload (matching recharts) including the
// xAxis/yAxis/offset bundle.
import { type CamelSvgProps } from "../util/svgPropertiesNoEvents";
import { createMemo, For, merge, Show } from "solid-js";
import type { JSX } from "@solidjs/web";
import { useAppSelector } from "../state/hooks";
import { useIsPanorama } from "../context/PanoramaContext";
import { useChartHeight, useChartWidth, useOffsetInternal } from "../context/chartLayoutContext";
import {
  type AxisPropsForCartesianGridTicksGeneration,
  selectAxisPropsNeededForCartesianGridTicksGenerator,
} from "../state/selectors/axisSelectors";
import { AxisId } from "../state/cartesianAxisSlice";
import { isPositiveNumber } from "../util/isWellBehavedNumber";
import { isNumber } from "../util/DataUtils";
import { getTicksOfAxis } from "../util/ChartUtils";
import { getTicks } from "./getTicks";
import { svgPropertiesNoEvents } from "../util/svgPropertiesNoEvents";
import { svgPropertiesAndEvents } from "../util/svgPropertiesAndEvents";
import { DefaultZIndexes } from "../zIndex/DefaultZIndexes";
import { ZIndexLayer } from "../zIndex/ZIndexLayer";
import type { ChartOffsetInternal, TickItem } from "../util/types";

/**
 * The props passed to a custom horizontal/vertical render-prop function (and,
 * in recharts, cloned into an element form). Matches recharts'
 * GridLineTypeFunctionProps.
 */
export type GridLineTypeFunctionProps = CartesianGridProps & {
  offset: ChartOffsetInternal;
  xAxis: AxisPropsForCartesianGridTicksGeneration | undefined;
  yAxis: AxisPropsForCartesianGridTicksGeneration | undefined;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  x: number;
  y: number;
  width: number;
  height: number;
  key: string | undefined;
  index: number;
  zIndex: number;
  stroke: string;
  fill: string;
  syncWithTicks: boolean;
  horizontalFill: string[];
  verticalFill: string[];
  horizontalPoints: ReadonlyArray<number>;
  verticalPoints: ReadonlyArray<number>;
};

export type { AxisPropsForCartesianGridTicksGeneration };

export type HorizontalCoordinatesGenerator = (
  props: {
    yAxis: AxisPropsForCartesianGridTicksGeneration | undefined;
    width: number;
    height: number;
    offset: ChartOffsetInternal;
  },
  syncWithTicks: boolean,
) => number[];

export type VerticalCoordinatesGenerator = (
  props: {
    xAxis: AxisPropsForCartesianGridTicksGeneration | undefined;
    width: number;
    height: number;
    offset: ChartOffsetInternal;
  },
  syncWithTicks: boolean,
) => number[];

type GridLineType =
  | boolean
  | CamelSvgProps<JSX.LineSVGAttributes<SVGLineElement>>
  | ((props: GridLineTypeFunctionProps) => JSX.Element);

export interface CartesianGridProps {
  horizontal?: GridLineType;
  vertical?: GridLineType;
  stroke?: string;
  strokeOpacity?: number | string;
  strokeDasharray?: string | number;
  horizontalPoints?: ReadonlyArray<number>;
  verticalPoints?: ReadonlyArray<number>;
  horizontalCoordinatesGenerator?: HorizontalCoordinatesGenerator;
  verticalCoordinatesGenerator?: VerticalCoordinatesGenerator;
  /** Values (data domain) where horizontal lines will be drawn. */
  horizontalValues?: ReadonlyArray<number> | ReadonlyArray<string>;
  /** Values (data domain) where vertical lines will be drawn. */
  verticalValues?: ReadonlyArray<number> | ReadonlyArray<string>;
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
  /** Background stripe colors for vertical bands. @defaultValue [] */
  verticalFill?: string[];
  /** Background stripe colors for horizontal bands. @defaultValue [] */
  horizontalFill?: string[];
  /** Border-radius of the background rect. */
  ry?: number | string;
  zIndex?: number;
  class?: string;
}

const EMPTY_POINTS: ReadonlyArray<number> = [];
const EMPTY_FILL: string[] = [];

const cartesianGridDefaults = {
  horizontal: true,
  vertical: true,
  horizontalPoints: EMPTY_POINTS,
  verticalPoints: EMPTY_POINTS,
  stroke: "#ccc",
  fill: "none",
  verticalFill: EMPTY_FILL,
  horizontalFill: EMPTY_FILL,
  syncWithTicks: false,
  xAxisId: 0,
  yAxisId: 0,
  zIndex: DefaultZIndexes.grid,
} satisfies Partial<CartesianGridProps>;

// The subset of CartesianAxis defaults the default coordinate generators rely
// on (orientation/minTickGap/interval) when building ticks via getTicks.
const defaultCartesianAxisProps = {
  orientation: "bottom",
  minTickGap: 5,
  interval: "preserveEnd",
  tick: true,
} as const;

/**
 * Ported from ChartUtils.getCoordinatesOfGrid. When syncWithTicks is false this
 * appends the plot-area min/max edge coordinates if the ticks don't already
 * land on them.
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

const defaultVerticalCoordinatesGenerator: VerticalCoordinatesGenerator = (
  { xAxis, width, height, offset },
  syncWithTicks,
) =>
  getCoordinatesOfGrid(
    getTicks({
      ...defaultCartesianAxisProps,
      ...xAxis,
      ticks: getTicksOfAxis(xAxis == null ? undefined : { ...xAxis, scale: xAxis.scale }, true),
      viewBox: { x: 0, y: 0, width, height },
    }),
    offset.left,
    offset.left + offset.width,
    syncWithTicks,
  );

const defaultHorizontalCoordinatesGenerator: HorizontalCoordinatesGenerator = (
  { yAxis, width, height, offset },
  syncWithTicks,
) =>
  getCoordinatesOfGrid(
    getTicks({
      ...defaultCartesianAxisProps,
      ...yAxis,
      ticks: getTicksOfAxis(yAxis == null ? undefined : { ...yAxis, scale: yAxis.scale }, true),
      viewBox: { x: 0, y: 0, width, height },
    }),
    offset.top,
    offset.top + offset.height,
    syncWithTicks,
  );

export const CartesianGrid = (props: CartesianGridProps): JSX.Element => {
  const merged = merge(cartesianGridDefaults, props);
  const isPanorama = useIsPanorama();
  const offset = useOffsetInternal();
  const chartWidth = useChartWidth();
  const chartHeight = useChartHeight();
  const xAxis = useAppSelector((state) =>
    selectAxisPropsNeededForCartesianGridTicksGenerator(state, "xAxis", merged.xAxisId, isPanorama),
  );
  const yAxis = useAppSelector((state) =>
    selectAxisPropsNeededForCartesianGridTicksGenerator(state, "yAxis", merged.yAxisId, isPanorama),
  );

  const geom = createMemo(() => {
    const o = offset();
    // NaN width/height fall through to offset just like undefined: reference uses
    // `isNumber(props.x) ? props.x : offset.x`, and isNumber(NaN) is false.
    const x = isNumber(merged.x) ? merged.x : o.left;
    const y = isNumber(merged.y) ? merged.y : o.top;
    const width = isNumber(merged.width) ? merged.width : o.width;
    const height = isNumber(merged.height) ? merged.height : o.height;

    const cw = chartWidth() ?? width;
    const ch = chartHeight() ?? height;

    // Resolve horizontal/vertical points: explicit points win, else run the
    // (default or custom) coordinate generator.
    let horizontalPoints: ReadonlyArray<number> = merged.horizontalPoints ?? [];
    if (horizontalPoints.length === 0) {
      const gen = merged.horizontalCoordinatesGenerator ?? defaultHorizontalCoordinatesGenerator;
      const hValues = merged.horizontalValues;
      const isHorizontalValues = hValues != null && hValues.length > 0;
      const ya = yAxis();
      const result = gen(
        {
          yAxis:
            ya == null
              ? undefined
              : {
                  ...ya,
                  ticks: isHorizontalValues ? hValues : ya.ticks,
                },
          width: cw,
          height: ch,
          offset: o,
        },
        isHorizontalValues ? true : Boolean(merged.syncWithTicks),
      );
      horizontalPoints = Array.isArray(result) ? result : [];
    }

    let verticalPoints: ReadonlyArray<number> = merged.verticalPoints ?? [];
    if (verticalPoints.length === 0) {
      const gen = merged.verticalCoordinatesGenerator ?? defaultVerticalCoordinatesGenerator;
      const vValues = merged.verticalValues;
      const isVerticalValues = vValues != null && vValues.length > 0;
      const xa = xAxis();
      const result = gen(
        {
          xAxis:
            xa == null
              ? undefined
              : {
                  ...xa,
                  ticks: isVerticalValues ? vValues : xa.ticks,
                },
          width: cw,
          height: ch,
          offset: o,
        },
        isVerticalValues ? true : Boolean(merged.syncWithTicks),
      );
      verticalPoints = Array.isArray(result) ? result : [];
    }

    return { x, y, width, height, verticalPoints, horizontalPoints, offset: o };
  });

  // stroke-dasharray accepts only string in JSX; coerce the number form.
  const dash = (): string | undefined =>
    merged.strokeDasharray == null ? undefined : String(merged.strokeDasharray);

  // Compute the rounded/sorted stripe bands for the horizontal direction.
  const horizontalStripes = createMemo(() => {
    const g = geom();
    if (
      merged.horizontal === false ||
      merged.horizontalFill == null ||
      merged.horizontalFill.length === 0
    ) {
      return [];
    }
    const points = g.horizontalPoints;
    const rounded = points.map((e) => Math.round(e + g.y - g.y)).sort((a, b) => a - b);
    if (g.y !== rounded[0]) {
      rounded.unshift(0);
    }
    const fills = merged.horizontalFill;
    return rounded
      .map((entry, i) => {
        const nextPoint = rounded[i + 1];
        const lastStripe = nextPoint == null;
        const lineHeight = lastStripe ? g.y + g.height - entry : nextPoint - entry;
        if (lineHeight <= 0) {
          return null;
        }
        return {
          y: entry,
          x: g.x,
          height: lineHeight,
          width: g.width,
          fill: fills[i % fills.length],
        };
      })
      .filter((s): s is NonNullable<typeof s> => s != null);
  });

  const verticalStripes = createMemo(() => {
    const g = geom();
    if (
      merged.vertical === false ||
      merged.verticalFill == null ||
      merged.verticalFill.length === 0
    ) {
      return [];
    }
    const points = g.verticalPoints;
    const rounded = points.map((e) => Math.round(e + g.x - g.x)).sort((a, b) => a - b);
    if (g.x !== rounded[0]) {
      rounded.unshift(0);
    }
    const fills = merged.verticalFill;
    return rounded
      .map((entry, i) => {
        const nextPoint = rounded[i + 1];
        const lastStripe = nextPoint == null;
        const lineWidth = lastStripe ? g.x + g.width - entry : nextPoint - entry;
        if (lineWidth <= 0) {
          return null;
        }
        return {
          x: entry,
          y: g.y,
          width: lineWidth,
          height: g.height,
          fill: fills[i % fills.length],
        };
      })
      .filter((s): s is NonNullable<typeof s> => s != null);
  });

  // Builds the props payload passed to a custom line render-prop function.
  // Enumerates exactly the keys recharts' LineItem receives — no `...props`
  // spread (that would leak the merge()-proxy MERGE_SOURCE symbol into the
  // payload and break deep-equality assertions).
  const lineItemProps = (
    index: number,
    coords: { x1: number; y1: number; x2: number; y2: number },
  ): GridLineTypeFunctionProps => {
    const g = geom();
    return {
      stroke: merged.stroke,
      fill: "none",
      syncWithTicks: merged.syncWithTicks,
      horizontal: merged.horizontal,
      vertical: merged.vertical,
      horizontalFill: merged.horizontalFill,
      verticalFill: merged.verticalFill,
      horizontalPoints: g.horizontalPoints,
      verticalPoints: g.verticalPoints,
      x: g.x,
      y: g.y,
      width: g.width,
      height: g.height,
      x1: coords.x1,
      y1: coords.y1,
      x2: coords.x2,
      y2: coords.y2,
      key: `line-${index}`,
      index,
      zIndex: merged.zIndex,
      offset: g.offset,
      xAxis: xAxis(),
      yAxis: yAxis(),
    };
  };

  // Precompute plain line descriptors so the <For> children read only plain
  // values (reading geom()/accessors inside a <For> child trips STRICT_READ).
  type LineDescriptor = {
    x: number;
    y: number;
    width: number;
    height: number;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    index: number;
    custom: JSX.Element | undefined;
  };

  const horizontalLines = createMemo((): ReadonlyArray<LineDescriptor> => {
    const g = geom();
    if (merged.horizontal === false || g.horizontalPoints.length === 0) {
      return [];
    }
    return g.horizontalPoints.map((yPoint, index) => {
      const coords = { x1: g.x, y1: yPoint, x2: g.x + g.width, y2: yPoint };
      return {
        x: g.x,
        y: g.y,
        width: g.width,
        height: g.height,
        ...coords,
        index,
        custom:
          typeof merged.horizontal === "function"
            ? merged.horizontal(lineItemProps(index, coords))
            : undefined,
      };
    });
  });

  const verticalLines = createMemo((): ReadonlyArray<LineDescriptor> => {
    const g = geom();
    if (merged.vertical === false || g.verticalPoints.length === 0) {
      return [];
    }
    return g.verticalPoints.map((xPoint, index) => {
      const coords = { x1: xPoint, y1: g.y, x2: xPoint, y2: g.y + g.height };
      return {
        x: g.x,
        y: g.y,
        width: g.width,
        height: g.height,
        ...coords,
        index,
        custom:
          typeof merged.vertical === "function"
            ? merged.vertical(lineItemProps(index, coords))
            : undefined,
      };
    });
  });

  return (
    <Show
      when={
        isPositiveNumber(geom().width) &&
        isPositiveNumber(geom().height) &&
        isNumber(geom().x) &&
        isNumber(geom().y) &&
        !isPanorama
      }
    >
      {/* ZIndexLayer INSIDE the gate <Show> (a Portal must not get a reactive
          Show child — see Bar). Default grid zIndex is -100: the grid portals
          BELOW the graphical items, mirroring the reference's settled DOM. */}
      <ZIndexLayer zIndex={merged.zIndex}>
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
          <Show when={horizontalStripes().length > 0}>
            <g class="recharts-cartesian-gridstripes-horizontal">
              <For each={horizontalStripes()}>
                {(stripe) => (
                  <rect
                    y={stripe.y}
                    x={stripe.x}
                    height={stripe.height}
                    width={stripe.width}
                    stroke="none"
                    fill={stripe.fill}
                    fill-opacity={merged.fillOpacity}
                    class="recharts-cartesian-grid-bg"
                  />
                )}
              </For>
            </g>
          </Show>
          <Show when={verticalStripes().length > 0}>
            <g class="recharts-cartesian-gridstripes-vertical">
              <For each={verticalStripes()}>
                {(stripe) => (
                  <rect
                    x={stripe.x}
                    y={stripe.y}
                    width={stripe.width}
                    height={stripe.height}
                    stroke="none"
                    fill={stripe.fill}
                    fill-opacity={merged.fillOpacity}
                    class="recharts-cartesian-grid-bg"
                  />
                )}
              </For>
            </g>
          </Show>
          <Show when={horizontalLines().length > 0}>
            <g class="recharts-cartesian-grid-horizontal">
              <For each={horizontalLines()}>
                {(d) =>
                  d.custom !== undefined ? (
                    d.custom
                  ) : (
                    <line
                      stroke={merged.stroke}
                      stroke-dasharray={dash()}
                      fill="none"
                      // recharts emits the grid box x/y/width/height on each line (non-line
                      // SVG attrs) — spread via the canonical helper to keep parity + types.
                      {...svgPropertiesNoEvents({
                        x: d.x,
                        y: d.y,
                        width: d.width,
                        height: d.height,
                      })}
                      {...(typeof merged.horizontal === "object" && merged.horizontal !== null
                        ? svgPropertiesAndEvents({ ...merged.horizontal })
                        : {})}
                      x1={d.x1}
                      y1={d.y1}
                      x2={d.x2}
                      y2={d.y2}
                    />
                  )
                }
              </For>
            </g>
          </Show>
          <Show when={verticalLines().length > 0}>
            <g class="recharts-cartesian-grid-vertical">
              <For each={verticalLines()}>
                {(d) =>
                  d.custom !== undefined ? (
                    d.custom
                  ) : (
                    <line
                      stroke={merged.stroke}
                      stroke-dasharray={dash()}
                      fill="none"
                      {...svgPropertiesNoEvents({
                        x: d.x,
                        y: d.y,
                        width: d.width,
                        height: d.height,
                      })}
                      {...(typeof merged.vertical === "object" && merged.vertical !== null
                        ? svgPropertiesAndEvents({ ...merged.vertical })
                        : {})}
                      x1={d.x1}
                      y1={d.y1}
                      x2={d.x2}
                      y2={d.y2}
                    />
                  )
                }
              </For>
            </g>
          </Show>
        </g>
      </ZIndexLayer>
    </Show>
  );
};
