// Ported from recharts 3.8.1 src/state/types/RadialBarSettings.ts (commit 7a23854).
import { MaybeStackedGraphicalItem } from "./StackedGraphicalItem";
import { BasePolarGraphicalItemSettings } from "../graphicalItemsSlice";

export interface RadialBarSettings
  extends BasePolarGraphicalItemSettings, MaybeStackedGraphicalItem {
  type: "radialBar";
  minPointSize: number;
  maxBarSize: number | undefined;
}
