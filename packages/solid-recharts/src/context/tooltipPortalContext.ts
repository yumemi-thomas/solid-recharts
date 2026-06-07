// Ported from recharts 3.8.1 src/context/tooltipPortalContext.tsx (commit 7a23854).
//
// Deviation: recharts stores the portal element directly (`HTMLElement | null`)
// via useState, which re-renders consumers when the ref attaches. Solid context
// values are fixed at provide time, so the context instead carries an
// `Accessor<HTMLElement | null>` — the wrapper sets a signal from its portal-div
// ref, and <Tooltip> reads it reactively (null until the wrapper mounts). Default
// accessor returns null (outside a provider).
import { Accessor, createContext, useContext } from "solid-js";

export const TooltipPortalContext = createContext<Accessor<HTMLElement | null>>(() => null);

export const useTooltipPortal = (): Accessor<HTMLElement | null> =>
  useContext(TooltipPortalContext);
