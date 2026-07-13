// Ported from recharts 3.8.1 src/util/ActiveShapeUtils.tsx (commit 7a23854).
//
// `<Shape>` renders a user-defined shape option in several forms: a function
// (render prop), a partial-props object (merged into the default shape), or a
// boolean/undefined (default shape). Deviations: the React-element option
// (cloneElement) is dropped — Solid has no cloneElement, and ActiveShape no longer
// includes the element constituent; the default shape is rendered via `<Dynamic>`.
// `className`→`class`.
import { Layer } from "../container/Layer";
import type { JSX } from "@solidjs/web";
import { Dynamic } from "@solidjs/web";
import { ActiveShape } from "./types";

type ShapeRenderer<PropsType> = (props: PropsType) => JSX.Element;

export type ShapeProps<PropsType extends object, ElementType extends SVGElement = SVGElement> = {
  option: ActiveShape<PropsType, ElementType> | undefined;
  DefaultShape: ShapeRenderer<PropsType>;
  shapeProps: PropsType;
  activeClass?: string;
  inactiveClass?: string;
};

function mergeShapeProps<PropsType extends object>(
  option: Partial<PropsType>,
  props: PropsType,
): PropsType {
  return { ...props, ...option };
}

function getShapeIndex(shapeProps: object): string | number | undefined {
  if (!("index" in shapeProps)) {
    return undefined;
  }
  const { index } = shapeProps;
  return typeof index === "number" || typeof index === "string" ? index : undefined;
}

function isActiveShape(shapeProps: object): boolean {
  return "isActive" in shapeProps && shapeProps.isActive === true;
}

export function Shape<PropsType extends object, ElementType extends SVGElement = SVGElement>(
  props: ShapeProps<PropsType, ElementType>,
): JSX.Element {
  const renderShape = (): JSX.Element => {
    const option = props.option;
    if (option === props.DefaultShape) {
      return <Dynamic component={props.DefaultShape} {...props.shapeProps} />;
    }
    if (typeof option === "function") {
      return option(props.shapeProps, getShapeIndex(props.shapeProps));
    }
    if (option != null && typeof option === "object") {
      return (
        <Dynamic component={props.DefaultShape} {...mergeShapeProps(option, props.shapeProps)} />
      );
    }
    return <Dynamic component={props.DefaultShape} {...props.shapeProps} />;
  };

  return (
    <Layer
      class={
        isActiveShape(props.shapeProps)
          ? (props.activeClass ?? "recharts-active-shape")
          : (props.inactiveClass ?? "recharts-shape")
      }
    >
      {renderShape()}
    </Layer>
  );
}
