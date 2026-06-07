// Ported from recharts 3.8.1 src/component/responsiveContainerUtils.ts (commit 7a23854).
// Deviations: `CSSProperties` from csstype (camelCase, matching React's), and the
// `satisfies Partial<Props>` on the defaults is dropped (the ResponsiveContainer
// component is deferred) — kept as `as const`.
import type { JSX } from "@solidjs/web";
import { isPercent } from "../util/DataUtils";
import type { Percent } from "../util/types";

export const defaultResponsiveContainerProps = {
  width: "100%",
  height: "100%",
  debounce: 0,
  minWidth: 0,
  initialDimension: {
    width: -1,
    height: -1,
  },
} as const;

export const calculateChartDimensions = (
  containerWidth: number | undefined,
  containerHeight: number | undefined,
  props: {
    width: Percent | number | undefined;
    height: Percent | number | undefined;
    aspect: number | undefined;
    maxHeight: number | undefined;
  },
): { calculatedWidth: number | undefined; calculatedHeight: number | undefined } => {
  const {
    width = defaultResponsiveContainerProps.width,
    height = defaultResponsiveContainerProps.height,
    aspect,
    maxHeight,
  } = props;

  // containerWidth/Height are already percentage-based (set as that percentage in
  // CSS), so no percentage math is needed here.
  let calculatedWidth: number | undefined = isPercent(width) ? containerWidth : Number(width);
  let calculatedHeight: number | undefined = isPercent(height) ? containerHeight : Number(height);

  if (aspect && aspect > 0) {
    // Preserve the desired aspect ratio (default to width).
    if (calculatedWidth) {
      calculatedHeight = calculatedWidth / aspect;
    } else if (calculatedHeight) {
      calculatedWidth = calculatedHeight * aspect;
    }

    if (maxHeight && calculatedHeight != null && calculatedHeight > maxHeight) {
      calculatedHeight = maxHeight;
    }
  }

  return { calculatedWidth, calculatedHeight };
};

type ResponsiveInnerDivStyle = JSX.CSSProperties & {
  overflowX?: "visible";
  overflowY?: "visible";
};

const bothOverflow: ResponsiveInnerDivStyle = {
  width: 0,
  height: 0,
  overflow: "visible",
};
const overflowX: ResponsiveInnerDivStyle = {
  width: 0,
  overflowX: "visible",
};
const overflowY: ResponsiveInnerDivStyle = {
  height: 0,
  overflowY: "visible",
};
const noStyle: ResponsiveInnerDivStyle = {};

/**
 * The zero-size, overflow-visible style lets the chart shrink. Without it the
 * chart fills the ResponsiveContainer and the container always keeps the chart's
 * size, so the ResizeObserver never fires. With a zero-size element the chart
 * never fills the container — it's only visible because it overflows. (Trick from
 * react-virtualized-auto-sizer.) Not needed when a dimension is a fixed number or
 * undefined (the chart can't shrink in that dimension anyway).
 */
export const getInnerDivStyle = (props: {
  width?: Percent | number;
  height?: Percent | number;
}): ResponsiveInnerDivStyle => {
  const { width, height } = props;
  const isWidthPercent = isPercent(width);
  const isHeightPercent = isPercent(height);

  if (isWidthPercent && isHeightPercent) {
    return bothOverflow;
  }
  if (isWidthPercent) {
    return overflowX;
  }
  if (isHeightPercent) {
    return overflowY;
  }
  return noStyle;
};

export function getDefaultWidthAndHeight({
  width,
  height,
  aspect,
}: {
  width: Percent | number | undefined;
  height: Percent | number | undefined;
  aspect: number | undefined;
}): { width: Percent | number | undefined; height: Percent | number | undefined } {
  let calculatedWidth = width;
  let calculatedHeight = height;

  if (calculatedWidth === undefined && calculatedHeight === undefined) {
    calculatedWidth = defaultResponsiveContainerProps.width;
    calculatedHeight = defaultResponsiveContainerProps.height;
  } else if (calculatedWidth === undefined) {
    calculatedWidth = aspect && aspect > 0 ? undefined : defaultResponsiveContainerProps.width;
  } else if (calculatedHeight === undefined) {
    calculatedHeight = aspect && aspect > 0 ? undefined : defaultResponsiveContainerProps.height;
  }

  return { width: calculatedWidth, height: calculatedHeight };
}
