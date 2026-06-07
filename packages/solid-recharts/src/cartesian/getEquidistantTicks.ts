// Ported from recharts 3.8.1 src/cartesian/getEquidistantTicks.ts (commit 7a23854).
import { isVisible } from "../util/TickUtils";
import { CartesianTickItem } from "../util/types";
import { getEveryNth } from "../util/getEveryNth";
import { Sign } from "./getTicks";

export function getEquidistantTicks(
  sign: Sign,
  boundaries: { start: number; end: number },
  getTickSize: (tick: CartesianTickItem, index: number) => number,
  ticks: ReadonlyArray<CartesianTickItem>,
  minTickGap: number,
): ReadonlyArray<CartesianTickItem> {
  const result = (ticks || []).slice();

  const { start: initialStart, end } = boundaries;
  let index = 0;
  let stepsize = 1;
  let start = initialStart;

  while (stepsize <= result.length) {
    // Given stepsize, evaluate whether every stepsize-th tick can be shown. If
    // not, increase the stepsize by 1 and try again.
    const entry = ticks?.[index];

    // Break condition: all ticks evaluated.
    if (entry === undefined) {
      return getEveryNth(ticks, stepsize);
    }

    const i = index;
    let size: number | undefined;
    const getSize = (): number => {
      if (size === undefined) {
        size = getTickSize(entry, i);
      }
      return size;
    };

    const tickCoord = entry.coordinate;
    // Always show the first tick.
    const isShow = index === 0 || isVisible(sign, tickCoord, getSize, start, end);

    if (!isShow) {
      // Start over with a larger stepsize.
      index = 0;
      start = initialStart;
      stepsize += 1;
    }

    if (isShow) {
      start = tickCoord + sign * (getSize() / 2 + minTickGap);
      index += stepsize;
    }
  }

  return [];
}

export function getEquidistantPreserveEndTicks(
  sign: Sign,
  boundaries: { start: number; end: number },
  getTickSize: (tick: CartesianTickItem, index: number) => number,
  ticks: ReadonlyArray<CartesianTickItem>,
  minTickGap: number,
): ReadonlyArray<CartesianTickItem> {
  const result = (ticks || []).slice();
  const len = result.length;

  if (len === 0) {
    return [];
  }

  const { start: initialStart, end } = boundaries;

  // stepsize = 1 (every tick) up to the maximum possible stepsize (len).
  for (let stepsize = 1; stepsize <= len; stepsize++) {
    // Offset so the last tick (index len - 1) is always included.
    const offset = (len - 1) % stepsize;
    let start = initialStart; // coordinate of the last drawn tick + gap
    let ok = true;

    // Iterate the end-anchored sequence: offset, offset + stepsize, …, len - 1.
    for (let index = offset; index < len; index += stepsize) {
      const entry = ticks[index];
      if (entry == null) {
        continue;
      }
      const i = index;
      let size: number | undefined;

      const getSize = (): number => {
        if (size === undefined) {
          size = getTickSize(entry, i);
        }
        return size;
      };

      const tickCoord = entry.coordinate;

      const isShow = index === offset || isVisible(sign, tickCoord, getSize, start, end);

      if (!isShow) {
        // Any tick failing visibility/collision rejects this stepsize.
        ok = false;
        break;
      }

      start = tickCoord + sign * (getSize() / 2 + minTickGap);
    }

    if (ok) {
      const finalTicks: CartesianTickItem[] = [];
      for (let index = offset; index < len; index += stepsize) {
        const tick = ticks[index];
        if (tick != null) {
          finalTicks.push(tick);
        }
      }
      return finalTicks;
    }
  }

  // No stepsize works (only if minTickGap is huge).
  return [];
}
