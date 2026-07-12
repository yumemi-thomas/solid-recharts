// Ported from recharts 3.8.1 src/state/SetTooltipEntrySettings.tsx (commit 7a23854).
//
// Deviations: the two useLayoutEffects become a single createEffect (add/replace
// on change) + onCleanup (remove), the same effect-dispatch idiom Line/Bar/Area
// use for their graphical-item registration. Returns null (renders nothing) — it
// exists purely to register the item's tooltip payload entry in the store.
import { createEffect } from "solid-js";
import type { JSX } from "@solidjs/web";
import { useAppStore } from "./hooks";
import { TooltipPayloadConfiguration } from "./tooltipSlice";
import { useIsPanorama } from "../context/PanoramaContext";
import { unregisterOnCleanup } from "./unregisterOnCleanup";

export function SetTooltipEntrySettings(props: {
  tooltipEntrySettings: TooltipPayloadConfiguration;
}): JSX.Element {
  const store = useAppStore();
  const isPanorama = useIsPanorama();

  let prev: TooltipPayloadConfiguration | null = null;

  createEffect(
    () => props.tooltipEntrySettings,
    (settings) => {
      if (store == null || isPanorama) {
        // Panorama graphical items never contribute to the Tooltip payload.
        return;
      }
      if (prev === null) {
        store.actions.tooltip.addTooltipEntrySettings(settings);
      } else if (prev !== settings) {
        store.actions.tooltip.replaceTooltipEntrySettings({ prev, next: settings });
      }
      prev = settings;
    },
  );

  unregisterOnCleanup(() => {
    if (prev && store != null) {
      store.actions.tooltip.removeTooltipEntrySettings(prev);
      prev = null;
    }
  });

  return null;
}
