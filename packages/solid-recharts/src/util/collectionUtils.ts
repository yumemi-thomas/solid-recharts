// Replaces es-toolkit core `sortBy` / `uniqBy` / `range` — faithful ports of
// the es-toolkit implementations (MIT), adapted to this repo's type discipline.

/**
 * es-toolkit `compareValues` (ascending): JS relational comparison of the
 * mapped criterion values. Numbers and strings compare natively; mixed pairs
 * fall back to numeric coercion, mirroring the abstract `<`/`>` semantics.
 */
function compareValues(a: unknown, b: unknown): number {
  if (typeof a === "number" && typeof b === "number") {
    return a < b ? -1 : a > b ? 1 : 0;
  }
  if (typeof a === "string" && typeof b === "string") {
    return a < b ? -1 : a > b ? 1 : 0;
  }
  const an = Number(a);
  const bn = Number(b);
  if (!Number.isNaN(an) && !Number.isNaN(bn)) {
    return an < bn ? -1 : an > bn ? 1 : 0;
  }
  return 0;
}

/**
 * Sorts by the given criteria (object keys or mapper functions), ascending.
 * Stable: ties keep their original order (native sort is stable per ES2019).
 */
export function sortBy<T extends object>(
  arr: readonly T[],
  criteria: Array<((item: T) => unknown) | keyof T>,
): T[] {
  const mapped = arr.map((item) => ({
    item,
    keys: criteria.map((c) => (typeof c === "function" ? c(item) : item[c])),
  }));
  mapped.sort((a, b) => {
    for (let i = 0; i < a.keys.length; i++) {
      const order = compareValues(a.keys[i], b.keys[i]);
      if (order !== 0) {
        return order;
      }
    }
    return 0;
  });
  return mapped.map((m) => m.item);
}

/**
 * Unique elements by mapped key; the FIRST occurrence of each key is kept.
 * Keys compare by Map semantics (SameValueZero).
 */
export function uniqBy<T, U>(
  arr: readonly T[],
  mapper: (item: T, index: number, array: readonly T[]) => U,
): T[] {
  const map = new Map<U, T>();
  let index = 0;
  for (const item of arr) {
    const key = mapper(item, index, arr);
    if (!map.has(key)) {
      map.set(key, item);
    }
    index++;
  }
  return Array.from(map.values());
}

/** Integers from `start` (inclusive) to `end` (exclusive), step 1. */
export function range(start: number, end?: number, step = 1): number[] {
  if (end == null) {
    end = start;
    start = 0;
  }
  if (!Number.isInteger(step) || step === 0) {
    throw new Error("The step value must be a non-zero integer.");
  }
  const length = Math.max(Math.ceil((end - start) / step), 0);
  const result: number[] = new Array<number>(length);
  for (let i = 0; i < length; i++) {
    result[i] = start + i * step;
  }
  return result;
}
