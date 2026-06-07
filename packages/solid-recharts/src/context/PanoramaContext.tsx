// Ported from recharts 3.8.1 src/context/PanoramaContext.tsx (commit 7a23854).
// Context-value-is-provider in Solid 2.0; default `null` (a real value) so
// `useContext` returns it without throwing outside a provider.
import { createContext, useContext } from "solid-js";
import type { JSX } from "@solidjs/web";

const PanoramaContext = createContext<boolean | null>(null);

export const useIsPanorama = (): boolean => useContext(PanoramaContext) != null;

export const PanoramaContextProvider = (props: { children: JSX.Element }): JSX.Element => (
  <PanoramaContext value={true}>{props.children}</PanoramaContext>
);
