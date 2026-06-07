// Ported from recharts 3.8.1 src/context/useTooltipAxis.ts (commit 7a23854) —
// the `useTooltipAxisBandSize` slice the Cursor needs. Deviation: returns an
// Accessor (Solid reactive-hook convention); the full useTooltipAxis hook (the
// axis settings object) lands when more consumers need it.
import { Accessor } from "solid-js";
import { useAppSelector } from "../state/hooks";
import {
  selectTooltipAxis,
  selectTooltipAxisScale,
  selectTooltipAxisTicks,
} from "../state/selectors/tooltipSelectors";
import { getBandSizeOfAxis } from "../util/ChartUtils";

export const useTooltipAxisBandSize = (): Accessor<number | undefined> => {
  return useAppSelector((state) => {
    const tooltipAxis = selectTooltipAxis(state);
    const tooltipTicks = selectTooltipAxisTicks(state);
    const tooltipAxisScale = selectTooltipAxisScale(state);
    if (!tooltipAxis || !tooltipAxisScale) {
      return getBandSizeOfAxis(undefined, tooltipTicks);
    }
    return getBandSizeOfAxis({ ...tooltipAxis, scale: tooltipAxisScale }, tooltipTicks);
  });
};
