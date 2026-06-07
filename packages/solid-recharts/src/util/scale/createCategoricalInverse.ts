// Ported from recharts 3.8.1 src/util/scale/createCategoricalInverse.ts (commit 7a23854).
//
// Solid/type deviations from reference (no behavior change):
//   - `bisect` reads indices into `?? 0` locals instead of non-null `!` (our
//     tsconfig enables noUncheckedIndexedAccess; the `?? 0` never fires for the
//     in-bounds accesses the algorithm makes).
//   - `allDataPointsOnAxis` is typed `ReadonlyArray<CategoricalDomainItem>` (the
//     scale's actual input type) rather than `unknown[]`, which lets `scale(d)`
//     typecheck and drops the reference's `@ts-expect-error`.
import { InverseScaleFunction } from "../../hooks";
import { CategoricalDomainItem } from "../types";
import { CustomScaleDefinition } from "./CustomScaleDefinition";

/**
 * Binary search to find the index where x would fit in array a.
 * Works for arrays that are sorted both ascending and descending.
 *
 * Unlike d3.bisect, this implementation handles both ascending and descending arrays.
 *
 * @param haystack Sorted array of numbers
 * @param needle Number to find the insertion index for
 * @returns Index where x would fit in array a
 */
export function bisect(haystack: ReadonlyArray<number>, needle: number): number {
  let lo = 0;
  let hi = haystack.length;
  const first = haystack[0] ?? 0;
  const last = haystack[haystack.length - 1] ?? 0;
  const ascending = first < last;

  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    const midVal = haystack[mid] ?? 0;
    if (ascending ? midVal < needle : midVal > needle) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  return lo;
}

/**
 * Computes an inverse scale function for categorical/ordinal scales.
 * Uses bisect to find the closest domain value for a given pixel coordinate.
 */
export function createCategoricalInverse(
  scale: CustomScaleDefinition | undefined,
  allDataPointsOnAxis?: ReadonlyArray<CategoricalDomainItem>,
): InverseScaleFunction | undefined {
  if (!scale) {
    return undefined;
  }
  const domain = allDataPointsOnAxis ?? scale.domain();
  // Build an array of pixel positions for each domain value.
  const pixelPositions: number[] = domain.map((d) => scale(d) ?? 0);
  const range = scale.range();

  if (domain.length === 0 || range.length < 2) {
    return undefined;
  }

  return (pixelValue: number): unknown => {
    // Find the closest domain value using bisect
    const index = bisect(pixelPositions, pixelValue);

    // Clamp to valid range
    if (index <= 0) {
      return domain[0];
    }
    if (index >= domain.length) {
      return domain[domain.length - 1];
    }

    // Check which neighbor is closer
    const leftPixel = pixelPositions[index - 1] ?? 0;
    const rightPixel = pixelPositions[index] ?? 0;
    if (Math.abs(pixelValue - leftPixel) <= Math.abs(pixelValue - rightPixel)) {
      return domain[index - 1];
    }
    return domain[index];
  };
}
