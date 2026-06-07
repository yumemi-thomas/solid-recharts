// Ported from recharts 3.8.1 src/state/SetLegendPayload.tsx (commit 7a23854).
//
// Registers a graphical item's legend payload. Deviations: the two useLayoutEffects
// → createEffect (add/replace) + onCleanup (remove), the effect-dispatch idiom; an
// explicit `id` prop (the graphical item's id) keys the entry so replace/remove are
// proxy-safe (recharts matches the array by reference, which Solid stores break).
// `SetPolarLegendPayload` lands with the polar vertical. Returns nothing.
import { createEffect, onCleanup } from "solid-js";
import type { JSX } from "@solidjs/web";
import { useAppStore } from "./hooks";
import { useIsPanorama } from "../context/PanoramaContext";
import { LegendPayload } from "../component/DefaultLegendContent";

export function SetLegendPayload(props: {
  id: string;
  legendPayload: ReadonlyArray<LegendPayload>;
}): JSX.Element {
  const store = useAppStore();
  const isPanorama = useIsPanorama();

  let prevId: string | null = null;

  createEffect(
    () => ({ id: props.id, items: props.legendPayload }),
    (entry) => {
      if (store == null || isPanorama) {
        return;
      }
      if (prevId === null) {
        store.actions.legend.addLegendPayload(entry);
      } else {
        store.actions.legend.replaceLegendPayload({
          prev: { id: prevId, items: [] },
          next: entry,
        });
      }
      prevId = entry.id;
    },
  );

  onCleanup(() => {
    if (prevId != null && store != null) {
      store.actions.legend.removeLegendPayload({ id: prevId, items: [] });
      prevId = null;
    }
  });

  return null;
}
