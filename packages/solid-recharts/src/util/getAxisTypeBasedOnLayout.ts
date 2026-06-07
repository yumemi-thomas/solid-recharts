// Ported from recharts 3.8.1 src/util/getAxisTypeBasedOnLayout.ts (commit 7a23854).
import { AxisDomainTypeInput, AxisType, EvaluatedAxisDomainType, LayoutType } from "./types";
import { isCategoricalAxis } from "./ChartUtils";

/**
 * Evaluates the "auto" axis domain type based on the chart layout and axis type,
 * producing a definitive axis domain type for further processing.
 */
export function getAxisTypeBasedOnLayout(
  layout: LayoutType | undefined,
  axisType: AxisType,
  axisDomainType: AxisDomainTypeInput,
): EvaluatedAxisDomainType | undefined {
  if (axisDomainType !== "auto") {
    return axisDomainType;
  }
  if (layout == null) {
    return undefined;
  }
  return isCategoricalAxis(layout, axisType) ? "category" : "number";
}
