// Ported from recharts 3.9.0 src/animation/matchBy.ts.
// Pure logic — no framework surface. Deviation from the reference is limited to
// this repo's type discipline (no non-null `!`): the index-bounded `nextItems[i]`
// access is narrowed with an explicit guard instead of an assertion.
import type { DataKey } from "../util/types";
import { getValueByDataKey } from "../util/ChartUtils";

/**
 * A tagged union describing the status of an item during animation.
 *
 * - `matched`: item exists in both previous and next data — interpolate between positions
 * - `added`: item is new (no previous position) — animate in
 * - `removed`: item was in previous data but not in next — animate out
 *
 * @since 3.9
 */
export type AnimationItem<T> =
  | { readonly status: "matched"; readonly prev: T; readonly next: T }
  | { readonly status: "added"; readonly next: T }
  | { readonly status: "removed"; readonly prev: T };

/**
 * A function that extracts a key from an animation item for matching purposes.
 * Items in the previous and next arrays that return the same key are considered
 * the same logical item and will animate between their positions.
 *
 * @since 3.9
 */
export type AnimationMatchBy<T> = (item: T, index: number) => string | number | null;

/**
 * The union of all accepted `animationMatchBy` prop values:
 * a built-in sentinel string, or a custom matching function.
 *
 * @since 3.9
 */
export type AnimationMatchByProp<T> =
  | typeof matchByIndex
  | typeof matchAppend
  | AnimationMatchBy<T>;

/**
 * Match animation items by their array index (the default behavior).
 *
 * @since 3.9
 */
export const matchByIndex = "index" as const;

/**
 * Match animation items sequentially: previous item 0 pairs with next item 0, etc.
 * When the new array is longer, the extra items animate in from their default position.
 * When shorter, the surplus previous items are dropped.
 *
 * @since 3.9
 */
export const matchAppend = "append" as const;

/**
 * Create a matching function that pairs items by a data key from their payload.
 *
 * Useful for time-series or streaming charts where new data points are added to
 * one end and old points removed from the other, so existing points animate to
 * their new positions instead of shifting by index.
 *
 * @since 3.9
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object";
}

export function matchByDataKey(
  dataKey: DataKey<Record<string, unknown>>,
): AnimationMatchBy<{ payload?: unknown }> {
  return (item: { payload?: unknown }): string | number | null => {
    if (!isRecord(item.payload)) return null;
    const value = getValueByDataKey(item.payload, dataKey);
    if (value == null) return null;
    if (typeof value === "string" || typeof value === "number") return value;
    return JSON.stringify(value);
  };
}

function tagAlignedItems<T>(
  alignedPrevItems: ReadonlyArray<T | undefined>,
  nextItems: ReadonlyArray<T>,
  removedPrevItems: ReadonlyArray<T> = [],
): ReadonlyArray<AnimationItem<T>> {
  const tagged: AnimationItem<T>[] = [];
  /*
   * We put removed points at the start because we assume that a typical chart animates right-to-left
   * and the removed points will disappear from the left edge and outside the plot area.
   * If your chart behaves differently you may want to customize your matching function.
   */
  for (const prev of removedPrevItems) {
    tagged.push({ status: "removed", prev });
  }
  for (let i = 0; i < nextItems.length; i++) {
    // This function intentionally pairs by array index. The strategy-specific functions
    // below produce an alignedPrevItems array whose indices already correspond to nextItems.
    const prev = alignedPrevItems[i];
    const next = nextItems[i];
    if (next === undefined) {
      continue;
    }
    if (prev != null) {
      tagged.push({ status: "matched", prev, next });
    } else {
      tagged.push({ status: "added", next });
    }
  }
  return tagged;
}

function matchByIndexImpl<T>(
  prevItems: ReadonlyArray<T>,
  nextItems: ReadonlyArray<T>,
): ReadonlyArray<AnimationItem<T>> {
  const factor = prevItems.length / nextItems.length;
  const alignedPrevItems = nextItems.map((_, i) => prevItems[Math.floor(i * factor)]);
  return tagAlignedItems(alignedPrevItems, nextItems);
}

function matchAppendImpl<T>(
  prevItems: ReadonlyArray<T>,
  nextItems: ReadonlyArray<T>,
): ReadonlyArray<AnimationItem<T>> {
  const alignedPrevItems = nextItems.map((_, i) => prevItems[i]);
  return tagAlignedItems(alignedPrevItems, nextItems);
}

function buildPrevKeyMap<T>(
  prevItems: ReadonlyArray<T>,
  matchBy: AnimationMatchBy<T>,
): ReadonlyMap<string | number, T> {
  const prevMap = new Map<string | number, T>();
  for (let i = 0; i < prevItems.length; i++) {
    const item = prevItems[i];
    if (item == null) continue;
    const key = matchBy(item, i);
    if (key != null && !prevMap.has(key)) {
      prevMap.set(key, item);
    }
  }
  return prevMap;
}

/**
 * Match previous items to next items by key, and include removed items explicitly.
 *
 * @internal
 */
function matchByKey<T>(
  prevItems: ReadonlyArray<T>,
  nextItems: ReadonlyArray<T>,
  matchBy: AnimationMatchBy<T>,
): ReadonlyArray<AnimationItem<T>> {
  const prevMap = buildPrevKeyMap(prevItems, matchBy);

  // Track which prev keys were matched
  const matchedKeys = new Set<string | number>();

  const alignedPrevItems = nextItems.map((next, i) => {
    const key = matchBy(next, i);
    if (key != null) {
      const prev = prevMap.get(key);
      if (prev !== undefined) {
        matchedKeys.add(key);
        return prev;
      }
    }
    return undefined;
  });

  // Removed = prev items whose keys were not matched to any next item
  const removedPrevItems: T[] = [];
  for (const [key, item] of prevMap) {
    if (!matchedKeys.has(key)) {
      removedPrevItems.push(item);
    }
  }

  return tagAlignedItems(alignedPrevItems, nextItems, removedPrevItems);
}

/**
 * Match previous items to next items using the given matching strategy and return tagged animation items.
 *
 * On first render, all next items are returned as `{ status: 'added' }`.
 * For key-based matching, unmatched previous items are appended as `{ status: 'removed' }`.
 *
 * @internal
 */
export function matchAnimationItems<T>(
  prevItems: ReadonlyArray<T> | null,
  nextItems: ReadonlyArray<T> | undefined,
  matchBy: AnimationMatchByProp<T>,
): ReadonlyArray<AnimationItem<T>> | null {
  if (nextItems == null) {
    return null;
  }
  if (prevItems == null) {
    return nextItems.map((next) => ({ status: "added", next }));
  }
  if (matchBy === matchByIndex) {
    return matchByIndexImpl(prevItems, nextItems);
  }
  if (matchBy === matchAppend) {
    return matchAppendImpl(prevItems, nextItems);
  }
  return matchByKey(prevItems, nextItems, matchBy);
}
