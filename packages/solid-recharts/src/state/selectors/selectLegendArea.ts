import type { CartesianViewBoxRequired } from "../../util/types";
import type { RechartsRootState } from "../store";
import { selectChartHeight, selectChartWidth, selectMargin } from "./containerSelectors";

export const selectLegendArea = (state: RechartsRootState): CartesianViewBoxRequired => {
  const margin = selectMargin(state);
  return {
    x: margin.left || 0,
    y: margin.top || 0,
    width: Math.max(selectChartWidth(state) - (margin.left || 0) - (margin.right || 0), 0),
    height: Math.max(selectChartHeight(state) - (margin.top || 0) - (margin.bottom || 0), 0),
  };
};
