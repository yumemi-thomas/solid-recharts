// Ported from recharts 3.8.1 src/state/selectors/pieSelectors.ts (commit 7a23854).
//
// FULL SOLID-NATIVE REWRITE: reselect `createSelector` → plain functions
// (memoization via `useAppSelector`'s `createMemo`).
//
// MINIMAL PORT. Deferred (documented): the `cells` parameter + Cell-derived
// displayedData (no Cells), and `selectPieLegend` (legend wiring is a follow-up).
// `selectUnfilteredPolarItems` is inlined here (polarSelectors not ported yet).
import { RechartsRootState } from "../store";
import { GraphicalItemId, PolarGraphicalItemSettings } from "../graphicalItemsSlice";
import { selectChartDataAndAlwaysIgnoreIndexes } from "./dataSelectors";
import { ChartData } from "../chartDataSlice";
import { ChartOffsetInternal } from "../../util/types";
import { selectChartOffsetInternal } from "./selectChartOffsetInternal";
import { PieSettings } from "../types/PieSettings";
import { computePieSectors, PieSectorDataItem } from "../../polar/Pie";
import type { CellProps } from "../../component/Cell";

const selectUnfilteredPolarItems = (
  state: RechartsRootState,
): ReadonlyArray<PolarGraphicalItemSettings> => state.graphicalItems.polarItems;

export const selectSynchronisedPieSettings = (
  state: RechartsRootState,
  id: GraphicalItemId,
): PieSettings | undefined =>
  selectUnfilteredPolarItems(state)
    .filter((item) => item.type === "pie")
    .find((item) => item.id === id);

export const selectDisplayedData = (
  state: RechartsRootState,
  id: GraphicalItemId,
): ChartData | undefined => {
  const pieSettings = selectSynchronisedPieSettings(state, id);
  if (pieSettings == null) {
    return undefined;
  }
  if (pieSettings.data != null && pieSettings.data.length > 0) {
    return pieSettings.data;
  }
  return selectChartDataAndAlwaysIgnoreIndexes(state).chartData;
};

export const selectPieSectors = (
  state: RechartsRootState,
  id: GraphicalItemId,
  cells?: ReadonlyArray<CellProps>,
): ReadonlyArray<PieSectorDataItem> | undefined => {
  const displayedData = selectDisplayedData(state, id);
  const pieSettings = selectSynchronisedPieSettings(state, id);
  if (pieSettings == null || displayedData == null) {
    return undefined;
  }
  const offset: ChartOffsetInternal = selectChartOffsetInternal(state);
  return computePieSectors({ offset, pieSettings, displayedData, cells });
};
