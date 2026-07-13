// Ported from recharts 3.8.1 src/state/selectors/combiners/combineRealScaleType.ts
// (commit 7a23854).
import * as d3Scales from "d3-scale";
import { RechartsScaleType } from "../../../util/types";
import { BaseCartesianAxis } from "../../cartesianAxisSlice";
import { upperFirst } from "../../../util/DataUtils";

// Deviation: the reference returns a `D3ScaleType` here via `as D3ScaleType`
// (banned in this repo). The name is only used in an `in` check, so a plain
// `string` return is equivalent and assertion-free.
function getD3ScaleName(name: string): string {
  return `scale${upperFirst(name)}`;
}

function isSupportedScaleName(name: string): name is RechartsScaleType {
  return getD3ScaleName(name) in d3Scales;
}

export const combineRealScaleType = (
  axisConfig: BaseCartesianAxis | undefined,
  hasBar: boolean,
  chartType: string,
): RechartsScaleType | undefined => {
  if (axisConfig == null) {
    return undefined;
  }
  const { scale, type } = axisConfig;
  if (scale === "auto") {
    if (
      type === "category" &&
      chartType &&
      (chartType.indexOf("LineChart") >= 0 ||
        chartType.indexOf("AreaChart") >= 0 ||
        (chartType.indexOf("ComposedChart") >= 0 && !hasBar))
    ) {
      return "point";
    }
    if (type === "category") {
      return "band";
    }

    return "linear";
  }
  if (typeof scale === "string") {
    return isSupportedScaleName(scale) ? scale : "point";
  }
  return undefined;
};
