// Public hooks barrel — ported from recharts 3.8.1 src/hooks.ts (commit 7a23854).
//
// Solid deviation: every hook returns an Accessor (Solid reactivity) rather than
// a bare value. Consumers call `useXAxisScale()()` (the accessor, then the scale
// fn). The axis inverse-data-snap hooks are DEFERRED (need selectSortedDataPoints,
// not yet ported); the tick-snap + plain inverse hooks are ported.
import { type Accessor, createMemo } from "solid-js";
import { type AxisId, defaultAxisId } from "./state/cartesianAxisSlice";
import {
  type BaseAxisWithScale,
  selectAxisDomain,
  selectAxisInverseScale,
  selectAxisInverseTickSnapScale,
  selectAxisScale,
  selectAxisWithScale,
  selectRenderedTicksOfAxis,
} from "./state/selectors/axisSelectors";
import { useAppSelector } from "./state/hooks";
import { useIsPanorama } from "./context/PanoramaContext";
import { selectChartOffset } from "./state/selectors/selectChartOffset";
import { selectPlotArea, type PlotArea } from "./state/selectors/selectPlotArea";
import { selectActiveTooltipDataPoints } from "./state/selectors/tooltipSelectors";
import type { ChartOffset } from "./types";
import type { BandPosition } from "./util/scale/RechartsScale";
import type { CategoricalDomain, Coordinate, NumberDomain, TickItem } from "./util/types";

/**
 * Converts a data value to a pixel coordinate (optionally positioned within a
 * band for banded scales). Returns `undefined` if the value is out of domain.
 */
export type ScaleFunction = (
  value: unknown,
  options?: { position?: BandPosition },
) => number | undefined;

/** Converts a pixel coordinate back to a data value. */
export type InverseScaleFunction = (pixelValue: number) => unknown;

export const useXAxis = (xAxisId: AxisId): Accessor<BaseAxisWithScale | undefined> => {
  const isPanorama = useIsPanorama();
  return useAppSelector((state) => selectAxisWithScale(state, "xAxis", xAxisId, isPanorama));
};

export const useYAxis = (yAxisId: AxisId): Accessor<BaseAxisWithScale | undefined> => {
  const isPanorama = useIsPanorama();
  return useAppSelector((state) => selectAxisWithScale(state, "yAxis", yAxisId, isPanorama));
};

/** Maps data values to pixel coordinates for an XAxis. @since 3.8 */
export const useXAxisScale = (
  xAxisId: AxisId = defaultAxisId,
): Accessor<ScaleFunction | undefined> => {
  const isPanorama = useIsPanorama();
  const scale = useAppSelector((state) => selectAxisScale(state, "xAxis", xAxisId, isPanorama));
  // Wrap (not `scale()?.map`) so we don't reference an unbound method — and the
  // returned function stays stable while the scale is unchanged.
  return createMemo<ScaleFunction | undefined>(() => {
    const s = scale();
    return s == null ? undefined : (value, options) => s.map(value, options);
  });
};

/** Maps data values to pixel coordinates for a YAxis. @since 3.8 */
export const useYAxisScale = (
  yAxisId: AxisId = defaultAxisId,
): Accessor<ScaleFunction | undefined> => {
  const isPanorama = useIsPanorama();
  const scale = useAppSelector((state) => selectAxisScale(state, "yAxis", yAxisId, isPanorama));
  return createMemo<ScaleFunction | undefined>(() => {
    const s = scale();
    return s == null ? undefined : (value, options) => s.map(value, options);
  });
};

/** Maps pixel coordinates back to data values for an XAxis. @since 3.8 */
export const useXAxisInverseScale = (
  xAxisId: AxisId = defaultAxisId,
): Accessor<InverseScaleFunction | undefined> => {
  const isPanorama = useIsPanorama();
  return useAppSelector((state) => selectAxisInverseScale(state, "xAxis", xAxisId, isPanorama));
};

/** Maps pixel coordinates back to data values for a YAxis. @since 3.8 */
export const useYAxisInverseScale = (
  yAxisId: AxisId = defaultAxisId,
): Accessor<InverseScaleFunction | undefined> => {
  const isPanorama = useIsPanorama();
  return useAppSelector((state) => selectAxisInverseScale(state, "yAxis", yAxisId, isPanorama));
};

/** Inverse XAxis scale that snaps to the nearest rendered tick value. @since 3.8 */
export const useXAxisInverseTickSnapScale = (
  xAxisId: AxisId = defaultAxisId,
): Accessor<InverseScaleFunction | undefined> =>
  useAppSelector((state) => selectAxisInverseTickSnapScale(state, "xAxis", xAxisId));

/** Inverse YAxis scale that snaps to the nearest rendered tick value. @since 3.8 */
export const useYAxisInverseTickSnapScale = (
  yAxisId: AxisId = defaultAxisId,
): Accessor<InverseScaleFunction | undefined> =>
  useAppSelector((state) => selectAxisInverseTickSnapScale(state, "yAxis", yAxisId));

/** The ticks an XAxis rendered. @since 3.8 */
export const useXAxisTicks = (
  xAxisId: AxisId = defaultAxisId,
): Accessor<ReadonlyArray<TickItem> | undefined> =>
  useAppSelector((state) => selectRenderedTicksOfAxis(state, "xAxis", xAxisId));

/** The ticks a YAxis rendered. @since 3.8 */
export const useYAxisTicks = (
  yAxisId: AxisId = defaultAxisId,
): Accessor<ReadonlyArray<TickItem> | undefined> =>
  useAppSelector((state) => selectRenderedTicksOfAxis(state, "yAxis", yAxisId));

/** The domain of an XAxis. @since 3.8 */
export const useXAxisDomain = (
  xAxisId: AxisId = defaultAxisId,
): Accessor<NumberDomain | CategoricalDomain | undefined> => {
  const isPanorama = useIsPanorama();
  return useAppSelector((state) => selectAxisDomain(state, "xAxis", xAxisId, isPanorama));
};

/** The domain of a YAxis. @since 3.8 */
export const useYAxisDomain = (
  yAxisId: AxisId = defaultAxisId,
): Accessor<NumberDomain | CategoricalDomain | undefined> => {
  const isPanorama = useIsPanorama();
  return useAppSelector((state) => selectAxisDomain(state, "yAxis", yAxisId, isPanorama));
};

/** A data point with x and y values in data coordinates. */
export type CartesianDataPoint = {
  x: number | string;
  y: number | string;
};

/**
 * Converts a data point to pixel coordinates (combines useXAxisScale and
 * useYAxisScale). Returns `undefined` if conversion isn't possible. @since 3.8
 */
export const useCartesianScale = (
  dataPoint: CartesianDataPoint,
  xAxisId: AxisId = defaultAxisId,
  yAxisId: AxisId = defaultAxisId,
): Accessor<Coordinate | undefined> => {
  const xScale = useXAxisScale(xAxisId);
  const yScale = useYAxisScale(yAxisId);
  return createMemo<Coordinate | undefined>(() => {
    const xs = xScale();
    const ys = yScale();
    if (xs == null || ys == null) {
      return undefined;
    }
    const pixelX = xs(dataPoint.x);
    const pixelY = ys(dataPoint.y);
    if (pixelX == null || pixelY == null) {
      return undefined;
    }
    return { x: pixelX, y: pixelY };
  });
};

/**
 * The chart offset in pixels (the blank space around the plot area occupied by
 * axes, legend, and brush). @since 3.1
 */
export const useOffset = (): Accessor<ChartOffset | undefined> => useAppSelector(selectChartOffset);

/**
 * The plot area — the inner region where graphical items render (chart minus
 * margin, axes, and legend). @since 3.1
 */
export const usePlotArea = (): Accessor<PlotArea | undefined> => useAppSelector(selectPlotArea);

/** Data points currently visible in the tooltip. @since 3.1 */
export const useActiveTooltipDataPoints = (): Accessor<ReadonlyArray<unknown> | undefined> =>
  useAppSelector(selectActiveTooltipDataPoints);
