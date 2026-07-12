/**
 * @fileOverview Rectangle
 *
 * Ported from recharts 3.8.1 src/shape/Rectangle.tsx (commit 7a23854).
 * Pure `getRectanglePath` copied verbatim. Solid deviations: `className` →
 * `class` (Omit the wide SVG `class`); destructuring defaults → `?? default`;
 * `clsx` → `class={[...]}`; `return null` → `<Show>`; the radius is rendered as
 * a number-or-undefined attribute (overriding the spread).
 *
 * The update-animation path (`isUpdateAnimationActive`) is WIRED: it drives
 * `JavascriptAnimate` with `getTotalLength` + `interpolate` + prev-value closures
 * (Solid's render-prop child is invoked in a tracking JSX scope, so reads inside
 * it track). `isUpdateAnimationActive` defaults to false, so the common path
 * (e.g. Bar's rectangles) stays static — wiring is regression-safe.
 */
import { type CamelSvgProps } from "../util/svgPropertiesNoEvents";
import { createEffect, createSignal, Show, omit, untrack } from "solid-js";
import type { JSX } from "@solidjs/web";
import type { AnimationDuration } from "../util/types";
import type { EasingInput } from "../animation/easing";
import { svgPropertiesAndEvents } from "../util/svgPropertiesAndEvents";
import { round, roundTemplateLiteral } from "../util/round";
import { interpolate } from "../util/DataUtils";
import { useAnimationId } from "../util/useAnimationId";
import { getTransitionVal } from "../animation/util";
import { JavascriptAnimate } from "../animation/JavascriptAnimate";

/**
 * @inline
 */
export type RectRadius = number | [number, number, number, number];

const getRectanglePath = (
  x: number,
  y: number,
  width: number,
  height: number,
  radius: RectRadius,
): string => {
  const roundedWidth = round(width);
  const roundedHeight = round(height);
  const maxRadius = Math.min(Math.abs(roundedWidth) / 2, Math.abs(roundedHeight) / 2);
  const ySign = roundedHeight >= 0 ? 1 : -1;
  const xSign = roundedWidth >= 0 ? 1 : -1;
  const clockWise =
    (roundedHeight >= 0 && roundedWidth >= 0) || (roundedHeight < 0 && roundedWidth < 0) ? 1 : 0;
  let path;

  if (maxRadius > 0 && Array.isArray(radius)) {
    const newRadius: [number, number, number, number] = [0, 0, 0, 0];
    for (let i = 0, len = 4; i < len; i++) {
      const r: number = radius[i] ?? 0;
      newRadius[i] = r > maxRadius ? maxRadius : r;
    }

    path = roundTemplateLiteral`M${x},${y + ySign * newRadius[0]}`;

    if (newRadius[0] > 0) {
      path += roundTemplateLiteral`A ${newRadius[0]},${newRadius[0]},0,0,${clockWise},${x + xSign * newRadius[0]},${y}`;
    }

    path += roundTemplateLiteral`L ${x + width - xSign * newRadius[1]},${y}`;

    if (newRadius[1] > 0) {
      path += roundTemplateLiteral`A ${newRadius[1]},${newRadius[1]},0,0,${clockWise},
        ${x + width},${y + ySign * newRadius[1]}`;
    }
    path += roundTemplateLiteral`L ${x + width},${y + height - ySign * newRadius[2]}`;

    if (newRadius[2] > 0) {
      path += roundTemplateLiteral`A ${newRadius[2]},${newRadius[2]},0,0,${clockWise},
        ${x + width - xSign * newRadius[2]},${y + height}`;
    }
    path += roundTemplateLiteral`L ${x + xSign * newRadius[3]},${y + height}`;

    if (newRadius[3] > 0) {
      path += roundTemplateLiteral`A ${newRadius[3]},${newRadius[3]},0,0,${clockWise},
        ${x},${y + height - ySign * newRadius[3]}`;
    }
    path += "Z";
  } else if (maxRadius > 0 && radius === +radius && radius > 0) {
    const newRadius = Math.min(maxRadius, radius);

    path = roundTemplateLiteral`M ${x},${y + ySign * newRadius}
            A ${newRadius},${newRadius},0,0,${clockWise},${x + xSign * newRadius},${y}
            L ${x + width - xSign * newRadius},${y}
            A ${newRadius},${newRadius},0,0,${clockWise},${x + width},${y + ySign * newRadius}
            L ${x + width},${y + height - ySign * newRadius}
            A ${newRadius},${newRadius},0,0,${clockWise},${x + width - xSign * newRadius},${y + height}
            L ${x + xSign * newRadius},${y + height}
            A ${newRadius},${newRadius},0,0,${clockWise},${x},${y + height - ySign * newRadius} Z`;
  } else {
    path = roundTemplateLiteral`M ${x},${y} h ${width} v ${height} h ${-width} Z`;
  }

  return path;
};

interface RectangleOwnProps {
  class?: string;
  /** The x-coordinate of top left point of the rectangle. @defaultValue 0 */
  x?: number;
  /** The y-coordinate of top left point of the rectangle. @defaultValue 0 */
  y?: number;
  /** Width of the rectangle in pixels. @defaultValue 0 */
  width?: number;
  /** Height of the rectangle in pixels. @defaultValue 0 */
  height?: number;
  /** The radius of corners (single number or [tl, tr, br, bl]). @defaultValue 0 */
  radius?: RectRadius;
  /** @defaultValue false */
  isAnimationActive?: boolean;
  /** @defaultValue false */
  isUpdateAnimationActive?: boolean;
  /** @defaultValue 0 */
  animationBegin?: number;
  /** @defaultValue 1500 */
  animationDuration?: AnimationDuration;
  /** @defaultValue ease */
  animationEasing?: EasingInput;
}

export type RectangleProps = Omit<
  CamelSvgProps<JSX.PathSVGAttributes<SVGPathElement>>,
  "radius" | "class"
> &
  RectangleOwnProps;

/**
 * Renders a rectangle element. Unlike the rect SVG element, this supports rounded
 * corners (and, once the update-animation path lands, animation). Accepts X/Y in
 * pixels; for data-positioned rectangles use ReferenceArea.
 */
export const Rectangle = (props: RectangleProps): JSX.Element => {
  const x = (): number => props.x ?? 0;
  const y = (): number => props.y ?? 0;
  const width = (): number => props.width ?? 0;
  const height = (): number => props.height ?? 0;
  const radius = (): RectRadius => props.radius ?? 0;

  const valid = (): boolean =>
    !(
      x() !== +x() ||
      y() !== +y() ||
      width() !== +width() ||
      height() !== +height() ||
      width() === 0 ||
      height() === 0
    );

  const isUpdateAnimationActive = (): boolean => props.isUpdateAnimationActive ?? false;
  const isAnimationActive = (): boolean => props.isAnimationActive ?? false;
  const animationDuration = (): number => props.animationDuration ?? 1500;
  const animationEasing = (): EasingInput => props.animationEasing ?? "ease";
  const animationBegin = (): number => props.animationBegin ?? 0;

  const layerClass = (): Array<string | undefined> => ["recharts-rectangle", props.class];

  // recharts renders x/y/width/height/radius on the <path> (React allows extra
  // attrs). Solid's PathSVGAttributes is stricter, so route them through the
  // (loosely-typed) svgPropertiesAndEvents spread rather than explicit attrs.
  // `radius` is rendered only when it's a number (array radius → undefined).
  const basePathProps = (): Record<string, unknown> => ({
    ...omit(props, "class", "style"),
    radius: typeof radius() === "number" ? radius() : undefined,
  });

  // Animation (update path) state: a ref to read the path length + prev-value
  // closures the animation interpolates from.
  //
  // The ref only captures the element — refs fire before the dynamic `d`
  // attribute is applied, where getTotalLength() is 0/throws. The measuring
  // effect below runs after attributes land and re-measures when the geometry
  // changes.
  let pathEl: SVGPathElement | undefined;
  const [totalLength, setTotalLength] = createSignal(-1);
  const measurePath = (el: SVGPathElement): void => {
    pathEl = el;
  };
  createEffect(
    () => ({ x: x(), y: y(), width: width(), height: height(), radius: radius() }),
    () => {
      if (pathEl?.getTotalLength == null) {
        return;
      }
      let len = 0;
      try {
        len = pathEl.getTotalLength();
      } catch {
        return; // getTotalLength can throw on detached/empty paths — keep the last value.
      }
      if (len) {
        setTotalLength(len);
      }
    },
  );

  const animationId = useAnimationId(
    () => ({ x: x(), y: y(), width: width(), height: height(), radius: radius() }),
    "rectangle-",
  );

  // Seed prev-values without a tracked top-level read (untrack avoids STRICT_READ).
  let prevWidth = untrack(width);
  let prevHeight = untrack(height);
  let prevX = untrack(x);
  let prevY = untrack(y);

  const staticPath = (): JSX.Element => (
    <path
      {...svgPropertiesAndEvents({
        ...basePathProps(),
        x: round(x()),
        y: round(y()),
        width: round(width()),
        height: round(height()),
      })}
      class={layerClass()}
      d={getRectanglePath(x(), y(), width(), height(), radius())}
    />
  );

  return (
    <Show when={valid()}>
      <Show when={isUpdateAnimationActive()} fallback={staticPath()}>
        {/* Keyed on animationId: a prop change → new id → this recreates the
            JavascriptAnimate, restarting the animation from the (updated) prev
            values to the new ones. This is the Solid equivalent of recharts'
            `key={animationId}` remount. */}
        <Show when={animationId()} keyed>
          {(animId) => (
            <JavascriptAnimate
              animationId={animId}
              canBegin={totalLength() > 0}
              duration={animationDuration()}
              easing={animationEasing()}
              isActive={isUpdateAnimationActive()}
              begin={animationBegin()}
            >
              {(t) => {
                // The JavascriptAnimate render-prop child is NOT an auto-tracking
                // scope, so read a per-frame SNAPSHOT via untrack. This is correct:
                // the engine re-invokes the child each frame, and prop changes restart
                // it (width → new animationId; totalLength → canBegin), so each
                // invocation sees fresh values. (untrack also clears STRICT_READ.)
                const snap = untrack(() => ({
                  w: width(),
                  h: height(),
                  cx: x(),
                  cy: y(),
                  r: radius(),
                  len: totalLength(),
                  animActive: isAnimationActive(),
                  dur: animationDuration(),
                  easing: animationEasing(),
                }));
                const currWidth = interpolate(prevWidth, snap.w, t);
                const currHeight = interpolate(prevHeight, snap.h, t);
                const currX = interpolate(prevX, snap.cx, t);
                const currY = interpolate(prevY, snap.cy, t);
                if (pathEl) {
                  prevWidth = currWidth;
                  prevHeight = currHeight;
                  prevX = currX;
                  prevY = currY;
                }
                const len = snap.len;
                const from = `0px ${len === -1 ? 1 : len}px`;
                const to = `${len}px ${len}px`;
                const transition = getTransitionVal(
                  ["strokeDasharray"],
                  snap.dur,
                  typeof snap.easing === "string" ? snap.easing : "ease",
                );
                const dashStyle: JSX.CSSProperties = !snap.animActive
                  ? { "stroke-dasharray": to }
                  : t > 0
                    ? // key order matches recharts' serialized style string
                      // (`stroke-dasharray: …; transition: …;`).
                      { "stroke-dasharray": to, transition }
                    : { "stroke-dasharray": from };
                // `props.style` may be a string in Solid JSX; only merge object styles.
                const userStyle: JSX.CSSProperties =
                  typeof props.style === "object" && props.style != null ? props.style : {};
                return (
                  <path
                    {...svgPropertiesAndEvents(basePathProps())}
                    ref={measurePath}
                    class={layerClass()}
                    d={getRectanglePath(currX, currY, currWidth, currHeight, snap.r)}
                    style={{ ...dashStyle, ...userStyle }}
                  />
                );
              }}
            </JavascriptAnimate>
          )}
        </Show>
      </Show>
    </Show>
  );
};
