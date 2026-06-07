/**
 * @fileOverview Trapezoid
 *
 * Ported from recharts 3.8.1 src/shape/Trapezoid.tsx (commit 7a23854).
 * Pure `getTrapezoidPath` copied verbatim. Solid deviations: `className` →
 * `class` (Omit the wide SVG `class`); destructuring defaults → `?? default`;
 * `clsx` → `class={[...]}`; `return null` → `<Show>`.
 *
 * DEFERRED: the update-animation path (`isUpdateAnimationActive`) drives
 * `JavascriptAnimate` with `getTotalLength`/`interpolate`/prev-value refs; its
 * behavior is coupled to React render/animation timing (Tier-B). Until that
 * lands, `Trapezoid` renders the static shape regardless of
 * `isUpdateAnimationActive` (the spec's animation case only asserts the shape
 * renders, which still holds).
 */
import { Show, omit } from "solid-js";
import type { JSX } from "@solidjs/web";
import type { AnimationDuration } from "../util/types";
import type { EasingInput } from "../animation/easing";
import { svgPropertiesAndEvents } from "../util/svgPropertiesAndEvents";
import { roundTemplateLiteral } from "../util/round";

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
  /** If true, the trapezoid renders with a gradual fade-in animation. @default false */
  isUpdateAnimationActive?: boolean;
  animationBegin?: number;
  animationDuration?: AnimationDuration;
  animationEasing?: EasingInput;
}

export type TrapezoidProps = Omit<JSX.PathSVGAttributes<SVGPathElement>, "class"> &
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

  const layerClass = (): Array<string | undefined> => ["recharts-trapezoid", props.class];

  return (
    <Show when={valid()}>
      <g>
        <path
          {...svgPropertiesAndEvents({ ...omit(props, "class") })}
          class={layerClass()}
          d={getTrapezoidPath(x(), y(), upperWidth(), lowerWidth(), height())}
        />
      </g>
    </Show>
  );
};
