// Ported from recharts 3.8.1 src/util/tooltip/translate.ts (commit 7a23854).
// Pure functions — no JSX/components.
// Deviations from reference:
//   - `clsx` replaced with hand-rolled class concatenation (no clsx dep, no class strings)
//   - `CSSProperties` from 'react' → `JSX.CSSProperties` from '@solidjs/web'

import type { JSX } from "@solidjs/web";
import { isNumber } from "../DataUtils";
import type { Coordinate, CartesianViewBox, AllowInDimension } from "../types";

export type Dimension2D = "x" | "y";

const CSS_CLASS_PREFIX = "recharts-tooltip-wrapper";

const TOOLTIP_HIDDEN: JSX.CSSProperties = { visibility: "hidden" };

export function getTooltipCSSClassName({
  coordinate,
  translateX,
  translateY,
}: {
  translateX: number | undefined;
  translateY: number | undefined;
  coordinate: Partial<Coordinate> | undefined;
}): string {
  const classes: Array<string> = [CSS_CLASS_PREFIX];
  if (isNumber(translateX) && coordinate && isNumber(coordinate.x) && translateX >= coordinate.x) {
    classes.push(`${CSS_CLASS_PREFIX}-right`);
  }
  if (isNumber(translateX) && coordinate && isNumber(coordinate.x) && translateX < coordinate.x) {
    classes.push(`${CSS_CLASS_PREFIX}-left`);
  }
  if (isNumber(translateY) && coordinate && isNumber(coordinate.y) && translateY >= coordinate.y) {
    classes.push(`${CSS_CLASS_PREFIX}-bottom`);
  }
  if (isNumber(translateY) && coordinate && isNumber(coordinate.y) && translateY < coordinate.y) {
    classes.push(`${CSS_CLASS_PREFIX}-top`);
  }
  return classes.join(" ");
}

export function getTooltipTranslateXY({
  allowEscapeViewBox,
  coordinate,
  key,
  offset,
  position,
  reverseDirection,
  tooltipDimension,
  viewBox,
  viewBoxDimension,
}: {
  allowEscapeViewBox: AllowInDimension;
  coordinate: Coordinate;
  key: Dimension2D;
  offset: number;
  position: Partial<Coordinate> | undefined;
  reverseDirection: AllowInDimension;
  tooltipDimension: number;
  viewBox: CartesianViewBox;
  viewBoxDimension: number | undefined;
}): number {
  if (position && isNumber(position[key])) {
    return position[key];
  }

  const negative = coordinate[key] - tooltipDimension - (offset > 0 ? offset : 0);
  const positive = coordinate[key] + offset;

  if (allowEscapeViewBox[key]) {
    return reverseDirection[key] ? negative : positive;
  }

  const viewBoxKey = viewBox[key];
  if (viewBoxKey == null) {
    return 0;
  }

  if (reverseDirection[key]) {
    const tooltipBoundary = negative;
    const viewBoxBoundary = viewBoxKey;
    if (tooltipBoundary < viewBoxBoundary) {
      return Math.max(positive, viewBoxKey);
    }
    return Math.max(negative, viewBoxKey);
  }

  if (viewBoxDimension == null) {
    return 0;
  }
  const tooltipBoundary = positive + tooltipDimension;
  const viewBoxBoundary = viewBoxKey + viewBoxDimension;
  if (tooltipBoundary > viewBoxBoundary) {
    return Math.max(negative, viewBoxKey);
  }
  return Math.max(positive, viewBoxKey);
}

export function getTransformStyle({
  translateX,
  translateY,
  useTranslate3d,
}: {
  useTranslate3d: boolean;
  translateX: number;
  translateY: number;
}): JSX.CSSProperties {
  return {
    transform: useTranslate3d
      ? `translate3d(${translateX}px, ${translateY}px, 0)`
      : `translate(${translateX}px, ${translateY}px)`,
  };
}

export function getTooltipTranslate({
  allowEscapeViewBox,
  coordinate,
  offsetTop,
  offsetLeft,
  position,
  reverseDirection,
  tooltipBox,
  useTranslate3d,
  viewBox,
}: {
  allowEscapeViewBox: AllowInDimension;
  coordinate: Coordinate | undefined;
  offsetTop: number;
  offsetLeft: number;
  position: Partial<Coordinate> | undefined;
  reverseDirection: AllowInDimension;
  tooltipBox: { width: number; height: number };
  useTranslate3d: boolean;
  viewBox: CartesianViewBox;
}): { cssProperties: JSX.CSSProperties; cssClasses: string } {
  let cssProperties: JSX.CSSProperties;
  let translateX: number | undefined;
  let translateY: number | undefined;
  if (tooltipBox.height > 0 && tooltipBox.width > 0 && coordinate) {
    translateX = getTooltipTranslateXY({
      allowEscapeViewBox,
      coordinate,
      key: "x",
      offset: offsetLeft,
      position,
      reverseDirection,
      tooltipDimension: tooltipBox.width,
      viewBox,
      viewBoxDimension: viewBox.width,
    });

    translateY = getTooltipTranslateXY({
      allowEscapeViewBox,
      coordinate,
      key: "y",
      offset: offsetTop,
      position,
      reverseDirection,
      tooltipDimension: tooltipBox.height,
      viewBox,
      viewBoxDimension: viewBox.height,
    });
    cssProperties = getTransformStyle({
      translateX,
      translateY,
      useTranslate3d,
    });
  } else {
    cssProperties = TOOLTIP_HIDDEN;
  }
  return {
    cssProperties,
    cssClasses: getTooltipCSSClassName({
      translateX,
      translateY,
      coordinate,
    }),
  };
}
