// Ported from recharts 3.8.1 src/state/selectors/brushSelectors.ts (commit 7a23854).
//
// Computes the brush's pixel rectangle from the registered BrushSettings + the
// chart offset: explicit x/y/width win, otherwise the brush spans the plot width
// and sits just below the plot area (the offset reserves `brush.height` at the
// bottom and exposes `brushBottom` = the pre-brush bottom offset).
import { RechartsRootState } from "../store";
import { Margin } from "../../util/types";
import { isNumber } from "../../util/DataUtils";
import { selectChartOffsetInternal } from "./selectChartOffsetInternal";
import { selectMargin } from "./containerSelectors";

export interface BrushDimensions {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BrushSettings {
  padding: Margin;
}

export const selectBrushSettings = (state: RechartsRootState): BrushSettings | undefined => ({
  padding: state.brush.padding,
});

export const selectBrushDimensions = (state: RechartsRootState): BrushDimensions => {
  const brush = state.brush;
  const offset = selectChartOffsetInternal(state);
  const margin = selectMargin(state);
  return {
    height: brush.height,
    x: isNumber(brush.x) ? brush.x : offset.left,
    y: isNumber(brush.y)
      ? brush.y
      : offset.top + offset.height + offset.brushBottom - (margin.bottom || 0),
    width: isNumber(brush.width) ? brush.width : offset.width,
  };
};
