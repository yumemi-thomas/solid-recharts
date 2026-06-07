// Ported from recharts 3.8.1
// src/state/selectors/combiners/combineDisplayedStackedData.ts (commit 7a23854).
// Deviation: the reference's `knownItemsByDataKey.get(...)!` non-null assertion
// is banned here — replaced with a `?? {}` fallback (identical behavior).
import { ChartDataState } from "../../chartDataSlice";
import { BaseCartesianAxis } from "../../cartesianAxisSlice";
import { getStackSeriesIdentifier } from "../../../util/stacks/getStackSeriesIdentifier";
import { getValueByDataKey } from "../../../util/ChartUtils";
import { StackSeriesIdentifier } from "../../../util/stacks/stackTypes";
import { DefinitelyStackedGraphicalItem } from "../../types/StackedGraphicalItem";

/**
 * One data point in a stacked chart: each key is a series identifier and the
 * value is the numeric value for that series (using the numerical axis dataKey).
 * The dataKey can't be a unique identifier (items may share one), so the series
 * identifier is used instead.
 */
export type DisplayedStackedDataPoint = Record<StackSeriesIdentifier, number>;

export type DisplayedStackedData = ReadonlyArray<DisplayedStackedDataPoint>;

export function combineDisplayedStackedData(
  stackedGraphicalItems: ReadonlyArray<DefinitelyStackedGraphicalItem>,
  { chartData = [] }: ChartDataState,
  tooltipAxisSettings: BaseCartesianAxis,
): DisplayedStackedData {
  const { allowDuplicatedCategory, dataKey: tooltipDataKey } = tooltipAxisSettings;

  const knownItemsByDataKey = new Map<string | number, DisplayedStackedDataPoint>();

  stackedGraphicalItems.forEach((item) => {
    // If the item has no own data, use the root chart data; if neither, skip.
    const resolvedData = item.data ?? chartData;
    if (resolvedData == null || resolvedData.length === 0) {
      return;
    }
    const stackIdentifier = getStackSeriesIdentifier(item);
    resolvedData.forEach((entry, index) => {
      const tooltipValue =
        tooltipDataKey == null || allowDuplicatedCategory
          ? index
          : String(getValueByDataKey(entry, tooltipDataKey, null));
      const numericValue = getValueByDataKey(entry, item.dataKey, 0);
      const curr = knownItemsByDataKey.get(tooltipValue) ?? {};
      Object.assign(curr, { [stackIdentifier]: numericValue });
      knownItemsByDataKey.set(tooltipValue, curr);
    });
  });
  return Array.from(knownItemsByDataKey.values());
}
