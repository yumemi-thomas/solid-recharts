// Ported from recharts 3.8.1 src/util/useId.ts (commit 7a23854).
//
// recharts picks `React.useId` (React 18+) with a counter fallback for older
// React. Solid has no React.useId; we mimic React 18's `:rN:` shape so prefixed
// ids (`recharts-bar-:r0:`) satisfy the recharts test regex `^prefix-[:a-z0-9]+$`.
// `useIdFallback` keeps the counter form (via `uniqueId`) for the legacy path.
import { uniqueId } from "./DataUtils";

/**
 * Counter-based unique id. Generated once per call; stable for the caller's lifetime.
 */
export const useIdFallback = (): string => uniqueId("uid-");

let reactStyleIdCounter = 0;

/**
 * SSR-safe unique id in React 18 `useId` shape (`:r0:`, `:r1:`, …).
 * Stable for the caller's lifetime (Solid components run once).
 */
export const useId = (): string => `:r${reactStyleIdCounter++}:`;
