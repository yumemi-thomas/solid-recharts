import { type CamelSvgProps } from "../util/svgPropertiesNoEvents";
import { svgPropertiesAndEvents } from "../util/svgPropertiesAndEvents";
import { omit } from "solid-js";
import type { JSX } from "@solidjs/web";

export interface CartesianViewBox {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

interface SurfaceOwnProps {
  width: number | string;
  height: number | string;
  viewBox?: CartesianViewBox;
  style?: JSX.CSSProperties;
  children?: JSX.Element;
  title?: string;
  desc?: string;
  ref?: SVGSVGElement | ((el: SVGSVGElement) => void);
  /** Maps to recharts' `className` (a plain string); the array `class` form below merges it. */
  class?: string;
}

// Props parity with recharts SurfaceProps; `class` (vs `className: string`) is the only framework
// deviation. We Omit the wide SVG `class` so ours stays `string`, matching recharts and keeping the
// native array `class` form typed.
export type SurfaceProps = Omit<
  CamelSvgProps<JSX.SvgSVGAttributes<SVGSVGElement>>,
  "viewBox" | "style" | "class"
> &
  SurfaceOwnProps;

/**
 * Renders an SVG element. All charts include a Surface; you would not normally use this directly.
 */
export const Surface = (props: SurfaceProps) => {
  const svgView = () => props.viewBox ?? { width: props.width, height: props.height, x: 0, y: 0 };
  const rest = omit(
    props,
    "children",
    "width",
    "height",
    "viewBox",
    "class",
    "style",
    "title",
    "desc",
    "ref",
  );

  // Parity with recharts Surface: the passthrough props go through the SVG
  // filter (camelCase props → DOM attribute names), not a verbatim spread.
  return (
    <svg
      {...svgPropertiesAndEvents({ ...rest })}
      class={["recharts-surface", props.class]}
      width={props.width}
      height={props.height}
      style={props.style}
      viewBox={`${svgView().x ?? 0} ${svgView().y ?? 0} ${svgView().width} ${svgView().height}`}
      ref={props.ref}
    >
      <title>{props.title}</title>
      <desc>{props.desc}</desc>
      {props.children}
    </svg>
  );
};
