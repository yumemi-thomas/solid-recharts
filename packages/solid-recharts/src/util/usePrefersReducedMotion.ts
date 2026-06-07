// Ported from recharts 3.8.1 src/util/usePrefersReducedMotion.ts (commit 7a23854).
//
// Solid 2.0 port of a React hook. Deviations:
//   - `useState(() => initial)` → `createSignal(initial)`; the hook returns an
//     `Accessor<boolean>` (not a bare boolean) because the value changes
//     reactively as the media query toggles.
//   - `useEffect(() => { addEventListener; return () => removeEventListener }, [])`
//     → the listener is registered once in the (run-once) hook body with
//     `onCleanup` for teardown.
import { createSignal, onCleanup, type Accessor } from "solid-js";

import { Global } from "./Global";

/**
 * Detects and subscribes to the user's `prefers-reduced-motion` system preference.
 * Returns `true` when the user prefers reduced motion, `false` otherwise.
 * SSR-safe: always returns `false` during server-side rendering.
 */
export function usePrefersReducedMotion(): Accessor<boolean> {
  const getInitial = (): boolean => {
    if (Global.isSsr) {
      return false;
    }
    if (!window.matchMedia) {
      return false;
    }
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  };

  const [prefersReducedMotion, setPrefersReducedMotion] = createSignal<boolean>(getInitial());

  if (window.matchMedia) {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = (): void => {
      setPrefersReducedMotion(mediaQuery.matches);
    };
    mediaQuery.addEventListener("change", handleChange);
    onCleanup(() => {
      mediaQuery.removeEventListener("change", handleChange);
    });
  }

  return prefersReducedMotion;
}
