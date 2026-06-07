// Ported from recharts 3.8.1 src/types.ts (commit 7a23854).
// Public chart-geometry types (distinct from the internal `util/types`).

/**
 * Defines the blank space between the chart and the plot area. This blank space
 * is occupied by supporting elements like axes, legends, and brushes, plus any
 * margins applied to the chart.
 */
export type ChartOffset = {
  /** Distance from the top edge of the chart to the top edge of the plot area. */
  readonly top: number;
  /**
   * Distance from the bottom edge of the chart to the bottom edge of the plot
   * area. This is a distance, not a coordinate — it can be 0 in a fine big chart.
   */
  readonly bottom: number;
  /** Distance from the left edge of the chart to the left edge of the plot area. */
  readonly left: number;
  /**
   * Distance from the right edge of the chart to the right edge of the plot area.
   * This is a distance, not a coordinate — it can be 0 in a fine big chart.
   */
  readonly right: number;
};

/**
 * Plot area is the area where the actual chart data is rendered (bars, lines,
 * scatter points, etc.).
 */
export type PlotArea = {
  /** The width of the plot area (`chartWidth - offset.left - offset.right`). */
  readonly width: number;
  /** The height of the plot area (`chartHeight - offset.top - offset.bottom`). */
  readonly height: number;
  /** The x coordinate of the top-left corner of the plot area (`offset.left`). */
  readonly x: number;
  /** The y coordinate of the top-left corner of the plot area (`offset.top`). */
  readonly y: number;
};
