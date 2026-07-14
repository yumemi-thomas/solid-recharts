// Ported from recharts 3.9.0 src/cartesian/AreaRevealShape.tsx.
//
// The default `shape` for <Area>: it renders the complete Area visual (filled
// curve + stroke curve + optional range baseline stroke) and, on the ENTRANCE
// animation only, wraps those curves in a clip-path rect that grows left→right
// (horizontal) or top→bottom (vertical) to reveal the area. Outside the entrance
// pass it renders the plain curves.
//
// Solid deviations: `className`→`class` (array form); csstype/kebab DOM out via
// the shared svgPropertiesNoEvents; the ClipRect components return a single
// `<rect>` (or null) — no JSX from a memo (the SVG-component port pattern). The
// reveal clip is gated with a TERNARY, not `<Show when={const}>` (the entrance
// flags are read once per frame, not reactive — STRICT_READ discipline).
import { createMemo, Show } from "solid-js";
import type { JSX } from "solid-js";
import { isNumber } from "../util/DataUtils";
import { Curve, type BaseLineType, type CurveProps } from "../shape/Curve";
import type { CartesianLayout, LayoutType, ShapeAnimationProps } from "../util/types";
import { isWellBehavedNumber } from "../util/isWellBehavedNumber";
import { Layer } from "../container/Layer";
import { svgPropertiesNoEvents } from "../util/svgPropertiesNoEvents";
import { useId } from "../util/useId";

interface ClipRectProps {
  alpha: number;
  points: ReadonlyArray<{ x?: number | null; y?: number | null }>;
  baseLine: BaseLineType | undefined;
  strokeWidth: string | number | undefined;
}

type Rect = { x: number; y: number; width: number; height: number };

// Geometry computed inside a tracking scope (createMemo); the `<Show>` renders
// the single <rect> (or nothing) — avoids early-return top-of-body prop reads
// that trip STRICT_READ_UNTRACKED.
function HorizontalClipRect(props: ClipRectProps): JSX.Element {
  const geom = createMemo<Rect | null>(() => {
    const startX = props.points[0]?.x;
    const endX = props.points[props.points.length - 1]?.x;
    if (!isWellBehavedNumber(startX) || !isWellBehavedNumber(endX)) {
      return null;
    }
    const width = props.alpha * Math.abs(startX - endX);
    let maxY = Math.max(...props.points.map((entry) => entry.y || 0));
    const baseLine = props.baseLine;
    if (isNumber(baseLine)) {
      maxY = Math.max(baseLine, maxY);
    } else if (baseLine != null && baseLine.length > 0) {
      maxY = Math.max(...baseLine.map((entry) => entry.y || 0), maxY);
    }
    if (!isNumber(maxY)) {
      return null;
    }
    return {
      x: startX < endX ? startX : startX - width,
      y: 0,
      width,
      height: Math.floor(maxY + (props.strokeWidth ? parseInt(`${props.strokeWidth}`, 10) : 1)),
    };
  });
  return (
    <Show when={geom()}>
      {(g) => <rect x={g().x} y={g().y} width={g().width} height={g().height} />}
    </Show>
  );
}

function VerticalClipRect(props: ClipRectProps): JSX.Element {
  const geom = createMemo<Rect | null>(() => {
    const startY = props.points[0]?.y;
    const endY = props.points[props.points.length - 1]?.y;
    if (!isWellBehavedNumber(startY) || !isWellBehavedNumber(endY)) {
      return null;
    }
    const height = props.alpha * Math.abs(startY - endY);
    let maxX = Math.max(...props.points.map((entry) => entry.x || 0));
    const baseLine = props.baseLine;
    if (isNumber(baseLine)) {
      maxX = Math.max(baseLine, maxX);
    } else if (baseLine != null && baseLine.length > 0) {
      maxX = Math.max(...baseLine.map((entry) => entry.x || 0), maxX);
    }
    if (!isNumber(maxX)) {
      return null;
    }
    return {
      x: 0,
      y: startY < endY ? startY : startY - height,
      width: maxX + (props.strokeWidth ? parseInt(`${props.strokeWidth}`, 10) : 1),
      height: Math.floor(height),
    };
  });
  return (
    <Show when={geom()}>
      {(g) => <rect x={g().x} y={g().y} width={g().width} height={g().height} />}
    </Show>
  );
}

function RevealClipRect(props: ClipRectProps & { layout: CartesianLayout }): JSX.Element {
  return (
    <Show
      when={props.layout === "vertical"}
      fallback={
        <HorizontalClipRect
          alpha={props.alpha}
          points={props.points}
          baseLine={props.baseLine}
          strokeWidth={props.strokeWidth}
        />
      }
    >
      <VerticalClipRect
        alpha={props.alpha}
        points={props.points}
        baseLine={props.baseLine}
        strokeWidth={props.strokeWidth}
      />
    </Show>
  );
}

export type AreaRevealShapeProps = CurveProps &
  ShapeAnimationProps & { layout?: LayoutType; isRange?: boolean };

/**
 * The default shape for Area: reveals the chart with a left-to-right (or
 * top-to-bottom) clip-path animation on entrance, and renders the plain curves
 * otherwise. Renders the filled area curve, the stroke curve, and (for range
 * areas) the baseline stroke curve.
 *
 * Automatically used when no custom `shape` prop is provided. Importable as a
 * starting point for custom shapes.
 *
 * @since 3.9
 */
export function AreaRevealShape(props: AreaRevealShapeProps): JSX.Element {
  const clipId = useId();

  const layout = (): CartesianLayout => (props.layout === "vertical" ? "vertical" : "horizontal");
  const finalConnectNulls = (): boolean => props.connectNulls ?? false;

  // recharts spreads `{...restProps}` (everything except the animation flags and
  // layout/isRange/stroke/connectNulls) onto the fill curve, and the
  // svgPropertiesNoEvents subset (minus id/baseLine) onto the stroke curves.
  const restProps = (): Record<string, unknown> => {
    const {
      animationElapsedTime: _t,
      isAnimating: _a,
      isEntrance: _e,
      layout: _l,
      isRange: _r,
      stroke: _s,
      connectNulls: _c,
      ...rest
    } = props;
    return rest;
  };
  const strokeSvgProps = (): Record<string, unknown> => {
    const { id: _id, baseLine: _bl, ...rest } = restProps();
    return svgPropertiesNoEvents(rest);
  };

  const fillCurve = (): JSX.Element => (
    <Curve
      {...restProps()}
      id={props.id}
      baseLine={props.baseLine}
      connectNulls={finalConnectNulls()}
      stroke="none"
      class="recharts-area-area"
      layout={layout()}
    />
  );

  const strokeCurve = (): JSX.Element =>
    props.stroke !== "none" ? (
      <Curve
        {...strokeSvgProps()}
        class="recharts-area-curve"
        layout={layout()}
        type={props.type}
        connectNulls={finalConnectNulls()}
        fill="none"
        stroke={props.stroke}
        points={props.points}
      />
    ) : null;

  const baselineCurve = (): JSX.Element =>
    props.stroke !== "none" &&
    props.isRange &&
    typeof props.baseLine !== "number" &&
    props.baseLine != null ? (
      <Curve
        {...strokeSvgProps()}
        class="recharts-area-curve"
        layout={layout()}
        type={props.type}
        connectNulls={finalConnectNulls()}
        fill="none"
        stroke={props.stroke}
        points={props.baseLine}
      />
    ) : null;

  // Entrance reveal: while the initial animation runs, wrap the curves in a
  // clip-path whose rect grows with `animationElapsedTime`. Data-change morphs
  // (isEntrance false) and the settled frame render the plain curves unclipped.
  // All reactive reads happen inside this render fn (a tracking scope) — reading
  // them at the component body's top level trips STRICT_READ_UNTRACKED.
  const showReveal = (): boolean => {
    const t = props.animationElapsedTime ?? 1;
    const isAnimating = props.isAnimating ?? false;
    const isEntrance = props.isEntrance ?? false;
    return isEntrance && (isAnimating || t < 1);
  };

  return (
    <Show
      when={showReveal()}
      fallback={
        <>
          {fillCurve()}
          {strokeCurve()}
          {baselineCurve()}
        </>
      }
    >
      <Layer>
        <defs>
          <clipPath id={clipId}>
            <RevealClipRect
              alpha={props.animationElapsedTime ?? 1}
              points={props.points ?? []}
              baseLine={props.baseLine}
              layout={layout()}
              strokeWidth={props.strokeWidth}
            />
          </clipPath>
        </defs>
        <Layer clipPath={`url(#${clipId})`}>
          {fillCurve()}
          {strokeCurve()}
          {baselineCurve()}
        </Layer>
      </Layer>
    </Show>
  );
}
