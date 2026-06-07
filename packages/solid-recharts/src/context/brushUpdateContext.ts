// Ported from recharts 3.8.1 src/context/brushUpdateContext.tsx (commit 7a23854).
// No JSX → `.ts`. Solid 2.0: the context value is the provider; the default
// (`() => {}`) is a real value so `useContext` returns it without throwing
// outside a provider (matching recharts' default-callback behavior).
import { createContext } from "solid-js";

export interface BrushStartEndIndex {
  startIndex: number;
  endIndex: number;
}

export type OnBrushUpdate = (newState: BrushStartEndIndex) => void;

export const BrushUpdateDispatchContext = createContext<OnBrushUpdate>(() => {});
