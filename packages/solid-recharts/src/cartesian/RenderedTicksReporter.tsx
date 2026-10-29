// Ported from recharts 3.8.1 src/cartesian/CartesianAxis.tsx RenderedTicksReporter
// (commit 7a23854).
//
// Reports an axis's rendered ticks into the renderedTicks slice so the public
// useXAxisTicks/useYAxisTicks hooks (and the tick-snap inverse scale) can read
// them. Solid deviation: useEffect add + cleanup remove → createEffect + onCleanup
// (the same effect-dispatch idiom the other Report* components use).
import { createEffect } from "solid-js";
import type { JSX } from "@solidjs/web";
import { useAppStore } from "../state/hooks";
import type { AxisId } from "../state/cartesianAxisSlice";
import type { CartesianTickItem, TickItem } from "../util/types";
import { unregisterOnCleanup } from "../state/unregisterOnCleanup";

// recharts compares the reported ticks with es-toolkit `isEqual` (deep): the four tick
// fields are flat, except that a time-scale tick value may be a Date, compared by time.
const tickValuesAreEqual = (left: unknown, right: unknown): boolean =>
  Object.is(left, right) ||
  (left instanceof Date && right instanceof Date && left.getTime() === right.getTime());

function ticksAreEqual(left: ReadonlyArray<TickItem>, right: ReadonlyArray<TickItem>): boolean {
  return (
    left.length === right.length &&
    left.every((tick, index) => {
      const other = right[index];
      return (
        other != null &&
        tickValuesAreEqual(tick.value, other.value) &&
        Object.is(tick.coordinate, other.coordinate) &&
        Object.is(tick.offset, other.offset) &&
        Object.is(tick.index, other.index)
      );
    })
  );
}

export function RenderedTicksReporter(props: {
  axisType: "xAxis" | "yAxis";
  axisId: AxisId;
  ticks: ReadonlyArray<CartesianTickItem>;
}): JSX.Element {
  const store = useAppStore();
  let prev: { axisType: "xAxis" | "yAxis"; axisId: AxisId } | null = null;
  let lastDispatched:
    | { axisType: "xAxis" | "yAxis"; axisId: AxisId; ticks: ReadonlyArray<TickItem> }
    | undefined;

  createEffect(
    (): { axisType: "xAxis" | "yAxis"; axisId: AxisId; ticks: ReadonlyArray<TickItem> } => ({
      axisType: props.axisType,
      axisId: props.axisId,
      // Expose only the external tick shape (drop internal props).
      ticks: props.ticks.map((t) => ({
        value: t.value,
        coordinate: t.coordinate,
        offset: t.offset,
        index: t.index,
      })),
    }),
    (payload) => {
      if (
        lastDispatched != null &&
        lastDispatched.axisId === payload.axisId &&
        lastDispatched.axisType === payload.axisType &&
        ticksAreEqual(lastDispatched.ticks, payload.ticks)
      ) {
        return;
      }
      store?.actions.renderedTicks.setRenderedTicks(payload);
      lastDispatched = payload;
      prev = { axisType: payload.axisType, axisId: payload.axisId };
    },
  );

  unregisterOnCleanup(() => {
    if (prev != null) {
      store?.actions.renderedTicks.removeRenderedTicks(prev);
      prev = null;
    }
  });

  return null;
}
