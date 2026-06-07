// Ported from recharts 3.8.1 src/util/RadialBarUtils.tsx (commit 7a23854).
// Renders a RadialBar sector through the <Shape> abstraction (default = Sector).
import { omit } from "solid-js";
import type { JSX } from "@solidjs/web";
import { RadialBarDataItem, RadialBarProps } from "../polar/RadialBar";
import { Sector } from "../shape/Sector";
import { Shape } from "./ActiveShapeUtils";

export const defaultRadialBarShape = Sector;

export function parseCornerRadius(cornerRadius: string | number | undefined): number | undefined {
  if (typeof cornerRadius === "string") {
    return parseInt(cornerRadius, 10);
  }
  return cornerRadius;
}

export interface RadialBarSectorProps extends RadialBarDataItem {
  index: number;
  isActive: boolean;
}

type RadialBarSectorComponentProps = RadialBarSectorProps & {
  option: Exclude<RadialBarProps["shape"], undefined> | RadialBarProps["activeShape"];
};

export function RadialBarSector(props: RadialBarSectorComponentProps): JSX.Element {
  return (
    <Shape<RadialBarSectorProps, SVGPathElement>
      option={props.option}
      DefaultShape={defaultRadialBarShape}
      shapeProps={omit(props, "option")}
    />
  );
}
