// Ported from recharts 3.8.1 src/context/legendPortalContext.tsx (commit 7a23854).
//
// Deviation (same as tooltipPortalContext): the context carries an
// `Accessor<HTMLElement | null>` so the wrapper can set it reactively from its
// portal-div ref (Solid context values are fixed at provide time). Default
// accessor returns null (outside a provider).
import { Accessor, createContext, useContext } from "solid-js";

export const LegendPortalContext = createContext<Accessor<HTMLElement | null>>(() => null);

export const useLegendPortal = (): Accessor<HTMLElement | null> => useContext(LegendPortalContext);
