// Ported from recharts 3.8.1 src/state/types/LineSettings.ts (commit 7a23854).
// Deviation: `DataKey<any>` → `DataKey<unknown>` (this repo bans `any`; the
// state layer stores the row-erased dataKey form).
import { ChartData } from "../chartDataSlice";
import { DataKey } from "../../util/types";
import { BaseCartesianGraphicalItemSettings } from "../graphicalItemsSlice";

export type LineSettings = BaseCartesianGraphicalItemSettings & {
  type: "line";
  data: ChartData | undefined;
  dataKey: DataKey<unknown> | undefined;
};
