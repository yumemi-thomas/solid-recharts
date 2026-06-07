// Ported from recharts 3.8.1 src/state/types/ScatterSettings.ts (commit 7a23854).
// Deviation: `DataKey<any>` → `DataKey<unknown>`.
import { ChartData } from "../chartDataSlice";
import { DataKey, TooltipType } from "../../util/types";
import { BaseCartesianGraphicalItemSettings } from "../graphicalItemsSlice";

export type ScatterSettings = BaseCartesianGraphicalItemSettings & {
  type: "scatter";
  data: ChartData | undefined;
  dataKey: DataKey<unknown> | undefined;
  tooltipType: TooltipType | undefined;
  name: string | number | undefined;
};
