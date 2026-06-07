// Ported from recharts 3.8.1 src/util/getSliced.ts (commit 7a23854).
//
// Deviation: the reference's `Array.isArray(arr)` guard widens the already-typed
// `ReadonlyArray<T>` to `any[]` (a TS limitation that leaks `any` out of
// `slice`). A plain `boolean`-returning runtime check (no `arg is any[]`
// predicate) preserves the same defensive behavior without the widening.
const isRuntimeArray = (value: unknown): boolean => Array.isArray(value);

export function getSliced<T>(
  arr: ReadonlyArray<T>,
  startIndex: number,
  endIndex: number,
): ReadonlyArray<T> {
  if (!isRuntimeArray(arr)) {
    return arr;
  }
  if (arr && startIndex + endIndex !== 0) {
    return arr.slice(startIndex, endIndex + 1);
  }
  return arr;
}
