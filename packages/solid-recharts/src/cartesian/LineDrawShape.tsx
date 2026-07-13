// Ported from recharts 3.9.0 src/cartesian/LineDrawShape.tsx.
//
// The default shape for <Line>. During the entrance animation the line is
// progressively revealed via the `strokeDasharray` SVG attribute: the visible
// portion grows from 0 to the full path length as the animation progresses.
//
// Solid 2.0 deviations:
//   - React reads `pathRef.current.getTotalLength()` synchronously during render.
//     jsdom returns 0 for getTotalLength and the attribute `d` is only applied
//     AFTER the ref fires, so measuring in a ref/render degrades the draw. We
//     measure in an effect (after attributes land) into a signal and recompute the
//     dasharray reactively — the same "measure in an effect, not the ref" idiom the
//     previous Line port already documented.
//   - `pathRef: RefObject<SVGPathElement>` (a read-only object ref) becomes our
//     Curve's `pathRef` callback form; LineDrawShape owns the element capture and
//     forwards the element to the parent-supplied `forwardPathRef` so the parent
//     (<Line>) can drive `shouldUpdatePreviousRef`/`getVisibleLength` off the same
//     measured length.
import { createEffect, createSignal, omit } from "solid-js";
import type { JSX } from "@solidjs/web";
import { Curve, type CurveProps } from "../shape/Curve";
import type { ShapeAnimationProps } from "../util/types";

/**
 * Reads the total length of an SVG path element, returning 0 if the element is
 * null or the measurement fails (e.g. in JSDOM).
 */
function getTotalLength(path: SVGPathElement | null | undefined): number {
  try {
    return (path && path.getTotalLength && path.getTotalLength()) || 0;
  } catch {
    return 0;
  }
}

/**
 * Generates a simple stroke-dasharray string for animating a line draw effect.
 *
 * Uses `totalLength` as the gap (instead of `totalLength - length`) to avoid a
 * floating-point precision artifact that can render a phantom dot at the path
 * endpoint with round or square strokeLinecap.
 */
function generateSimpleStrokeDasharray(totalLength: number, length: number): string {
  return `${length}px ${totalLength}px`;
}

/**
 * Normalizes a dash pattern to the even-length sequence SVG renderers use. Odd-length
 * stroke-dasharray values repeat once, so "5" behaves like "5 5".
 */
function normalizeDashPattern(lines: number[]): number[] {
  return lines.length % 2 !== 0 ? [...lines, ...lines] : lines;
}

/** Repeats a dash pattern array `count` times. */
function repeat(lines: number[], count: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < count; ++i) {
    result.push(...lines);
  }
  return result;
}

/**
 * Computes a stroke-dasharray string for a custom-dashed line draw effect: reveals
 * exactly `length` px of the user pattern, followed by a `totalLength` gap.
 */
function getStrokeDasharray(length: number, totalLength: number, lines: number[]): string {
  const normalizedLines = normalizeDashPattern(lines);
  const lineLength = normalizedLines.reduce((pre, next) => pre + next, 0);

  if (!lineLength) {
    return generateSimpleStrokeDasharray(totalLength, length);
  }

  const count = Math.floor(length / lineLength);
  const remainLength = length % lineLength;
  let remainLines: number[] = [];
  for (let i = 0, sum = 0; i < normalizedLines.length; sum += normalizedLines[i] ?? 0, ++i) {
    const lineValue = normalizedLines[i];
    if (lineValue != null && sum + lineValue > remainLength) {
      remainLines = [...normalizedLines.slice(0, i), remainLength - sum];
      break;
    }
  }

  const emptyLines = remainLines.length % 2 === 0 ? [0, totalLength] : [totalLength];

  return [...repeat(normalizedLines, count), ...remainLines, ...emptyLines]
    .map((line) => `${line}px`)
    .join(", ");
}

/** Computes the animated stroke-dasharray for the current frame. */
function computeAnimatedStrokeDasharray(
  userStrokeDasharray: string | number | undefined,
  totalLength: number,
  visibleLength: number,
): string {
  if (userStrokeDasharray) {
    const lines = `${userStrokeDasharray}`.split(/[,\s]+/gim).map((num) => parseFloat(num));
    return getStrokeDasharray(visibleLength, totalLength, lines);
  }
  return generateSimpleStrokeDasharray(totalLength, visibleLength);
}

export type LineDrawShapeProps = Omit<CurveProps, "pathRef"> &
  ShapeAnimationProps & {
    /**
     * The computed visible length of the SVG path during entrance animation, in pixels.
     * - number: apply stroke-dasharray to reveal exactly this many pixels.
     * - null/undefined: no entrance-driven stroke-dasharray is applied.
     *
     * Computed by `useAnimatedLineLength` in <Line>.
     */
    visibleLength?: number | null;
    /**
     * Callback handed the underlying <path> element once it mounts, so <Line> can
     * measure the same path length that drives this shape's dash. (Replaces sharing
     * React's `pathRef` object.)
     */
    forwardPathRef?: (el: SVGPathElement) => void;
  };

/**
 * The default shape for Line — see the recharts animation guide. Custom shapes can
 * import it as a reference or reuse it directly via `<Line shape={LineDrawShape} />`.
 *
 * @since 3.9
 */
export function LineDrawShape(props: LineDrawShapeProps): JSX.Element {
  // Measure the path length in an effect (NOT the ref callback): the ref fires
  // before the dynamic `d` attribute is applied, where getTotalLength() is 0.
  const [totalLength, setTotalLength] = createSignal(0);
  let pathEl: SVGPathElement | undefined;
  const capturePath = (el: SVGPathElement): void => {
    pathEl = el;
    props.forwardPathRef?.(el);
  };

  // Re-measure the path length only while the entrance dash is actually being
  // drawn (`visibleLength != null`). `totalLength` feeds `strokeDasharray` ONLY on
  // that branch (see below), so once the reveal is done — including every
  // subsequent data-change morph, where `frame` changes per frame — measuring
  // would force a synchronous SVG layout (reflow) each frame for a value nothing
  // reads. Guarding on visibleLength drops those per-frame reflows.
  createEffect(
    () => ({ points: props.points, visibleLength: props.visibleLength }),
    (deps) => {
      if (deps.visibleLength == null || pathEl?.getTotalLength == null) {
        return;
      }
      const length = getTotalLength(pathEl);
      setTotalLength(length);
    },
  );

  const strokeDasharray = (): string | undefined => {
    const visibleLength = props.visibleLength;
    const userStrokeDasharray = props.strokeDasharray;
    if (visibleLength != null) {
      return computeAnimatedStrokeDasharray(userStrokeDasharray, totalLength(), visibleLength);
    }
    if (userStrokeDasharray != null) {
      return String(userStrokeDasharray);
    }
    return undefined;
  };

  // Strip the animation-only props before forwarding to <Curve>; we set
  // connectNulls/strokeDasharray/pathRef explicitly below. `omit` keeps the
  // remaining props reactive (no destructuring of `props`).
  const curveProps = omit(
    props,
    "animationElapsedTime",
    "isAnimating",
    "isEntrance",
    "visibleLength",
    "forwardPathRef",
    "strokeDasharray",
    "connectNulls",
  );

  return (
    <Curve
      {...curveProps}
      connectNulls={props.connectNulls ?? false}
      strokeDasharray={strokeDasharray()}
      pathRef={capturePath}
    />
  );
}
