// Ported from recharts 3.8.1 src/context/accessibilityContext.tsx (commit 7a23854).
// `useAppSelector` returns an Accessor in this Solid port, so `useAccessibilityLayer`
// returns an `Accessor<boolean>` (recharts returned a bare boolean).
import { type Accessor } from "solid-js";
import { useAppSelector } from "../state/hooks";

export const useAccessibilityLayer = (): Accessor<boolean> => {
  const accessibilityLayer = useAppSelector((state) => state.rootProps.accessibilityLayer);
  return () => accessibilityLayer() ?? true;
};
