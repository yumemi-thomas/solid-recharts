// Ported from recharts 3.8.1 src/state/SetLegendPayload.tsx (commit 7a23854).
//
// Registers a graphical item's legend payload. Deviations: the two useLayoutEffects
// → createEffect (add/replace) + onCleanup (remove), the effect-dispatch idiom; an
// explicit `id` prop (the graphical item's id) keys the entry so replace/remove are
// proxy-safe (recharts matches the array by reference, which Solid stores break).
// `SetPolarLegendPayload` lands with the polar vertical. Returns nothing.
import type { JSX } from "@solidjs/web";
import { useAppStore } from "./hooks";
import { useIsPanorama } from "../context/PanoramaContext";
import { LegendPayload } from "../component/DefaultLegendContent";
import { registerInStore } from "./registerInStore";

interface LegendPayloadEntry {
  id: string;
  items: ReadonlyArray<LegendPayload>;
}

export function SetLegendPayload(props: {
  id: string;
  legendPayload: ReadonlyArray<LegendPayload>;
}): JSX.Element {
  const store = useAppStore();
  const isPanorama = useIsPanorama();

  // Panorama mirrors never contribute to the legend. The entry is keyed by id
  // (recharts matches the array by reference, which Solid stores break), so
  // replace/remove rebuild the `{ id, items: [] }` lookup key from prev.
  if (store != null && !isPanorama) {
    registerInStore<LegendPayloadEntry>(() => ({ id: props.id, items: props.legendPayload }), {
      add: (next) => store.actions.legend.addLegendPayload(next),
      replace: (prev, next) =>
        store.actions.legend.replaceLegendPayload({
          prev: { id: prev.id, items: [] },
          next,
        }),
      remove: (prev) => store.actions.legend.removeLegendPayload({ id: prev.id, items: [] }),
    });
  }

  return null;
}
