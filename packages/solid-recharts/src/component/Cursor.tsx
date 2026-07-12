// Ported from recharts 3.8.1 src/component/Cursor.tsx (commit 7a23854).
//
// Draws the default cursor highlight: a Curve (line) for Line/Area/Composed
// charts, a band Rectangle for BarChart, a Cross for ScatterChart, and a Sector
// for radial-layout charts. `cursor` is acted on as a boolean (show/hide) plus an
// optional SVG-props object (className/styling); a custom cursor ELEMENT
// (recharts' `ReactElement` + cloneElement) is PERMANENT-N/A — there is no Solid
// equivalent of React.isValidElement/cloneElement. Solid deviations: `clsx` →
// `class={[...]}`; the connected `Cursor` resolves context then delegates to
// `CursorInternal`, which (like recharts) takes fully-resolved props so it can be
// rendered standalone in tests; all reactive reads live in a tracking memo that
// returns plain shape DATA, so the <Show> children read only plain properties.
import { createMemo, Show } from "solid-js";
import type { JSX } from "@solidjs/web";
import {
  ChartOffsetInternal,
  Coordinate,
  isPolarCoordinate,
  LayoutType,
  PolarCoordinate,
  RectanglePosition,
  TooltipEventType,
} from "../util/types";
import { Curve } from "../shape/Curve";
import { Cross } from "../shape/Cross";
import { Rectangle } from "../shape/Rectangle";
import { Sector } from "../shape/Sector";
import { getCursorPoints } from "../util/cursor/getCursorPoints";
import { getCursorRectangle } from "../util/cursor/getCursorRectangle";
import { getRadialCursorPoints } from "../util/cursor/getRadialCursorPoints";
import { useChartLayout, useOffsetInternal } from "../context/chartLayoutContext";
import { useTooltipAxisBandSize } from "../context/useTooltipAxis";
import { useAppSelector } from "../state/hooks";
import { selectChartName } from "../state/selectors/rootPropsSelectors";
import { TooltipIndex, TooltipPayload } from "../state/tooltipSlice";
import { ZIndexLayer, type ZIndexable } from "../zIndex/ZIndexLayer";
import { DefaultZIndexes } from "../zIndex/DefaultZIndexes";

/**
 * `false` hides the cursor; the default (`true`) draws the shape below. A
 * customizing SVG-props object is accepted (its `className` is appended); a custom
 * cursor element is deferred (see header). Deviation: recharts' union includes a
 * `ReactElement`; the port drops it because Solid's `JSX.Element` already subsumes
 * `boolean`, which would make the show/hide flag redundant.
 */
export type CursorDefinition = boolean | Record<string, unknown>;

export interface CursorProps extends ZIndexable {
  cursor: CursorDefinition;
  tooltipEventType: TooltipEventType;
  coordinate: Coordinate | PolarCoordinate | undefined;
  payload: TooltipPayload;
  index: TooltipIndex | undefined;
}

export type CursorConnectedProps = CursorProps & {
  tooltipAxisBandSize: number;
  layout: LayoutType;
  offset: ChartOffsetInternal;
  chartName: string;
};

type CursorShape =
  | { kind: "rect"; rect: RectanglePosition & { stroke: string; fill: string } }
  | { kind: "curve"; points: ReadonlyArray<Coordinate> }
  | { kind: "cross"; coordinate: Coordinate }
  | {
      kind: "sector";
      cx: number;
      cy: number;
      startAngle: number;
      endAngle: number;
      radius: number;
    }
  | null;

/**
 * The shared cursor class, with an optional extra className from an object-form
 * `cursor` appended (the shape components type `class` as a plain string, so this
 * is joined rather than passed as a `class={[...]}` array).
 */
function cursorClass(cursor: CursorDefinition): string {
  if (typeof cursor === "object" && cursor != null && typeof cursor.className === "string") {
    return `recharts-tooltip-cursor ${cursor.className}`;
  }
  return "recharts-tooltip-cursor";
}

/**
 * Connected (fully-resolved) cursor. Mirrors recharts' `CursorInternal`: takes
 * layout/offset/chartName/tooltipAxisBandSize directly so tests can render it
 * standalone inside an <svg>.
 */
export function CursorInternal(props: CursorConnectedProps): JSX.Element {
  // All reactive reads happen in this memo (a tracking scope); it returns plain
  // shape DATA so the <Show> children below only read plain object properties.
  const cursorShape = createMemo<CursorShape>(() => {
    const coordinate = props.coordinate;
    if (
      !props.cursor ||
      coordinate == null ||
      (props.chartName !== "ScatterChart" && props.tooltipEventType !== "axis")
    ) {
      return null;
    }
    if (props.chartName === "ScatterChart") {
      return { kind: "cross", coordinate };
    }
    if (props.chartName === "BarChart") {
      return {
        kind: "rect",
        rect: getCursorRectangle(props.layout, coordinate, props.offset, props.tooltipAxisBandSize),
      };
    }
    if (props.layout === "radial" && isPolarCoordinate(coordinate)) {
      const { cx, cy, radius, startAngle, endAngle } = getRadialCursorPoints(coordinate);
      return {
        kind: "sector",
        cx: cx ?? 0,
        cy: cy ?? 0,
        startAngle: startAngle ?? 0,
        endAngle: endAngle ?? 0,
        radius: radius ?? 0,
      };
    }
    const points = getCursorPoints(props.layout, coordinate, props.offset);
    if (!Array.isArray(points)) {
      return null;
    }
    return { kind: "curve", points };
  });

  // One derived memo per shape kind so each <Show> child reads its accessor INSIDE
  // the returned JSX (where reads track) rather than in the callback body.
  const rect = createMemo(() => {
    const s = cursorShape();
    return s?.kind === "rect" ? s.rect : null;
  });
  const curvePoints = createMemo(() => {
    const s = cursorShape();
    return s?.kind === "curve" ? s.points : null;
  });
  const cross = createMemo(() => {
    const s = cursorShape();
    return s?.kind === "cross" ? s.coordinate : null;
  });
  const sector = createMemo(() => {
    const s = cursorShape();
    return s?.kind === "sector" ? s : null;
  });
  const cls = (): string => cursorClass(props.cursor);

  // recharts portals the cursor at a shape-dependent default z-index (the band
  // rectangle below bars, the line/cross/sector above the series) unless the
  // caller provides an explicit zIndex.
  const preferredZIndex = (): number =>
    cursorShape()?.kind === "rect" ? DefaultZIndexes.cursorRectangle : DefaultZIndexes.cursorLine;

  return (
    <Show when={cursorShape()}>
      <ZIndexLayer zIndex={props.zIndex ?? preferredZIndex()}>
        <Show when={rect()}>
          {(r) => (
            <Rectangle
              class={cls()}
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
          {(pts) => <Curve class={cls()} points={pts()} stroke="#ccc" fill="none" />}
        </Show>
        <Show when={cross()}>
          {(c) => (
            <Cross
              class={cls()}
              x={c().x}
              y={c().y}
              top={props.offset.top}
              left={props.offset.left}
              width={props.offset.width}
              height={props.offset.height}
              stroke="#ccc"
            />
          )}
        </Show>
        <Show when={sector()}>
          {(s) => (
            <Sector
              class={cls()}
              cx={s().cx}
              cy={s().cy}
              startAngle={s().startAngle}
              endAngle={s().endAngle}
              innerRadius={s().radius}
              outerRadius={s().radius}
              stroke="#ccc"
              fill="none"
            />
          )}
        </Show>
      </ZIndexLayer>
    </Show>
  );
}

export const Cursor = (props: CursorProps): JSX.Element => {
  const tooltipAxisBandSize = useTooltipAxisBandSize();
  const offset = useOffsetInternal();
  const layout = useChartLayout();
  const chartName = useAppSelector(selectChartName);

  // Resolve the context-derived props into one bundle; null until all are ready,
  // so the keyed <Show> hands CursorInternal fully-typed (non-null) values.
  const resolved = createMemo(() => {
    const band = tooltipAxisBandSize();
    const off = offset();
    const lay = layout();
    const name = chartName();
    if (band == null || off == null || lay == null || name == null) {
      return null;
    }
    return { band, off, lay, name };
  });

  return (
    <Show when={resolved()}>
      {(r) => (
        <CursorInternal
          cursor={props.cursor}
          tooltipEventType={props.tooltipEventType}
          coordinate={props.coordinate}
          payload={props.payload}
          index={props.index}
          zIndex={props.zIndex}
          offset={r().off}
          layout={r().lay}
          tooltipAxisBandSize={r().band}
          chartName={r().name}
        />
      )}
    </Show>
  );
};
