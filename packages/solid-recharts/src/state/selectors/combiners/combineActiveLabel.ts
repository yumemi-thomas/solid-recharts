// Ported from recharts 3.8.1 src/state/selectors/combiners/combineActiveLabel.ts.
import { TickItem } from "../../../util/types";
import { TooltipIndex } from "../../tooltipSlice";
import { isNan } from "../../../util/DataUtils";
import { ActiveLabel } from "../../../synchronisation/types";

export const combineActiveLabel = (
  tooltipTicks: ReadonlyArray<TickItem> | undefined,
  activeIndex: TooltipIndex,
): ActiveLabel => {
  const n = Number(activeIndex);
  if (isNan(n) || activeIndex == null) {
    return undefined;
  }
  const value = n >= 0 ? tooltipTicks?.[n]?.value : undefined;
  // Deviation: recharts types `TickItem.value` as `any` and returns it directly;
  // the port types it `unknown`, so narrow to the declared ActiveLabel shape.
  // A Date-valued tick (date axis) yields `undefined` here — that path lands with
  // date-axis support; categorical (string/number) labels are unaffected.
  return typeof value === "string" || typeof value === "number" ? value : undefined;
};
