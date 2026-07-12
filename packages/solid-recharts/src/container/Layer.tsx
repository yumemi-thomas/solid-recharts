// Ported from recharts 3.8.1 src/container/Layer.tsx (commit 7a23854).
// Solid deviations: `className` → `class` (Omit the wide SVG `class`); `clsx` →
// `class={[...]}`; `forwardRef` → `ref` prop; no destructuring (omit + props).
import { type CamelSvgProps } from "../util/svgPropertiesNoEvents";
import { omit } from "solid-js";
import type { JSX } from "@solidjs/web";
import { svgPropertiesAndEvents } from "../util/svgPropertiesAndEvents";

interface LayerOwnProps {
  class?: string;
  children?: JSX.Element;
  ref?: SVGGElement | ((el: SVGGElement) => void);
}

// Omit class/children/ref from the SVG attrs so LayerOwnProps owns them cleanly
// (avoids a `children`/`ref` intersection that breaks `{...spread}` forwarding).
export type LayerProps = Omit<
  CamelSvgProps<JSX.GSVGAttributes<SVGGElement>>,
  "class" | "children" | "ref"
> &
  LayerOwnProps;

/**
 * Creates an SVG group element to group other SVG elements.
 *
 * @link https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/g
 */
export const Layer = (props: LayerProps): JSX.Element => {
  return (
    <g
      class={["recharts-layer", props.class]}
      {...svgPropertiesAndEvents({ ...omit(props, "class", "children", "ref") })}
      ref={props.ref}
    >
      {props.children}
    </g>
  );
};
