// Ported from recharts 3.8.1 src/state/selectors/combiners/combineBarSizeList.ts
// (commit 7a23854). Deviation: `DataKey<any>` → `DataKey<unknown>`.
import {
  DefinitelyStackedGraphicalItem,
  isStacked,
  MaybeStackedGraphicalItem,
} from "../../types/StackedGraphicalItem";
import { StackId } from "../../../util/ChartUtils";
import { SizeList } from "../barSelectors";
import { getPercentValue, isNullish } from "../../../util/DataUtils";
import { DataKey } from "../../../util/types";

const getBarSize = (
  globalSize: string | number | undefined,
  totalSize: number | undefined,
  selfSize: number | string | undefined,
): number | undefined => {
  const barSize: string | number | undefined = selfSize ?? globalSize;

  if (isNullish(barSize)) {
    return undefined;
  }
  return getPercentValue(barSize, totalSize, 0);
};

export type BarCategory = {
  stackId: StackId | undefined;
  /**
   * dataKeys of items stacked at this position. Either all sharing a stackId, or
   * a single-element array for an unstacked Bar.
   */
  dataKeys: ReadonlyArray<DataKey<unknown>>;
  /** Width (horizontal chart) or height (vertical chart) of this stack of items. */
  barSize: number | undefined;
};

export const combineBarSizeList = (
  allBars: ReadonlyArray<MaybeStackedGraphicalItem>,
  globalSize: string | number | undefined,
  totalSize: number | undefined,
): SizeList => {
  const initialValue: Record<StackId, Array<DefinitelyStackedGraphicalItem>> = {};

  const stackedBars: ReadonlyArray<DefinitelyStackedGraphicalItem> = allBars.filter(isStacked);
  const unstackedBars = allBars.filter((b) => b.stackId == null);

  const groupByStack: Record<StackId, Array<DefinitelyStackedGraphicalItem>> = stackedBars.reduce(
    (acc, bar) => {
      let s = acc[bar.stackId];
      if (s == null) {
        s = [];
      }
      s.push(bar);
      acc[bar.stackId] = s;
      return acc;
    },
    initialValue,
  );

  const stackedSizeList: SizeList = Object.entries(groupByStack).map(
    ([stackId, bars]): BarCategory => {
      const dataKeys = bars.map((b) => b.dataKey);
      const barSize: number | undefined = getBarSize(globalSize, totalSize, bars[0]?.barSize);
      return { stackId, dataKeys, barSize };
    },
  );

  const unstackedSizeList: SizeList = unstackedBars.map((b): BarCategory => {
    const dataKeys = [b.dataKey].filter((dk) => dk != null);
    const barSize: number | undefined = getBarSize(globalSize, totalSize, b.barSize);
    return { stackId: undefined, dataKeys, barSize };
  });

  return [...stackedSizeList, ...unstackedSizeList];
};
