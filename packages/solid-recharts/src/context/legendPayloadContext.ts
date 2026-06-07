// Ported from recharts 3.8.1 src/context/legendPayloadContext.ts (commit 7a23854).
// Deviation: returns an Accessor (Solid reactive-hook convention).
import { Accessor } from "solid-js";
import { LegendPayload } from "../component/DefaultLegendContent";
import { useAppSelector } from "../state/hooks";
import { selectLegendPayload } from "../state/selectors/legendSelectors";

/** Reads the current Legend items (for Legend or anywhere reading legend payload). */
export function useLegendPayload(): Accessor<ReadonlyArray<LegendPayload> | undefined> {
  return useAppSelector(selectLegendPayload);
}
