// Ported from recharts 3.8.1 src/util/useUniqueId.ts (commit 7a23854).
// Returns a stable string (computed once); no Solid-specific reactivity needed.
import { useId } from "./useId";

/**
 * A hook that generates a unique ID, SSR-safe via `useId`. The ID stays the same
 * for the caller's lifetime; you can optionally provide a prefix or a custom ID.
 *
 * @param [prefix] - An optional prefix for the generated ID.
 * @param [customId] - An optional custom ID to override the generated one.
 * @returns The unique ID.
 */
export function useUniqueId(prefix?: string, customId?: string): string {
  // Always call the hook (do not call conditionally).
  const generatedId = useId();

  // If a custom ID is provided, it always takes precedence.
  if (customId) {
    return customId;
  }

  // Apply the prefix if one was provided.
  return prefix ? `${prefix}-${generatedId}` : generatedId;
}

/**
 * The useUniqueId hook returns a unique ID that is either reused from external props or generated internally.
 * Either way the ID is now guaranteed to be present so no more nulls or undefined.
 */
export type WithIdRequired<T> = T & {
  id: string;
};

export type WithoutId<T> = Omit<T, "id">;
