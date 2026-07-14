// Proves stacked Area RENDERING: two Areas sharing a stackId draw stacked fills —
// series 2's lower edge (its baseLine) rides on series 1's upper edge (its points).
// Unlike Bar (scalar baseLine), a stacked Area gets a PER-POINT baseLine array, so
// the proof is that series-2's baseLine y-values equal series-1's point y-values.
// `isAnimationActive={false}` so the fill is at final geometry (jsdom resolves
// "auto" to active, which would clip the path mid-reveal). `flush()` because areas
// register via effects and points compute from the store.
import { describe, expect, it } from "vitest";

import { render } from "@solidjs/testing-library";
import { AreaChart, Area } from "../../src";

const data = [
  { name: "A", uv: 100, pv: 200 },
  { name: "B", uv: 150, pv: 120 },
];

// d3.area emits the fill as `M x,y L … Z`: the top line forward (one point per
// datum) followed by the baseLine back (reversed). Returns the coordinate pairs.
function coordsOf(area: Element): Array<[number, number]> {
  const d = area.getAttribute("d") ?? "";
  const nums = d.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  const pairs: Array<[number, number]> = [];
  for (let i = 0; i + 1 < nums.length; i += 2) {
    pairs.push([nums[i]!, nums[i + 1]!]);
  }
  return pairs;
}

describe("stacked <Area /> rendering", () => {
  it("stacks series 2 on top of series 1 (shared stackId)", () => {
    const { container } = render(() => (
      <AreaChart
        width={400}
        height={400}
        data={data}
        margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
      >
        <Area dataKey="uv" stackId="a" fill="#8884d8" isAnimationActive={false} />
        <Area dataKey="pv" stackId="a" fill="#82ca9d" isAnimationActive={false} />
      </AreaChart>
    ));
    const areas = container.querySelectorAll(".recharts-area .recharts-area-area");
    expect(areas).toHaveLength(2);

    const s1 = coordsOf(areas[0]!);
    const s2 = coordsOf(areas[1]!);
    // Two data points → 4 coords each (top forward x2, baseLine back x2).
    expect(s1).toHaveLength(2 * data.length);
    expect(s2).toHaveLength(2 * data.length);

    const n = data.length;
    // Forward halves are the upper edges (series points); the backward halves are
    // the baseLines, in reverse order.
    const s1Top = s1.slice(0, n);
    const s2Base = s2.slice(n).reverse();

    // Series-2's baseLine meets series-1's top, point for point.
    for (let i = 0; i < n; i++) {
      expect(s2Base[i]![0]).toBeCloseTo(s1Top[i]![0], 4); // same x
      expect(s2Base[i]![1]).toBeCloseTo(s1Top[i]![1], 4); // same y (stacked)
    }

    // Sanity: series 2 sits ABOVE series 1 (smaller y = higher on screen).
    expect(s2[0]![1]).toBeLessThan(s1Top[0]![1]);
  });
});
