// Ported from recharts 3.8.1 src/state/selectors/selectChartOffsetInternal.ts (commit 7a23854).
//
// The plot-area offset = margin + axis sizes + brush + legend. It adds the AXIS
// sizes (Y-axis widths on left/right, X-axis heights on top/bottom) — making
// graphical-item geometry exact with explicit <XAxis>/<YAxis> — the Brush height,
// and the Legend offset (`appendOffsetOfLegend`). The legend contribution uses the
// legend's MEASURED size, which is 0 until it renders/measures (and is 0 in jsdom),
// so the no-Legend path is exact and tests are unaffected.
// Solid-native: plain functions consumed via useAppSelector's createMemo.
import { RechartsRootState } from "../store";
import { CartesianViewBoxRequired, ChartOffsetInternal } from "../../util/types";
import { XAxisSettings, YAxisSettings } from "../cartesianAxisSlice";
import { selectChartWidth, selectChartHeight, selectMargin } from "./containerSelectors";
import { selectAllXAxes, selectAllYAxes } from "./selectAllAxes";
import { selectLegendSettings, selectLegendSize } from "./legendSelectors";
import { appendOffsetOfLegend } from "../../util/ChartUtils";
import { DEFAULT_Y_AXIS_WIDTH } from "../../util/Constants";

function selectLeftAxesOffset(state: RechartsRootState): number {
  return selectAllYAxes(state).reduce((result: number, entry: YAxisSettings): number => {
    if (entry.orientation === "left" && !entry.mirror && !entry.hide) {
      const width = typeof entry.width === "number" ? entry.width : DEFAULT_Y_AXIS_WIDTH;
      return result + width;
    }
    return result;
  }, 0);
}

function selectRightAxesOffset(state: RechartsRootState): number {
  return selectAllYAxes(state).reduce((result: number, entry: YAxisSettings): number => {
    if (entry.orientation === "right" && !entry.mirror && !entry.hide) {
      const width = typeof entry.width === "number" ? entry.width : DEFAULT_Y_AXIS_WIDTH;
      return result + width;
    }
    return result;
  }, 0);
}

function selectTopAxesOffset(state: RechartsRootState): number {
  return selectAllXAxes(state).reduce((result: number, entry: XAxisSettings): number => {
    if (entry.orientation === "top" && !entry.mirror && !entry.hide) {
      return result + entry.height;
    }
    return result;
  }, 0);
}

function selectBottomAxesOffset(state: RechartsRootState): number {
  return selectAllXAxes(state).reduce((result: number, entry: XAxisSettings): number => {
    if (entry.orientation === "bottom" && !entry.mirror && !entry.hide) {
      return result + entry.height;
    }
    return result;
  }, 0);
}

// recharts reads `state.brush.height`; the brush slice is now wired (default 0),
// so a chart without a Brush still contributes nothing here.
export const selectBrushHeight = (state: RechartsRootState): number => state.brush.height;

export const selectChartOffsetInternal = (state: RechartsRootState): ChartOffsetInternal => {
  const chartWidth = selectChartWidth(state);
  const chartHeight = selectChartHeight(state);
  const margin = selectMargin(state);
  const brushHeight = selectBrushHeight(state);

  const left = (margin.left || 0) + selectLeftAxesOffset(state);
  const right = (margin.right || 0) + selectRightAxesOffset(state);
  const top = (margin.top || 0) + selectTopAxesOffset(state);
  const bottom = (margin.bottom || 0) + selectBottomAxesOffset(state);

  // brushBottom is the bottom offset BEFORE the brush is added.
  const brushBottom = bottom;
  const bottomWithBrush = bottom + brushHeight;

  // Grow the offset to make room for the legend (no-op while its measured size
  // is 0 — i.e. no Legend, or before it measures / in jsdom).
  const withLegend = appendOffsetOfLegend(
    { top, right, bottom: bottomWithBrush, left },
    selectLegendSettings(state),
    selectLegendSize(state),
  );

  return {
    top: withLegend.top,
    bottom: withLegend.bottom,
    left: withLegend.left,
    right: withLegend.right,
    // never return negative width/height
    width: Math.max(0, chartWidth - withLegend.left - withLegend.right),
    height: Math.max(0, chartHeight - withLegend.top - withLegend.bottom),
    brushBottom,
  };
};

export const selectChartViewBox = (state: RechartsRootState): CartesianViewBoxRequired => {
  const offset = selectChartOffsetInternal(state);
  return {
    x: offset.left,
    y: offset.top,
    width: offset.width,
    height: offset.height,
  };
};

export const selectAxisViewBox = (state: RechartsRootState): CartesianViewBoxRequired => ({
  x: 0,
  y: 0,
  width: selectChartWidth(state),
  height: selectChartHeight(state),
});
