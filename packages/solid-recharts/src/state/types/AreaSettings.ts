// Ported from recharts 3.8.1 src/state/types/AreaSettings.ts (commit 7a23854).
// Deviations: `BaseValue` imported from '../../util/types' (where it already
// lives) instead of the unported '../../cartesian/Area'; `DataKey<any>` →
// `DataKey<unknown>`.
import { BaseValue, DataKey } from "../../util/types";
import { ChartData } from "../chartDataSlice";
import { MaybeStackedGraphicalItem } from "./StackedGraphicalItem";
import { BaseCartesianGraphicalItemSettings } from "../graphicalItemsSlice";

export type AreaSettings = BaseCartesianGraphicalItemSettings &
  MaybeStackedGraphicalItem & {
    type: "area";
    connectNulls: boolean;
    baseValue: BaseValue | undefined;
    dataKey: DataKey<unknown>;
    data: ChartData | undefined;
  };
