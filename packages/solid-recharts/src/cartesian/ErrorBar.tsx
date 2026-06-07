// Ported from recharts 3.8.1 src/cartesian/ErrorBar.tsx (commit 7a23854).
//
// Renders whiskers (|--|) for error margins on a graphical item's data points.
// Must be a child of a graphical item (reads its data/axes via ErrorBarContext).
//
// Solid deviations / DEFERRALS (documented):
//  - resolveDefaultProps → merge; React `useXAxis/useYAxis` → selectAxisWithScale.
//  - animation (CSSTransitionAnimate) DEFERRED — whiskers render as static <line>s.
//  - ZIndexLayer DEFERRED (plain Layer). svgPropertiesNoEvents passthrough kept.
import { type Accessor, createMemo, For, merge, Show } from "solid-js";
import type { JSX } from "@solidjs/web";
import { Layer } from "../container/Layer";
import { EasingInput, RectangleCoordinate, DataKey } from "../util/types";
import { ReportErrorBarSettings, useErrorBarContext } from "../context/ErrorBarContext";
import { useAppSelector } from "../state/hooks";
import { useIsPanorama } from "../context/PanoramaContext";
import { useChartLayout } from "../context/chartLayoutContext";
import { selectAxisWithScale } from "../state/selectors/axisSelectors";

export interface ErrorBarDataItem {
  x: number | undefined;
  y: number | undefined;
  value: number;
  errorVal?: number[] | number;
}

/**
 * Direction is decided by the chart layout (horizontal → 'y', vertical → 'x'),
 * except in Scatter where it can go both ways (hence the explicit prop).
 */
export type ErrorBarDirection = "x" | "y";

export type ErrorBarDataPointFormatter = (
  entry: unknown,
  dataKey: DataKey<unknown>,
  direction: ErrorBarDirection,
) => ErrorBarDataItem;

export interface ErrorBarProps {
  /** Which data property each ErrorBar reads (single value or [low, high]). */
  dataKey: DataKey<unknown>;
  /** Width of the whisker serifs in pixels. @defaultValue 5 */
  width?: number;
  /** Direction (Scatter only; derived from layout elsewhere). */
  direction?: ErrorBarDirection;
  /** The stroke color ("none" = no line). @defaultValue black */
  stroke?: string;
  /** The stroke width. @defaultValue 1.5 */
  strokeWidth?: number | string;
  /** Animation props (DEFERRED — kept for prop parity). */
  isAnimationActive?: boolean;
  animationBegin?: number;
  animationDuration?: number;
  animationEasing?: EasingInput;
  class?: string;
}

const errorBarDefaultProps = {
  stroke: "black",
  "stroke-width": 1.5,
  width: 5,
  isAnimationActive: true,
  animationBegin: 0,
  animationDuration: 400,
  animationEasing: "ease-in-out",
} as const satisfies Partial<ErrorBarProps & { "stroke-width": number }>;

function useErrorBarDirection(
  directionFromProps: ErrorBarDirection | undefined,
): Accessor<ErrorBarDirection> {
  const layout = useChartLayout();
  return (): ErrorBarDirection => {
    if (directionFromProps != null) {
      return directionFromProps;
    }
    const l = layout();
    if (l != null) {
      return l === "horizontal" ? "y" : "x";
    }
    return "x";
  };
}

function ErrorBarImpl(props: {
  dataKey: DataKey<unknown>;
  width: number;
  direction: ErrorBarDirection;
  stroke: string;
  strokeWidth: number | string;
  class?: string;
}): JSX.Element {
  const ctx = useErrorBarContext();
  const isPanorama = useIsPanorama();
  // Hooks at setup (not inside the memo); the axis id is read reactively inside
  // each selector callback (a tracking scope).
  const xAxisAcc = useAppSelector((s) =>
    selectAxisWithScale(s, "xAxis", ctx().xAxisId, isPanorama),
  );
  const yAxisAcc = useAppSelector((s) =>
    selectAxisWithScale(s, "yAxis", ctx().yAxisId, isPanorama),
  );

  const lineGroups = createMemo<ReadonlyArray<ReadonlyArray<RectangleCoordinate>> | null>(() => {
    const { data, dataPointFormatter, errorBarOffset: offset } = ctx();
    const xAxis = xAxisAcc();
    const yAxis = yAxisAcc();
    if (xAxis?.scale == null || yAxis?.scale == null || data == null) {
      return null;
    }
    // ErrorBar requires a number x-axis when drawing in the x direction.
    if (props.direction === "x" && xAxis.type !== "number") {
      return null;
    }

    return data.map((entry): ReadonlyArray<RectangleCoordinate> => {
      const { x, y, value, errorVal } = dataPointFormatter(entry, props.dataKey, props.direction);
      if (!errorVal || x == null || y == null) {
        return [];
      }
      let lowBound: number;
      let highBound: number;
      if (Array.isArray(errorVal)) {
        const lo: unknown = errorVal[0];
        const hi: unknown = errorVal[1];
        if (typeof lo !== "number" || typeof hi !== "number") {
          return [];
        }
        lowBound = lo;
        highBound = hi;
      } else {
        lowBound = errorVal;
        highBound = errorVal;
      }

      const lines: RectangleCoordinate[] = [];
      if (props.direction === "x") {
        const { scale } = xAxis;
        const yMid = y + offset;
        const yMin = yMid + props.width;
        const yMax = yMid - props.width;
        const xMin = scale.map(value - lowBound);
        const xMax = scale.map(value + highBound);
        if (xMin != null && xMax != null) {
          lines.push({ x1: xMax, y1: yMin, x2: xMax, y2: yMax });
          lines.push({ x1: xMin, y1: yMid, x2: xMax, y2: yMid });
          lines.push({ x1: xMin, y1: yMin, x2: xMin, y2: yMax });
        }
      } else {
        const { scale } = yAxis;
        const xMid = x + offset;
        const xMin = xMid - props.width;
        const xMax = xMid + props.width;
        const yMin = scale.map(value - lowBound);
        const yMax = scale.map(value + highBound);
        if (yMin != null && yMax != null) {
          lines.push({ x1: xMin, y1: yMax, x2: xMax, y2: yMax });
          lines.push({ x1: xMid, y1: yMin, x2: xMid, y2: yMax });
          lines.push({ x1: xMin, y1: yMin, x2: xMax, y2: yMin });
        }
      }
      return lines;
    });
  });

  return (
    <Show when={lineGroups()}>
      {(groups) => (
        <Layer class="recharts-errorBars">
          <For each={groups()}>
            {(lines) => (
              <Show when={lines.length > 0}>
                <Layer class="recharts-errorBar">
                  <For each={lines}>
                    {(c) => (
                      <line
                        x1={c.x1}
                        y1={c.y1}
                        x2={c.x2}
                        y2={c.y2}
                        stroke={props.stroke}
                        stroke-width={props.strokeWidth}
                      />
                    )}
                  </For>
                </Layer>
              </Show>
            )}
          </For>
        </Layer>
      )}
    </Show>
  );
}

/**
 * Renders whiskers representing error margins. Symmetric (single value) or
 * asymmetric ([low, high]) relative to the data value.
 *
 * @consumes ErrorBarContext
 */
export function ErrorBar(props: ErrorBarProps): JSX.Element {
  const merged = merge(errorBarDefaultProps, props);
  const direction = useErrorBarDirection(props.direction);
  return (
    <>
      <ReportErrorBarSettings dataKey={merged.dataKey} direction={direction()} />
      <ErrorBarImpl
        dataKey={merged.dataKey}
        width={merged.width}
        direction={direction()}
        stroke={merged.stroke}
        strokeWidth={merged["stroke-width"]}
        class={merged.class}
      />
    </>
  );
}

ErrorBar.displayName = "ErrorBar";
