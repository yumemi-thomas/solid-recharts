// Ported from recharts 3.8.1 src/util/cursor/getCursorRectangle.ts (commit 7a23854).
// Pure function — no framework surface — behavior is byte-identical to recharts.

import { ChartCoordinate, ChartOffsetInternal, LayoutType } from "../types";

export type CursorRectangle = {
  stroke: string;
  fill: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export function getCursorRectangle(
  layout: LayoutType,
  activeCoordinate: ChartCoordinate,
  offset: ChartOffsetInternal,
  tooltipAxisBandSize: number,
): CursorRectangle {
  const halfSize = tooltipAxisBandSize / 2;

  return {
    stroke: "none",
    fill: "#ccc",
    x: layout === "horizontal" ? activeCoordinate.x - halfSize : offset.left + 0.5,
    y: layout === "horizontal" ? offset.top + 0.5 : activeCoordinate.y - halfSize,
    width: layout === "horizontal" ? tooltipAxisBandSize : offset.width - 1,
    height: layout === "horizontal" ? offset.height - 1 : tooltipAxisBandSize,
  };
}
