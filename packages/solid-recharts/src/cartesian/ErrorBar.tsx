// Ported from recharts 3.8.1 src/cartesian/ErrorBar.tsx (commit 7a23854).
//
// Renders whiskers (|--|) for error margins on a graphical item's data points.
// Must be a child of a graphical item (reads its data/axes via ErrorBarContext).
//
// Solid deviations / DEFERRALS (documented):
//  - resolveDefaultProps → merge; React `useXAxis/useYAxis` → selectAxisWithScale.
//  - animation: each whisker <line> is wrapped in CSSTransitionAnimate (a CSS
//    `transform` scaleX/scaleY 0→1); isAnimationActive=false renders the final
//    transform immediately with no transition.
//  - zIndex: an EXPLICIT zIndex portals via ZIndexLayer, but unlike recharts
//    (default `DefaultZIndexes.line`) the default stays inline: default-portaling
//    duplicates content because the ErrorBar subtree is instantiated twice when
//    its parent item's points settle and Solid's Portal appends rather than
//    reconciles. svgPropertiesNoEvents passthrough kept.
//  - arbitrary SVG-prop passthrough to the whisker group (recharts `Props = SVGProps
//    & ErrorBarProps`, e.g. a bare `begin` attribute) rides through
//    svgPropertiesNoEvents, filtered by the canonical allowlist.
import { type Accessor, createMemo, For, merge, omit, Show } from "solid-js";
import type { JSX } from "@solidjs/web";
import { Layer } from "../container/Layer";
import { ZIndexLayer } from "../zIndex/ZIndexLayer";
import { CSSTransitionAnimate } from "../animation/CSSTransitionAnimate";
import { EasingInput, RectangleCoordinate, DataKey } from "../util/types";
import { ReportErrorBarSettings, useErrorBarContext } from "../context/ErrorBarContext";
import { useAppSelector } from "../state/hooks";
import { useIsPanorama } from "../context/PanoramaContext";
import { useChartLayout } from "../context/chartLayoutContext";
import { selectAxisWithScale } from "../state/selectors/axisSelectors";
import { svgPropertiesNoEvents, type CamelSvgProps } from "../util/svgPropertiesNoEvents";

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

// Arbitrary SVG presentation props ride through to the whisker group (recharts
// `Props = SVGProps<SVGLineElement> & ErrorBarProps`). Own props below win on
// key conflicts.
type ErrorBarSvgProps = Omit<
  CamelSvgProps<JSX.LineSVGAttributes<SVGLineElement>>,
  "class" | "direction" | "width" | "offset" | "stroke" | "strokeWidth" | "children" | "ref"
> & {
  /** SVG animation-timing attribute (React's SVGProps exposes it; Solid's
   * LineSVGAttributes doesn't). Rides through to the whisker group like any
   * other passthrough attr — distinct from `animationBegin`. */
  begin?: string | number;
};

export interface ErrorBarProps extends ErrorBarSvgProps {
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
  /** Extra offset rendered as an `offset` attribute on the whisker group. @defaultValue 0 */
  offset?: number;
  /** Animation props (CSS transform scale 0→1 via CSSTransitionAnimate). */
  isAnimationActive?: boolean;
  animationBegin?: number;
  animationDuration?: number;
  animationEasing?: EasingInput;
  /** When set, relocates this element into that z-index portal (unset = inline). */
  zIndex?: number;
  class?: string;
}

const errorBarDefaultProps = {
  stroke: "black",
  strokeWidth: 1.5,
  width: 5,
  offset: 0,
  isAnimationActive: true,
  animationBegin: 0,
  animationDuration: 400,
  animationEasing: "ease-in-out",
} as const satisfies Partial<ErrorBarProps>;

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

/** Per-data-point whisker lines + the CSS transform-origin for the scale animation. */
interface ErrorBarLineGroup {
  lines: ReadonlyArray<RectangleCoordinate>;
  transformOrigin: string;
}

function ErrorBarImpl(props: {
  dataKey: DataKey<unknown>;
  width: number;
  direction: ErrorBarDirection;
  /** Allowlist-filtered, kebab-cased SVG attrs spread onto the whisker group. */
  groupSvgAttrs: Record<string, unknown>;
  isAnimationActive: boolean;
  animationBegin: number;
  animationDuration: number;
  animationEasing: EasingInput;
  zIndex: number | undefined;
  class?: string;
}): JSX.Element {
  const scaleDirection = (): string => (props.direction === "x" ? "scaleX" : "scaleY");
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

  // recharts spreads svgPropertiesNoEvents(others) onto the whisker GROUP (the
  // lines inherit stroke etc.; `offset` and other non-typed attrs ride along).
  const groupAttrs = (): Record<string, unknown> => props.groupSvgAttrs;

  const lineGroups = createMemo<ReadonlyArray<ErrorBarLineGroup> | null>(() => {
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

    return data.map((entry): ErrorBarLineGroup => {
      const { x, y, value, errorVal } = dataPointFormatter(entry, props.dataKey, props.direction);
      if (!errorVal || x == null || y == null) {
        return { lines: [], transformOrigin: "" };
      }
      let lowBound: number;
      let highBound: number;
      if (Array.isArray(errorVal)) {
        const lo: unknown = errorVal[0];
        const hi: unknown = errorVal[1];
        if (typeof lo !== "number" || typeof hi !== "number") {
          return { lines: [], transformOrigin: "" };
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
      const transformOrigin = `${x + offset}px ${y + offset}px`;
      return { lines, transformOrigin };
    });
  });

  return (
    <Show when={lineGroups()}>
      {(groups) => (
        <ZIndexLayer zIndex={props.zIndex}>
          <Layer class="recharts-errorBars">
            <For each={groups()}>
              {(group) => (
                <Show when={group.lines.length > 0}>
                  {/* Raw <g> (mirrors Layer's `recharts-layer` class) so the Record
                    spread can carry the non-typed `offset` attribute. */}
                  <g class={["recharts-layer", "recharts-errorBar"]} {...groupAttrs()}>
                    <For each={group.lines}>
                      {(c) => {
                        const lineStyle: JSX.CSSProperties | undefined = props.isAnimationActive
                          ? { "transform-origin": group.transformOrigin }
                          : undefined;
                        return (
                          <CSSTransitionAnimate
                            animationId={`error-bar-${props.direction}_${c.x1}-${c.x2}-${c.y1}-${c.y2}`}
                            from={`${scaleDirection()}(0)`}
                            to={`${scaleDirection()}(1)`}
                            attributeName="transform"
                            begin={props.animationBegin}
                            easing={
                              typeof props.animationEasing === "string"
                                ? props.animationEasing
                                : undefined
                            }
                            isActive={props.isAnimationActive}
                            duration={props.animationDuration}
                          >
                            {(style) => (
                              <line
                                x1={c.x1}
                                y1={c.y1}
                                x2={c.x2}
                                y2={c.y2}
                                style={{
                                  ...lineStyle,
                                  transform: style.transform,
                                  transition: style.transition,
                                }}
                              />
                            )}
                          </CSSTransitionAnimate>
                        );
                      }}
                    </For>
                  </g>
                </Show>
              )}
            </For>
          </Layer>
        </ZIndexLayer>
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
  // Everything that isn't ErrorBar config is an SVG presentation prop for the
  // whisker group (recharts: `const { direction, width, dataKey, ...others } =
  // props; svgPropertiesNoEvents(others)`). The allowlist filter drops any
  // remaining non-SVG keys (and the merge proxy's symbols).
  const groupSvgAttrs = createMemo<Record<string, unknown>>(() =>
    svgPropertiesNoEvents({
      ...omit(
        merged,
        "dataKey",
        "width",
        "direction",
        "isAnimationActive",
        "animationBegin",
        "animationDuration",
        "animationEasing",
        "zIndex",
        "class",
      ),
    }),
  );
  return (
    <>
      <ReportErrorBarSettings dataKey={merged.dataKey} direction={direction()} />
      <ErrorBarImpl
        dataKey={merged.dataKey}
        width={merged.width}
        direction={direction()}
        groupSvgAttrs={groupSvgAttrs()}
        isAnimationActive={merged.isAnimationActive}
        animationBegin={merged.animationBegin}
        animationDuration={merged.animationDuration}
        animationEasing={merged.animationEasing}
        zIndex={merged.zIndex}
        class={merged.class}
      />
    </>
  );
}

ErrorBar.displayName = "ErrorBar";
