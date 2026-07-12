// Ported from recharts 3.9.0 src/cartesian/useAnimatedLineLength.ts.
//
// Solid 2.0 deviation: React `useRef` + `useCallback` exist to survive re-renders
// and keep a stable callback identity. A Solid component body runs ONCE, so the
// refs become plain `let` closure variables and the returned function is naturally
// stable. The data-change detection (prevPoints !== points) that React does during
// render is moved into the returned callback's caller convention: the consumer
// calls `markDataChange(points)` once per render (cheap reference compare) before
// driving frames, mirroring the React in-render ref bookkeeping. We expose it as a
// small object so Line can both detect data changes and read the visible length.
import { round } from "../util/round";

export type AnimatedLineLength = {
  /**
   * Notify the hook that the point set may have changed. When `points` differs by
   * reference from the previous call, the next animation resumes from the furthest
   * length already drawn (so a mid-animation data change does not jump back to 0).
   */
  markDataChange: (points: unknown) => void;
  /**
   * `(animationElapsedTime, totalLength) => number | null`:
   *   - `animationElapsedTime` is the animation progress (0 to 1),
   *   - `totalLength` is the current total SVG path length in pixels,
   *   - returns the visible length in pixels, or `null` once the line is fully
   *     visible (meaning no entrance stroke-dasharray is needed any more).
   */
  getVisibleLength: (animationElapsedTime: number, totalLength: number) => number | null;
};

/**
 * Tracks the animated visible length of a Line's SVG path across data changes.
 *
 * Invariants:
 * 1. The visible length only grows (monotonically non-decreasing with animationElapsedTime).
 * 2. The visible length changes continuously — no jumps when data changes mid-animation.
 *    This is achieved by tracking the maximum animated length in pixels and using it
 *    as the starting point for the next animation.
 * 3. Once the line reaches 100% visibility, it never becomes partially visible again.
 *    In that case the hook returns `null`, meaning no animation stroke-dasharray is needed.
 */
export function useAnimatedLineLength(): AnimatedLineLength {
  let startingLength = 0;
  let maxAnimatedLength = 0;
  let reachedFull = false;
  // `undefined` sentinel so the first markDataChange (even with `undefined` points)
  // does not spuriously rebase — recharts seeds prevPointsRef with the first points.
  let prevPoints: unknown;
  let seeded = false;

  const markDataChange = (points: unknown): void => {
    if (!seeded) {
      prevPoints = points;
      seeded = true;
      return;
    }
    if (prevPoints !== points) {
      startingLength = maxAnimatedLength;
      prevPoints = points;
    }
  };

  const getVisibleLength = (animationElapsedTime: number, totalLength: number): number | null => {
    if (reachedFull) {
      return null;
    }

    const visibleLength = Math.min(
      round(startingLength + animationElapsedTime * totalLength),
      totalLength,
    );

    if (animationElapsedTime > 0 && totalLength > 0) {
      maxAnimatedLength = Math.max(maxAnimatedLength, visibleLength);
      if (visibleLength >= totalLength) {
        reachedFull = true;
        return null;
      }
    }

    return visibleLength;
  };

  return { markDataChange, getVisibleLength };
}
