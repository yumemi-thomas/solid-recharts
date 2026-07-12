// Ported from recharts 3.8.1 src/util/payload/getUniqPayload.ts (commit 7a23854).
// Pure util — no framework surface — so behavior is byte-identical to recharts.

import { uniqBy } from "../collectionUtils";

type UniqueFunc<T> = (entry: T) => unknown;

/**
 * This is configuration option that decides how to filter for unique values only:
 *
 * - `false` means "no filter"
 * - `true` means "use recharts default filter"
 * - function means "use return of this function as the default key"
 */
export type UniqueOption<T> = boolean | UniqueFunc<T>;

export function getUniqPayload<T>(
  payload: ReadonlyArray<T>,
  option: UniqueOption<T> | undefined,
  defaultUniqBy: UniqueFunc<T>,
): ReadonlyArray<T> {
  if (option === true) {
    return uniqBy(payload, defaultUniqBy);
  }

  if (typeof option === "function") {
    return uniqBy(payload, option);
  }

  return payload;
}
