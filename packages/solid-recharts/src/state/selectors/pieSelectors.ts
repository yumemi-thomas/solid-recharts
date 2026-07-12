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
import type { LegendPayload } from "../../component/DefaultLegendContent";
import { getTooltipNameProp, getValueByDataKey } from "../../util/ChartUtils";

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
  cells?: ReadonlyArray<CellProps>,
): ChartData | undefined => {
  const pieSettings = selectSynchronisedPieSettings(state, id);
  if (pieSettings == null) {
    return undefined;
  }
  if (pieSettings.data != null && pieSettings.data.length > 0) {
    return pieSettings.data;
  }
  const chartData = selectChartDataAndAlwaysIgnoreIndexes(state).chartData;
  if (chartData != null && chartData.length > 0) {
    return chartData;
  }
  // recharts: when the Pie has neither its own data nor inherited chart data, the
  // <Cell> children become the data rows (each cell's props is a row).
  if (cells != null && cells.length > 0) {
    return cells;
  }
  return chartData;
};

/**
 * One legend entry per displayed-data row. `value` is the row name (via nameKey),
 * `color` is the per-row fill (a matching <Cell> wins over the Pie fill), `payload`
 * is the raw row, `type` is the Pie legendType, and `dataKey` is the Pie dataKey.
 */
export const selectPieLegend = (
  state: RechartsRootState,
  id: GraphicalItemId,
  cells?: ReadonlyArray<CellProps>,
): ReadonlyArray<LegendPayload> | undefined => {
  const pieSettings = selectSynchronisedPieSettings(state, id);
  const displayedData = selectDisplayedData(state, id, cells);
  if (pieSettings == null || displayedData == null) {
    return undefined;
  }
  return displayedData.map((entry, i): LegendPayload => {
    const row: Record<string, unknown> =
      typeof entry === "object" && entry != null ? { ...entry } : {};
    const cell = cells?.[i];
    const cellFill = typeof cell?.fill === "string" ? cell.fill : undefined;
    const rowFill = typeof row.fill === "string" ? row.fill : undefined;
    // recharts: name defaults to pieSettings.name (NOT the row index), then
    // getTooltipNameProp falls back to the dataKey string when name is nullish.
    const nameRaw: unknown = getValueByDataKey(entry, pieSettings.nameKey, pieSettings.name);
    return {
      value: getTooltipNameProp(nameRaw, pieSettings.dataKey),
      color: cellFill ?? rowFill ?? pieSettings.fill,
      type: pieSettings.legendType,
      payload: typeof entry === "object" && entry != null ? entry : undefined,
      dataKey: pieSettings.dataKey,
    };
  });
};

export const selectPieSectors = (
  state: RechartsRootState,
  id: GraphicalItemId,
  cells?: ReadonlyArray<CellProps>,
): ReadonlyArray<PieSectorDataItem> | undefined => {
  const displayedData = selectDisplayedData(state, id, cells);
  const pieSettings = selectSynchronisedPieSettings(state, id);
  if (pieSettings == null || displayedData == null) {
    return undefined;
  }
  const offset: ChartOffsetInternal = selectChartOffsetInternal(state);
  return computePieSectors({ offset, pieSettings, displayedData, cells });
};
