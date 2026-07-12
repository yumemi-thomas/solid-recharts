/**
 * @fileOverview Cross
 *
 * Ported from recharts 3.8.1 src/shape/Cross.tsx (commit 7a23854).
 * Solid deviations: `className` (recharts) → `class: string` (and Omit the wide
 * SVG `class` so the array form typechecks); destructuring defaults → `?? 0`
 * accessors; `clsx` → `class={[...]}`; `return null` → `<Show>`.
 */
import { type CamelSvgProps } from "../util/svgPropertiesNoEvents";
import { Show, omit } from "solid-js";
import type { JSX } from "@solidjs/web";
import { isNumber } from "../util/DataUtils";
import { svgPropertiesAndEvents } from "../util/svgPropertiesAndEvents";

interface CrossOwnProps {
  /** The x-coordinate of the vertical line of the cross in pixels. */
  x?: number;
  /** The y-coordinate of the horizontal line of the cross in pixels. */
  y?: number;
  /** Width of the cross in pixels. */
  width?: number;
  /** Height of the cross in pixels. */
  height?: number;
  /** The y-coordinate of the top left point in the boundary box of the cross. */
  top?: number;
  /** The x-coordinate of the top left point in the boundary box of the cross. */
  left?: number;
  class?: string;
}

export type CrossProps = Omit<CamelSvgProps<JSX.PathSVGAttributes<SVGPathElement>>, "class"> &
  CrossOwnProps;

const getPath = (
  x: number,
  y: number,
  width: number,
  height: number,
  top: number,
  left: number,
): string => {
  return `M${x},${top}v${height}M${left},${y}h${width}`;
};

export const Cross = (props: CrossProps): JSX.Element => {
  const x = (): number => props.x ?? 0;
  const y = (): number => props.y ?? 0;
  const top = (): number => props.top ?? 0;
  const left = (): number => props.left ?? 0;
  const width = (): number => props.width ?? 0;
  const height = (): number => props.height ?? 0;

  const valid = (): boolean =>
    isNumber(x()) &&
    isNumber(y()) &&
    isNumber(width()) &&
    isNumber(height()) &&
    isNumber(top()) &&
    isNumber(left());

  // recharts spreads `{ x, y, top, left, width, height, ...rest }` through the
  // SVG-prop filter; only allowlisted keys (x, y, width, height, …) survive onto
  // the <path>. `top`/`left`/`class` are filtered/handled separately.
  const passthrough = (): Record<string, unknown> => ({
    ...omit(props, "class"),
    x: x(),
    y: y(),
    top: top(),
    left: left(),
    width: width(),
    height: height(),
  });

  return (
    <Show when={valid()}>
      <path
        {...svgPropertiesAndEvents(passthrough())}
        class={["recharts-cross", props.class]}
        d={getPath(x(), y(), width(), height(), top(), left())}
      />
    </Show>
  );
};
