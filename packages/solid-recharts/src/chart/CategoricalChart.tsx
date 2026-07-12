// Ported from recharts 3.8.1 src/chart/CategoricalChart.tsx (commit 7a23854).
//
// Solid deviations: `forwardRef` → `ref` prop; no destructuring (omit + props);
// `className` → `class`. The `compact` (Brush panorama) branch is deferred. Event
// handlers are not forwarded yet (RechartsWrapper is render-only).
import { omit } from "solid-js";
import type { JSX } from "@solidjs/web";
import { RootSurface } from "../container/RootSurface";
import { RechartsWrapper } from "./RechartsWrapper";
import { ClipPathProvider } from "../container/ClipPathProvider";
import { CartesianChartProps } from "../util/types";
import { svgPropertiesNoEventsKeepCase } from "../util/svgPropertiesNoEvents";

export interface CategoricalChartProps extends CartesianChartProps {
  ref?: SVGSVGElement | ((el: SVGSVGElement) => void);
}

export const CategoricalChart = (props: CategoricalChartProps): JSX.Element => {
  const attrs = (): Record<string, unknown> =>
    svgPropertiesNoEventsKeepCase({
      ...omit(
        props,
        "width",
        "height",
        "responsive",
        "children",
        "class",
        "style",
        "compact",
        "title",
        "desc",
        "ref",
      ),
    });

  return (
    <RechartsWrapper
      class={props.class}
      style={props.style}
      width={props.width}
      height={props.height}
      responsive={props.responsive ?? false}
      onClick={props.onClick}
      onMouseLeave={props.onMouseLeave}
      onMouseEnter={props.onMouseEnter}
      onMouseMove={props.onMouseMove}
      onMouseDown={props.onMouseDown}
      onMouseUp={props.onMouseUp}
      onContextMenu={props.onContextMenu}
      onDoubleClick={props.onDoubleClick}
      onTouchStart={props.onTouchStart}
      onTouchMove={props.onTouchMove}
      onTouchEnd={props.onTouchEnd}
    >
      <RootSurface otherAttributes={attrs()} title={props.title} desc={props.desc} ref={props.ref}>
        <ClipPathProvider>{props.children}</ClipPathProvider>
      </RootSurface>
    </RechartsWrapper>
  );
};
