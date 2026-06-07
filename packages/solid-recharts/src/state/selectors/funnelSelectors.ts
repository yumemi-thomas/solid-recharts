// Ported from recharts 3.8.1 src/state/selectors/funnelSelectors.ts (commit 7a23854).
// Solid-native plain selector (no reselect). The funnel settings are RESOLVED FROM
// PROPS (not a graphical-items slice) and passed in directly — the only store reads
// are the chart offset and chart-level data. Cells + per-row presentation merge here,
// mirroring the reference (cell props win over data, which wins over presentation).
import { computeFunnelTrapezoids, FunnelTrapezoidItem } from "../../cartesian/Funnel";
import { ChartData } from "../chartDataSlice";
import { RechartsRootState } from "../store";
import { selectChartOffsetInternal } from "./selectChartOffsetInternal";
import { selectChartDataAndAlwaysIgnoreIndexes } from "./dataSelectors";
import { DataKey, TooltipType } from "../../util/types";
import type { CellProps } from "../../component/Cell";
import { GraphicalItemId } from "../graphicalItemsSlice";

export type ResolvedFunnelSettings = {
  dataKey: DataKey<unknown> | undefined;
  data: ChartData | undefined;
  nameKey: DataKey<unknown> | undefined;
  tooltipType?: TooltipType;
  lastShapeType?: "triangle" | "rectangle";
  reversed?: boolean;
  customWidth?: string | number;
  cells: ReadonlyArray<CellProps>;
  presentationProps: Record<string, unknown> | null;
  id: GraphicalItemId;
};

/** Spread an unknown data entry into a plain record (`{}` for non-objects). */
const toRecord = (entry: unknown): Record<string, unknown> =>
  typeof entry === "object" && entry != null ? { ...entry } : {};

export const selectFunnelTrapezoids = (
  state: RechartsRootState,
  funnelSettings: ResolvedFunnelSettings,
): ReadonlyArray<FunnelTrapezoidItem> => {
  const offset = selectChartOffsetInternal(state);
  const { chartData } = selectChartDataAndAlwaysIgnoreIndexes(state);
  const {
    data,
    dataKey,
    nameKey,
    tooltipType,
    lastShapeType,
    reversed,
    customWidth,
    cells,
    presentationProps,
    id: graphicalItemId,
  } = funnelSettings;

  let source: ChartData | undefined;
  if (data != null && data.length > 0) {
    source = data;
  } else if (chartData != null && chartData.length > 0) {
    source = chartData;
  }

  let displayedData: ReadonlyArray<Record<string, unknown>>;
  if (source && source.length > 0) {
    displayedData = source.map((entry, index) => ({
      payload: entry,
      ...presentationProps,
      ...toRecord(entry),
      ...toRecord(cells[index]),
    }));
  } else if (cells.length > 0) {
    displayedData = cells.map((cell) => ({ ...presentationProps, ...toRecord(cell) }));
  } else {
    return [];
  }

  return computeFunnelTrapezoids({
    dataKey,
    nameKey,
    displayedData,
    tooltipType,
    lastShapeType,
    reversed,
    offset,
    customWidth,
    graphicalItemId,
  });
};
