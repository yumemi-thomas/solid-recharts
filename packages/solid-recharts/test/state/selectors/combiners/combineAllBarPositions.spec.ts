import { describe, expect, it } from "vitest";
import { combineAllBarPositions } from "../../../../src/state/selectors/combiners/combineAllBarPositions";
import type { SizeList } from "../../../../src/state/selectors/barSelectors";

describe("combineAllBarPositions", () => {
  it("rounds fractional originalSize instead of truncating (issue #6115)", () => {
    const sizeList: SizeList = [{ stackId: undefined, dataKeys: ["uv"], barSize: undefined }];
    const positions = combineAllBarPositions(sizeList, undefined, 0, "10%", 91, 91, undefined);
    expect(positions).toBeDefined();
    expect(positions).toHaveLength(1);
    expect(positions?.[0]?.position.size).toBe(73);
  });

  it("rounds the centring offset of user-specified barSizes instead of truncating", () => {
    const sizeList: SizeList = [
      { stackId: undefined, dataKeys: ["a"], barSize: 20 },
      { stackId: undefined, dataKeys: ["b"], barSize: 20 },
    ];
    const positions = combineAllBarPositions(sizeList, undefined, 0, 0, 91, 91, undefined);
    expect(positions).toBeDefined();
    expect(positions).toHaveLength(2);
    expect(positions?.[0]?.position.offset).toBe(26);
  });

  it("does not round originalSize when it is <= 1 (preserves sub-pixel bars)", () => {
    const sizeList: SizeList = Array.from({ length: 20 }, (_, i) => ({
      stackId: undefined,
      dataKeys: [`d${i}`],
      barSize: undefined,
    }));
    const positions = combineAllBarPositions(sizeList, undefined, 0, 0, 10, 10, undefined);
    expect(positions).toBeDefined();
    expect(positions?.[0]?.position.size).toBeCloseTo(0.5, 5);
  });

  it("returns undefined for an empty size list", () => {
    expect(combineAllBarPositions([], undefined, 0, 0, 100, 100, undefined)).toBeUndefined();
  });

  /**
   * Issue #2774: when `maxBarSize` clamps the computed width, each bar used to keep
   * the stride of the *unclamped* layout and was centred inside its own original
   * slot, so the visible gap grew to `barGap + (originalSize - size)`.
   *
   * bandSize=400, barCategoryGap='10%' => offset = 40, barGap = 1, two bars:
   *   - originalSize = Math.round((400 - 80 - 1) / 2) = 160
   *   - size = min(160, maxBarSize=80) = 80
   * The clamped pair is now centred as a group, so the bars sit `barGap` apart.
   */
  it("keeps the requested barGap when maxBarSize clamps the bar width (issue #2774)", () => {
    const sizeList: SizeList = [
      { stackId: undefined, dataKeys: ["uv"], barSize: undefined },
      { stackId: undefined, dataKeys: ["pv"], barSize: undefined },
    ];
    const positions = combineAllBarPositions(sizeList, 80, 1, "10%", 400, 400, undefined);
    expect(positions).toBeDefined();
    // Was [{ offset: 80, size: 80 }, { offset: 241, size: 80 }] - an 81px gap for barGap={1}.
    expect(positions?.map((position) => position.position)).toEqual([
      { offset: 120, size: 80 },
      { offset: 201, size: 80 },
    ]);
  });

  it("leaves positions untouched when maxBarSize is larger than the computed size", () => {
    // size === originalSize, so the group-centring term is 0 and the layout is
    // byte-identical to the pre-#2774 behaviour.
    const sizeList: SizeList = [
      { stackId: undefined, dataKeys: ["uv"], barSize: undefined },
      { stackId: undefined, dataKeys: ["pv"], barSize: undefined },
    ];
    const clamped = combineAllBarPositions(sizeList, 1000, 1, "10%", 400, 400, undefined);
    const unclamped = combineAllBarPositions(sizeList, undefined, 1, "10%", 400, 400, undefined);
    expect(clamped?.map((position) => position.position)).toEqual(
      unclamped?.map((position) => position.position),
    );
    expect(clamped?.map((position) => position.position)).toEqual([
      { offset: 40, size: 160 },
      { offset: 201, size: 160 },
    ]);
  });
});
