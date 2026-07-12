import { type CamelSvgProps } from "../util/svgPropertiesNoEvents";
import { svgPropertiesAndEvents } from "../util/svgPropertiesAndEvents";
import { Show, omit } from "solid-js";
import type { JSX } from "@solidjs/web";
import { isNumber } from "../util/DataUtils";

interface DotOwnProps {
  /** The x-coordinate of center, in pixels. */
  cx?: number;
  /** The y-coordinate of center, in pixels. */
  cy?: number;
  /** The radius of the dot. */
  r?: number | string;
  clipDot?: boolean;
  /** Maps to recharts' `className` (a plain string); the array `class` form below merges it. */
  class?: string;
}

// Props parity with recharts DotProps; `class` is the only framework-idiomatic deviation
// (recharts' public prop is `className: string`). We Omit the wide SVG `class` so our
// `class` stays `string`, matching recharts and keeping the native array `class` form typed.
export type DotProps = Omit<
  CamelSvgProps<JSX.CircleSVGAttributes<SVGCircleElement>>,
  "cx" | "cy" | "r" | "class"
> &
  DotOwnProps;

/**
 * Renders a dot. Accepts X/Y coordinates in pixels; for data-positioned dots use ReferenceDot.
 *
 * Solid handles event props (onClick, ...) via delegation, so they never render as attributes —
 * recharts achieves the same via svgPropertiesNoEvents + adaptEventHandlers. clipDot is omitted
 * because it is not a valid SVG attribute.
 */
export const Dot = (props: DotProps) => {
  const rest = omit(props, "class", "cx", "cy", "r", "clipDot");

  return (
    <Show when={isNumber(props.cx) && isNumber(props.cy) && isNumber(props.r)}>
      <circle
        {...svgPropertiesAndEvents({ ...rest })}
        class={["recharts-dot", props.class]}
        cx={props.cx}
        cy={props.cy}
        r={props.r}
      />
    </Show>
  );
};
