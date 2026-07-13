// Partial port of recharts 3.8.1 src/util/BarUtils.tsx (commit 7a23854).
//
// Exports `BarRectangle`/`defaultBarShape` for background bars and custom shapes;
// `MinPointSize` + `minPointSizeCallback` for computeBarRectangles.
import { createMemo, omit } from "solid-js";
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
  // Snapshot of every prop except `option`. `omit` (not native
  // `{ option, ...rest }`) is required because callers may pass a merged props
  // proxy (e.g. `<BarRectangle {...rect} isActive={…} />`), whose rest-destructure
  // fails to exclude `option` and leaks it to custom shape/background functions.
  // Spreading into a plain object keeps the downstream <Shape> reads a static
  // snapshot (no STRICT_READ), while the memo re-runs when any prop changes.
  const shapeProps = createMemo((): BarRectangleShapeProps => ({ ...omit(props, "option") }));
  return (
    <Shape<BarRectangleShapeProps, SVGPathElement>
      option={props.option}
      DefaultShape={defaultBarShape}
      shapeProps={shapeProps()}
      activeClass="recharts-active-bar"
      inactiveClass="recharts-inactive-bar"
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
  // `_defaultValue` is part of the callback's signature but unreachable at runtime:
  // the only branch that returned it now throws (see below), as upstream's
  // tiny-invariant did. Kept positionally for API parity.
  (minPointSize: MinPointSize, _defaultValue = 0) =>
    (value: unknown, index: number): number => {
      if (isNumber(minPointSize)) {
        return minPointSize;
      }
      const isValueNumberOrNil = isNumber(value) || isNullish(value);
      if (isValueNumberOrNil) {
        return minPointSize(value, index);
      }

      // Reached only when the value is neither a number nor nil; upstream asserts
      // this via tiny-invariant, which always throws here — a plain throw is
      // behavior-equivalent and drops the dependency.
      throw new Error(
        `minPointSize callback function received a value with type of ${typeof value}. Currently only numbers or null/undefined are supported.`,
      );
    };
