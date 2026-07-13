// Ported from recharts 3.8.1 src/state/SetTooltipEntrySettings.tsx (commit 7a23854).
//
// Deviations: the two useLayoutEffects become a single createEffect (add/replace
// on change) + onCleanup (remove), the same effect-dispatch idiom Line/Bar/Area
// use for their graphical-item registration. Returns null (renders nothing) — it
// exists purely to register the item's tooltip payload entry in the store.
import type { JSX } from "@solidjs/web";
import { useAppStore } from "./hooks";
import { TooltipPayloadConfiguration } from "./tooltipSlice";
import { useIsPanorama } from "../context/PanoramaContext";
import { registerInStore } from "./registerInStore";

export function SetTooltipEntrySettings(props: {
  tooltipEntrySettings: TooltipPayloadConfiguration;
}): JSX.Element {
  const store = useAppStore();
  const isPanorama = useIsPanorama();

  // Panorama graphical items never contribute to the Tooltip payload.
  if (store != null && !isPanorama) {
    registerInStore<TooltipPayloadConfiguration>(() => props.tooltipEntrySettings, {
      add: (next) => store.actions.tooltip.addTooltipEntrySettings(next),
      replace: (prev, next) => store.actions.tooltip.replaceTooltipEntrySettings({ prev, next }),
      remove: (prev) => store.actions.tooltip.removeTooltipEntrySettings(prev),
    });
  }

  return null;
}
