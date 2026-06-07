// Ported from recharts 3.8.1 src/zIndex/zIndexSelectors.ts (commit 7a23854).
import { RechartsRootState } from "../state/store";
import { DefaultZIndexes } from "./DefaultZIndexes";

/**
 * Given a zIndex, returns the corresponding portal element reference.
 * If no zIndex is provided or if the zIndex is not registered, returns undefined.
 *
 * It also returns undefined in case the z-index portal has not been rendered yet.
 */
export const selectZIndexPortalElement = (
  state: RechartsRootState,
  zIndex: number | undefined,
  isPanorama: boolean,
): Element | undefined => {
  if (zIndex == null) {
    return undefined;
  }
  const entry = state.zIndex.zIndexMap[zIndex];
  if (entry == null) {
    return undefined;
  }
  if (isPanorama) {
    return entry.panoramaElement;
  }
  return entry.element;
};

let cachedZIndexMapKeys = "";
let cachedAllRegisteredZIndexes: ReadonlyArray<number> = [];

export const selectAllRegisteredZIndexes = (state: RechartsRootState): ReadonlyArray<number> => {
  const zIndexMapKeys = Object.keys(state.zIndex.zIndexMap).sort().join(",");
  if (zIndexMapKeys === cachedZIndexMapKeys) {
    return cachedAllRegisteredZIndexes;
  }
  const allNumbers = zIndexMapKeys
    .split(",")
    .filter((key) => key.length > 0)
    .map((zIndexStr) => Number.parseInt(zIndexStr, 10))
    .concat(Object.values(DefaultZIndexes));
  const uniqueNumbers = Array.from(new Set(allNumbers));
  cachedZIndexMapKeys = zIndexMapKeys;
  cachedAllRegisteredZIndexes = uniqueNumbers.sort((a, b) => a - b);
  return cachedAllRegisteredZIndexes;
};
