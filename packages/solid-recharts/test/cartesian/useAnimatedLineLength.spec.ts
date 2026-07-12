// Port of recharts 3.9.0 test/cartesian/useAnimatedLineLength.spec.ts.
//
// API adaptation: the Solid `useAnimatedLineLength()` takes no args (a Solid
// component body runs once, so the hook owns plain closure state instead of refs
// re-read each render) and returns `{ markDataChange, getVisibleLength }`:
//   - React's `useAnimatedLineLength(points)` + `rerender({ points })` data-change
//     detection becomes an explicit `markDataChange(points)` call (Line calls it
//     once per animation frame; the first call seeds, a changed reference rebases).
//   - React's `result.current(t, len)` becomes `getVisibleLength(t, len)`.
//
// PERMANENT-N/A: the two "callback stability" tests assert React renderHook
// rerender returns the same function reference — there is no rerender in Solid; the
// returned callback is a stable closure by construction, so the property is vacuous.
import { describe, it, expect } from "vitest";
import { useAnimatedLineLength } from "../../src/cartesian/useAnimatedLineLength";
import { assertNotNull } from "../helper/assertNotNull";

const pointsA = [{ x: 0, y: 0 }];
const pointsB = [
  { x: 0, y: 0 },
  { x: 1, y: 1 },
];

describe("useAnimatedLineLength", () => {
  describe("initial animation (from zero)", () => {
    it("should return 0 at animationElapsedTime=0", () => {
      const { getVisibleLength } = useAnimatedLineLength();
      expect(getVisibleLength(0, 100)).toBe(0);
    });

    it("should interpolate linearly between 0 and totalLength", () => {
      const { getVisibleLength } = useAnimatedLineLength();
      expect(getVisibleLength(0.1, 100)).toBe(10);
      expect(getVisibleLength(0.5, 100)).toBe(50);
      expect(getVisibleLength(0.9, 100)).toBe(90);
    });

    it("should return null when animationElapsedTime=1 (fully visible)", () => {
      const { getVisibleLength } = useAnimatedLineLength();
      expect(getVisibleLength(1, 100)).toBeNull();
    });
  });

  describe("after data change mid-animation (interrupted)", () => {
    it("should continue from the last animated pixel length, not jump", () => {
      const { markDataChange, getVisibleLength } = useAnimatedLineLength();
      markDataChange(pointsA);

      // Animate to 50% of a 100px path → 50px visible
      getVisibleLength(0.5, 100);

      // Data changes, new path is 200px
      markDataChange(pointsB);

      // At animationElapsedTime=0, should start from 50px (continuous, no jump)
      expect(getVisibleLength(0, 200)).toBe(50);

      // At animationElapsedTime=0.25, visible = 50 + 0.25 * 200 = 100px
      expect(getVisibleLength(0.25, 200)).toBe(100);

      // At animationElapsedTime=0.75, visible = 50 + 0.75 * 200 = 200 = totalLength → null
      expect(getVisibleLength(0.75, 200)).toBeNull();
    });

    it("should not jump when new totalLength is smaller", () => {
      const { markDataChange, getVisibleLength } = useAnimatedLineLength();
      markDataChange(pointsA);

      // Animate to 30% of 100px → 30px
      getVisibleLength(0.3, 100);

      // Data changes, new path is only 50px
      markDataChange(pointsB);

      // At animationElapsedTime=0, should start from 30px (continuous)
      expect(getVisibleLength(0, 50)).toBe(30);

      // At animationElapsedTime=0.4, visible = 30 + 0.4 * 50 = 50 = totalLength → null
      expect(getVisibleLength(0.4, 50)).toBeNull();
    });
  });

  describe("when totalLength changes during animation", () => {
    it("should keep growing when totalLength increases mid-animation", () => {
      const { markDataChange, getVisibleLength } = useAnimatedLineLength();
      markDataChange(pointsA);

      // Animate to 50% of 100px → 50px visible
      getVisibleLength(0.5, 100);

      // Data changes
      markDataChange(pointsB);

      // At animationElapsedTime=0, start from 50px (continuous)
      expect(getVisibleLength(0, 100)).toBe(50);

      // totalLength grows to 200 mid-animation
      const v1 = getVisibleLength(0.1, 200);
      assertNotNull(v1);
      // visible = 50 + 0.1 * 200 = 70
      expect(v1).toBe(70);

      const v2 = getVisibleLength(0.3, 200);
      assertNotNull(v2);
      // visible = 50 + 0.3 * 200 = 110
      expect(v2).toBe(110);

      // visible length always grew
      expect(v2).toBeGreaterThan(v1);
    });
  });

  describe("once fully visible (proportion = 100%)", () => {
    it("should return null after the line has been fully visible", () => {
      const { getVisibleLength } = useAnimatedLineLength();

      // Animate to completion
      getVisibleLength(1, 100);

      // Now it should return null
      expect(getVisibleLength(0.5, 100)).toBeNull();
    });

    it("should return null even after data changes", () => {
      const { markDataChange, getVisibleLength } = useAnimatedLineLength();
      markDataChange(pointsA);

      // Complete animation
      getVisibleLength(1, 100);

      // Change data
      markDataChange(pointsB);

      // Should still return null — once full, always full
      expect(getVisibleLength(0, 200)).toBeNull();
      expect(getVisibleLength(0.5, 200)).toBeNull();
    });

    it("should return null when totalLength shrinks below previously animated length", () => {
      const { getVisibleLength } = useAnimatedLineLength();

      // Animate to completion at 100px
      getVisibleLength(1, 100);

      // totalLength shrinks to 50px — line is still fully visible
      expect(getVisibleLength(0.5, 50)).toBeNull();
    });
  });

  describe("edge cases", () => {
    it("should return 0 when totalLength is 0", () => {
      const { getVisibleLength } = useAnimatedLineLength();
      expect(getVisibleLength(0.5, 0)).toBe(0);
    });

    it("should not mark as fully visible when totalLength is 0", () => {
      const { getVisibleLength } = useAnimatedLineLength();
      getVisibleLength(1, 0);
      // Should not return null — totalLength=0 is an unmeasured path, not a completed animation
      expect(getVisibleLength(0.5, 100)).toBe(50);
    });

    it("should handle animationElapsedTime > 1 gracefully (returns null since fully visible)", () => {
      const { getVisibleLength } = useAnimatedLineLength();
      expect(getVisibleLength(1.5, 100)).toBeNull();
    });
  });
});
