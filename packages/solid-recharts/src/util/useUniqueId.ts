// Ported from recharts 3.8.1 src/util/useUniqueId.ts (commit 7a23854).
// Returns a stable string (computed once); no Solid-specific reactivity needed.
import { untrack } from "solid-js";
import { useId } from "./useId";

/** A plain value, or a getter that is read ONCE (untracked) when the ID is created. */
type OnceValue = string | undefined | (() => string | undefined);

const readOnce = (value: OnceValue): string | undefined =>
  typeof value === "function" ? untrack(value) : value;

/**
 * A hook that generates a unique ID, SSR-safe via `useId`. The ID stays the same
 * for the caller's lifetime; you can optionally provide a prefix or a custom ID.
 *
 * Solid components run once, so unlike recharts' per-render hook the ID is fixed at
 * creation. Pass a getter (`() => props.id`) to read a prop without tracking it.
 *
 * @param [prefix] - An optional prefix for the generated ID.
 * @param [customId] - An optional custom ID to override the generated one.
 * @returns The unique ID.
 */
export function useUniqueId(prefix?: OnceValue, customId?: OnceValue): string {
  // Always call the hook (do not call conditionally).
  const generatedId = useId();

  // If a custom ID is provided, it always takes precedence.
  const custom = readOnce(customId);
  if (custom) {
    return custom;
  }

  // Apply the prefix if one was provided.
  const resolvedPrefix = readOnce(prefix);
  return resolvedPrefix ? `${resolvedPrefix}-${generatedId}` : generatedId;
}

/**
 * The useUniqueId hook returns a unique ID that is either reused from external props or generated internally.
 * Either way the ID is now guaranteed to be present so no more nulls or undefined.
 */
export type WithIdRequired<T> = T & {
  id: string;
};

export type WithoutId<T> = Omit<T, "id">;
