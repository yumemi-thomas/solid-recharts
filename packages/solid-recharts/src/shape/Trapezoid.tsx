/**
 * @fileOverview Trapezoid
 *
 * Ported from recharts 3.8.1 src/shape/Trapezoid.tsx (commit 7a23854).
 * Pure `getTrapezoidPath` copied verbatim. Solid deviations: `className` →
 * `class` (Omit the wide SVG `class`); destructuring defaults → `?? default`;
 * `clsx` → `class={[...]}`; `return null` → `<Show>`.
 *
 * The update-animation path (`isUpdateAnimationActive`) is WIRED, mirroring the
 * Rectangle port: JavascriptAnimate keyed on a geometry animationId, per-frame
 * geometry interpolation from prev-value closures, and the strokeDasharray
 * fade-in driven by a CSS transition. It defaults to false, so the common path
 * stays the static shape.
 */
import { type CamelSvgProps } from "../util/svgPropertiesNoEvents";
import { createEffect, createSignal, Show, omit, untrack } from "solid-js";
import type { JSX } from "@solidjs/web";
import type { AnimationDuration } from "../util/types";
import type { EasingInput } from "../animation/easing";
import { svgPropertiesAndEvents } from "../util/svgPropertiesAndEvents";
import { roundTemplateLiteral } from "../util/round";
import { interpolate } from "../util/DataUtils";
import { useAnimationId } from "../util/useAnimationId";
import { getTransitionVal } from "../animation/util";
import { JavascriptAnimate } from "../animation/JavascriptAnimate";

const getTrapezoidPath = (
  x: number,
  y: number,
  upperWidth: number,
  lowerWidth: number,
  height: number,
): string => {
  const widthGap = upperWidth - lowerWidth;
  let path;
  path = roundTemplateLiteral`M ${x},${y}`;
  path += roundTemplateLiteral`L ${x + upperWidth},${y}`;
  path += roundTemplateLiteral`L ${x + upperWidth - widthGap / 2},${y + height}`;
  path += roundTemplateLiteral`L ${x + upperWidth - widthGap / 2 - lowerWidth},${y + height}`;
  path += roundTemplateLiteral`L ${x},${y} Z`;
  return path;
};

interface TrapezoidOwnProps {
  class?: string;
  /** Rides through to the <path> as a bare `name` attribute (React's SVGProps
   * accepts it; Solid's PathSVGAttributes doesn't, so it's declared here). */
  name?: string | number;
  /** The x-coordinate of top left point of the trapezoid. @default 0 */
  x?: number;
  /** The y-coordinate of top left point of the trapezoid. @default 0 */
  y?: number;
  /** Width of the upper horizontal side of the trapezoid in pixels. @default 0 */
  upperWidth?: number;
  /** Width of the lower horizontal side of the trapezoid in pixels. @default 0 */
  lowerWidth?: number;
  /** Height of the trapezoid in pixels. @default 0 */
  height?: number;
  /** If true, the trapezoid updates and renders with a gradual fade-in animation. @default false */
  isUpdateAnimationActive?: boolean;
  animationBegin?: number;
  animationDuration?: AnimationDuration;
  animationEasing?: EasingInput;
}

export type TrapezoidProps = Omit<CamelSvgProps<JSX.PathSVGAttributes<SVGPathElement>>, "class"> &
  TrapezoidOwnProps;

export const Trapezoid = (props: TrapezoidProps): JSX.Element => {
  const x = (): number => props.x ?? 0;
  const y = (): number => props.y ?? 0;
  const upperWidth = (): number => props.upperWidth ?? 0;
  const lowerWidth = (): number => props.lowerWidth ?? 0;
  const height = (): number => props.height ?? 0;

  const valid = (): boolean =>
    !(
      x() !== +x() ||
      y() !== +y() ||
      upperWidth() !== +upperWidth() ||
      lowerWidth() !== +lowerWidth() ||
      height() !== +height() ||
      (upperWidth() === 0 && lowerWidth() === 0) ||
      height() === 0
    );

  const isUpdateAnimationActive = (): boolean => props.isUpdateAnimationActive ?? false;
  const animationDuration = (): AnimationDuration => props.animationDuration ?? 1500;
  const animationEasing = (): EasingInput => props.animationEasing ?? "ease";
  const animationBegin = (): number => props.animationBegin ?? 0;

  const layerClass = (): Array<string | undefined> => ["recharts-trapezoid", props.class];

  // Animation (update path) state: a ref to read the path length + prev-value
  // closures the animation interpolates from. The ref only captures the element
  // (refs fire before the dynamic `d` lands, where getTotalLength() is 0/throws);
  // the measuring effect runs after attributes land and re-measures on geometry
  // change.
  let pathEl: SVGPathElement | undefined;
  const [totalLength, setTotalLength] = createSignal(-1);
  const measurePath = (el: SVGPathElement): void => {
    pathEl = el;
  };
  createEffect(
    () => ({
      x: x(),
      y: y(),
      upperWidth: upperWidth(),
      lowerWidth: lowerWidth(),
      height: height(),
    }),
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
    () => ({
      x: x(),
      y: y(),
      upperWidth: upperWidth(),
      lowerWidth: lowerWidth(),
      height: height(),
    }),
    "trapezoid-",
  );

  // Seed prev-values without a tracked top-level read (untrack avoids STRICT_READ).
  let prevUpperWidth = untrack(upperWidth);
  let prevLowerWidth = untrack(lowerWidth);
  let prevHeight = untrack(height);
  let prevX = untrack(x);
  let prevY = untrack(y);

  const staticPath = (): JSX.Element => (
    <path
      {...svgPropertiesAndEvents({ ...omit(props, "class") })}
      class={layerClass()}
      d={getTrapezoidPath(x(), y(), upperWidth(), lowerWidth(), height())}
    />
  );

  return (
    <Show when={valid()}>
      <g>
        <Show when={isUpdateAnimationActive()} fallback={staticPath()}>
          {/* Keyed on animationId: a geometry change → new id → this recreates
              the JavascriptAnimate, restarting the animation from the (updated)
              prev values — the Solid equivalent of recharts' key={animationId}. */}
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
                  // The render-prop child is NOT an auto-tracking scope: read a
                  // per-frame SNAPSHOT via untrack (prop changes restart the
                  // animation via the keyed id, so each invocation sees fresh
                  // values; untrack also clears STRICT_READ).
                  const snap = untrack(() => ({
                    uw: upperWidth(),
                    lw: lowerWidth(),
                    h: height(),
                    cx: x(),
                    cy: y(),
                    len: totalLength(),
                    dur: animationDuration(),
                    easing: animationEasing(),
                  }));
                  const currUpperWidth = interpolate(prevUpperWidth, snap.uw, t);
                  const currLowerWidth = interpolate(prevLowerWidth, snap.lw, t);
                  const currHeight = interpolate(prevHeight, snap.h, t);
                  const currX = interpolate(prevX, snap.cx, t);
                  const currY = interpolate(prevY, snap.cy, t);
                  if (pathEl) {
                    prevUpperWidth = currUpperWidth;
                    prevLowerWidth = currLowerWidth;
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
                  const dashStyle: JSX.CSSProperties =
                    t > 0 ? { transition, "stroke-dasharray": to } : { "stroke-dasharray": from };
                  // `props.style` may be a string in Solid JSX; only merge object styles.
                  const userStyle: JSX.CSSProperties =
                    typeof props.style === "object" && props.style != null ? props.style : {};
                  return (
                    <path
                      {...svgPropertiesAndEvents({ ...omit(props, "class", "style") })}
                      ref={measurePath}
                      class={layerClass()}
                      d={getTrapezoidPath(currX, currY, currUpperWidth, currLowerWidth, currHeight)}
                      style={{ ...dashStyle, ...userStyle }}
                    />
                  );
                }}
              </JavascriptAnimate>
            )}
          </Show>
        </Show>
      </g>
    </Show>
  );
};
