// Ported from recharts 3.8.1 src/util/FunnelUtils.tsx (commit 7a23854).
//
// `<FunnelTrapezoid>` renders a funnel trapezoid through the shared `<Shape>`
// helper: it draws the `option` (function/object/default) and wraps it in a
// `<Layer>` g whose class is `recharts-active-shape` when `isActive` is true.
// Deviations: `Props as FunnelProps` → the local `FunnelTrapezoidItem` import; the
// React element-form `option` constituent is dropped (Solid has no cloneElement —
// function + object + boolean forms are supported, matching ActiveShapeUtils). The
// `option` is typed as the wider `ActiveShape` the `<Shape>` helper accepts (the
// `<Funnel>` `shape`/`activeShape` function-form props are assignable to it).
import type { JSX } from "@solidjs/web";
import { Trapezoid } from "../shape/Trapezoid";
import { Shape } from "./ActiveShapeUtils";
import type { ActiveShape, ShapeAnimationProps } from "./types";
import type { FunnelTrapezoidItem } from "../cartesian/Funnel";

export const defaultFunnelShape = Trapezoid;

type FunnelTrapezoidShapeProps = FunnelTrapezoidItem & ShapeAnimationProps & { isActive: boolean };

export type FunnelTrapezoidProps = {
  option: ActiveShape<FunnelTrapezoidShapeProps, SVGPathElement> | undefined;
} & FunnelTrapezoidShapeProps;

export function FunnelTrapezoid(props: FunnelTrapezoidProps): JSX.Element {
  const shapeProps = (): FunnelTrapezoidShapeProps => {
    const { option: _option, ...rest } = props;
    return rest;
  };
  return (
    <Shape<FunnelTrapezoidShapeProps, SVGPathElement>
      option={props.option}
      DefaultShape={defaultFunnelShape}
      shapeProps={shapeProps()}
    />
  );
}
