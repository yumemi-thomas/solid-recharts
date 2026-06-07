// Ported from recharts 3.8.1 src/state/types/BarSettings.ts (commit 7a23854).
import { MinPointSize } from "../../util/BarUtils";
import { MaybeStackedGraphicalItem } from "./StackedGraphicalItem";
import { BaseCartesianGraphicalItemSettings } from "../graphicalItemsSlice";

export type BarSettings = BaseCartesianGraphicalItemSettings &
  MaybeStackedGraphicalItem & {
    type: "bar";
    maxBarSize: number | undefined;
    minPointSize: MinPointSize;
    /**
     * When true, zero-dimension bars are not filtered out because the custom
     * shape may still render something visible.
     */
    hasCustomShape: boolean;
  };
