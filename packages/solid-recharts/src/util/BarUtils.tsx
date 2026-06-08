// Partial port of recharts 3.8.1 src/util/BarUtils.tsx (commit 7a23854).
//
// Exports `BarRectangle`/`defaultBarShape` for background bars and custom shapes;
// `MinPointSize` + `minPointSizeCallback` for computeBarRectangles.
import invariant from "tiny-invariant";
import { createMemo } from "solid-js";
import type { JSX } from "@solidjs/web";
import { Rectangle, type RectangleProps } from "../shape/Rectangle";
import type { BarShapeProps } from "../cartesian/Bar";
import { Shape } from "./ActiveShapeUtils";
import { ActiveShape, DataKey } from "./types";
import { isNullish, isNumber } from "./DataUtils";

export const defaultBarShape = Rectangle;

/** Background shape props omit `value`/`tooltipPosition` (recharts BarBackground L499). */
export type BarRectangleProps = Omit<BarShapeProps, "value" | "tooltipPosition" | "background"> & {
  option: ActiveShape<BarShapeProps, SVGPathElement> | undefined;
  onMouseEnter?: (e: MouseEvent) => void;
  onMouseLeave?: (e: MouseEvent) => void;
  onClick?: (e: MouseEvent) => void;
  onTransitionEnd?: (e: TransitionEvent) => void;
  dataKey: DataKey<unknown> | undefined;
  class?: string;
} & Omit<RectangleProps, "onAnimationStart" | "onAnimationEnd">;

type BarRectangleShapeProps = Omit<BarRectangleProps, "option">;

export function BarRectangle(props: BarRectangleProps): JSX.Element {
  const shapeProps = createMemo((): BarRectangleShapeProps => {
    const { option: _option, ...rest } = props;
    void _option;
    return rest;
  });
  return (
    <Shape<BarRectangleShapeProps, SVGPathElement>
      option={props.option}
      DefaultShape={defaultBarShape}
      shapeProps={shapeProps()}
      activeClassName="recharts-active-bar"
      inActiveClassName="recharts-inactive-bar"
    />
  );
}

/**
 * A bar's minimum rendered size in pixels, so very small values stay visible.
 * Either a fixed number or a function of the value and its index.
 */
export type MinPointSize = number | ((value: number | undefined | null, index: number) => number);

/**
 * Safely gets minPointSize from the minPointSize prop if it is a function
 * @param minPointSize minPointSize as passed to the Bar component
 * @param defaultValue default minPointSize
 * @returns minPointSize
 */
export const minPointSizeCallback =
  (minPointSize: MinPointSize, defaultValue = 0) =>
  (value: unknown, index: number): number => {
    if (isNumber(minPointSize)) {
      return minPointSize;
    }
    const isValueNumberOrNil = isNumber(value) || isNullish(value);
    if (isValueNumberOrNil) {
      return minPointSize(value, index);
    }

    invariant(
      isValueNumberOrNil,
      `minPointSize callback function received a value with type of ${typeof value}. Currently only numbers or null/undefined are supported.`,
    );
    return defaultValue;
  };
