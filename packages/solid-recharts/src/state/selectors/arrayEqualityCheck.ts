// Ported from recharts 3.9.2 src/state/selectors/arrayEqualityCheck.ts.
//
// Previously skipped under ADR-0001's reading that Solid's createMemo made
// reselect's resultEqualityCheck unnecessary. ADR-0002 restores shared
// memoization via `createSelector`, which takes the same resultEqualityCheck
// option — so these are ported and passed to the wrapped selectors exactly
// where upstream passes them.

/**
 * Checks if two arrays are equal, treating empty arrays as equal regardless of
 * reference. If both arrays are non-empty, it checks for reference equality.
 */
export function emptyArraysAreEqualCheck<T>(a: ReadonlyArray<T>, b: ReadonlyArray<T>): boolean {
  if (Array.isArray(a) && Array.isArray(b) && a.length === 0 && b.length === 0) {
    return true;
  }
  return a === b;
}

/**
 * Checks if two arrays have the same contents in the same order.
 */
export function arrayContentsAreEqualCheck<T>(a: ReadonlyArray<T>, b: ReadonlyArray<T>): boolean {
  if (a.length === b.length) {
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) {
        return false;
      }
    }
    return true;
  }
  return false;
}
