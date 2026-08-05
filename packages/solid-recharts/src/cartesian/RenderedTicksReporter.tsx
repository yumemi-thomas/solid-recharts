import { createEffect, on } from "solid-js";
// Ported from recharts 3.8.1 src/cartesian/CartesianAxis.tsx RenderedTicksReporter
// (commit 7a23854).
//
// Reports an axis's rendered ticks into the renderedTicks slice so the public
// useXAxisTicks/useYAxisTicks hooks (and the tick-snap inverse scale) can read
// them. Solid deviation: useEffect add + cleanup remove → createEffect + onCleanup
// (the same effect-dispatch idiom the other Report* components use).
import type { JSX } from "solid-js";
import { useAppStore } from "../state/hooks";
import type { AxisId } from "../state/cartesianAxisSlice";
import type { CartesianTickItem, TickItem } from "../util/types";
import { unregisterOnCleanup } from "../state/unregisterOnCleanup";
import { shallowEqual } from "../util/ShallowEqual";

function ticksAreEqual(left: ReadonlyArray<TickItem>, right: ReadonlyArray<TickItem>): boolean {
  return (
    left.length === right.length && left.every((tick, index) => shallowEqual(tick, right[index]))
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
    on(
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
    ),
  );

  unregisterOnCleanup(() => {
    if (prev != null) {
      store?.actions.renderedTicks.removeRenderedTicks(prev);
      prev = null;
    }
  });

  return null;
}
