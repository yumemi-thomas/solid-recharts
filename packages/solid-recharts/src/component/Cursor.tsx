// Ported from recharts 3.8.1 src/component/Cursor.tsx (commit 7a23854).
//
// MINIMAL PORT — draws the default cursor highlight: a line (Curve) for
// Line/Area/Composed charts, a band rectangle for BarChart. Deferred (documented):
// the ScatterChart Cross + radial Sector cursors (those verticals), the ZIndexLayer
// wrapper (z-ordering vertical — the cursor renders directly for now), and custom
// cursor styling via a React element / SVG-props object (`cursor` is acted on only
// as a boolean; element/object configs render the default shape). Solid deviations:
// `clsx`→`class`; hooks return accessors.
import { createMemo, Show } from "solid-js";
import type { JSX } from "@solidjs/web";
import { Coordinate, PolarCoordinate, RectanglePosition, TooltipEventType } from "../util/types";
import { Curve } from "../shape/Curve";
import { Rectangle } from "../shape/Rectangle";
import { getCursorPoints } from "../util/cursor/getCursorPoints";
import { getCursorRectangle } from "../util/cursor/getCursorRectangle";
import { useChartLayout, useOffsetInternal } from "../context/chartLayoutContext";
import { useTooltipAxisBandSize } from "../context/useTooltipAxis";
import { useAppSelector } from "../state/hooks";
import { selectChartName } from "../state/selectors/rootPropsSelectors";
import { TooltipIndex, TooltipPayload } from "../state/tooltipSlice";

/**
 * `false` hides the cursor; the default (`true`) draws the shape below. A
 * customizing SVG-props object is accepted but currently ignored, and a custom
 * cursor element is deferred (see header). Deviation: recharts' union includes a
 * `ReactElement`; the port drops it because Solid's `JSX.Element` already subsumes
 * `boolean`, which would make the show/hide flag redundant.
 */
export type CursorDefinition = boolean | Record<string, unknown>;

export interface CursorProps {
  cursor: CursorDefinition;
  tooltipEventType: TooltipEventType;
  coordinate: Coordinate | PolarCoordinate | undefined;
  payload: TooltipPayload;
  index: TooltipIndex | undefined;
}

export const Cursor = (props: CursorProps): JSX.Element => {
  const tooltipAxisBandSize = useTooltipAxisBandSize();
  const offset = useOffsetInternal();
  const layout = useChartLayout();
  const chartName = useAppSelector(selectChartName);

  const shouldRender = (): boolean => {
    const coordinate = props.coordinate;
    const name = chartName();
    return (
      props.cursor !== false &&
      coordinate != null &&
      layout() != null &&
      offset() != null &&
      tooltipAxisBandSize() != null &&
      // Only axis tooltips draw a cursor (ScatterChart's Cross is deferred).
      (name === "ScatterChart" || props.tooltipEventType === "axis")
    );
  };

  // All reactive reads happen in this memo (a tracking scope); it returns plain
  // shape DATA. The Show callbacks below then only read plain object properties,
  // so no STRICT_READ_UNTRACKED fires (the previous once-run callbacks read
  // accessors/store coordinates directly).
  const cursorShape = createMemo<
    | { kind: "rect"; rect: RectanglePosition & { stroke: string; fill: string } }
    | { kind: "curve"; points: ReadonlyArray<Coordinate> }
    | null
  >(() => {
    const coordinate = props.coordinate;
    const off = offset();
    const currentLayout = layout();
    if (!shouldRender() || coordinate == null || off == null || currentLayout == null) {
      return null;
    }
    if (chartName() === "BarChart") {
      return {
        kind: "rect",
        rect: getCursorRectangle(currentLayout, coordinate, off, tooltipAxisBandSize() ?? 0),
      };
    }
    const points = getCursorPoints(currentLayout, coordinate, off);
    if (!Array.isArray(points)) {
      return null;
    }
    return { kind: "curve", points };
  });

  // Two derived memos so each <Show> child reads its accessor INSIDE the returned
  // JSX (where reads track) rather than in the callback body (where they don't).
  const rect = createMemo(() => {
    const s = cursorShape();
    return s?.kind === "rect" ? s.rect : null;
  });
  const curvePoints = createMemo(() => {
    const s = cursorShape();
    return s?.kind === "curve" ? s.points : null;
  });

  return (
    <>
      <Show when={rect()}>
        {(r) => (
          <Rectangle
            class="recharts-tooltip-cursor"
            x={r().x}
            y={r().y}
            width={r().width}
            height={r().height}
            stroke={r().stroke}
            fill={r().fill}
          />
        )}
      </Show>
      <Show when={curvePoints()}>
        {(pts) => (
          <Curve class="recharts-tooltip-cursor" points={pts()} stroke="#ccc" fill="none" />
        )}
      </Show>
    </>
  );
};
