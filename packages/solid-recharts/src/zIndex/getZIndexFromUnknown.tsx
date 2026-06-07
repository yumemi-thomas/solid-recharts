// Ported from recharts 3.8.1 src/zIndex/getZIndexFromUnknown.tsx.
// Pure utility — no framework surface — behavior is byte-identical to recharts.

import { isWellBehavedNumber } from "../util/isWellBehavedNumber";

export function getZIndexFromUnknown(input: unknown, defaultZIndex: number): number {
  if (
    input &&
    typeof input === "object" &&
    "zIndex" in input &&
    typeof input.zIndex === "number" &&
    isWellBehavedNumber(input.zIndex)
  ) {
    return input.zIndex;
  }
  return defaultZIndex;
}
