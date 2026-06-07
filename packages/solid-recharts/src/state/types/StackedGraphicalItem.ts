// Ported from recharts 3.8.1 src/state/types/StackedGraphicalItem.ts (commit 7a23854).
import { GraphicalItemSettings } from "../graphicalItemsSlice";
import { NormalizedStackId } from "../../util/ChartUtils";
import { DataKey } from "../../util/types";

/**
 * Some graphical items allow data stacking. The stacks are optional, so all
 * props here are optional too.
 */
export interface MaybeStackedGraphicalItem extends GraphicalItemSettings {
  stackId: NormalizedStackId | undefined;
  /**
   * Bars have a size but Area does not.
   */
  barSize: number | string | undefined;
}

/**
 * Items that are actually stacked because the user provided both `stackId` and
 * `dataKey`.
 */
export interface DefinitelyStackedGraphicalItem extends MaybeStackedGraphicalItem {
  stackId: NormalizedStackId;
  dataKey: DataKey<unknown>;
}

export function isStacked<T extends GraphicalItemSettings>(
  graphicalItem: T,
): graphicalItem is T & DefinitelyStackedGraphicalItem {
  return (
    "stackId" in graphicalItem && graphicalItem.stackId != null && graphicalItem.dataKey != null
  );
}
