// Proves stacked Bar RENDERING (the domain math was already done): two Bars
// sharing a stackId draw stacked rectangles — series 2 sits on top of series 1
// (series-2 bottom == series-1 top). `isAnimationActive={false}` so bars are at
// their final geometry (jsdom resolves "auto" to active). `flush()` because bars
// register via effects and rects compute from the store.
import { describe, expect, it } from "vitest";
import { flush } from "solid-js";
import { render } from "@solidjs/testing-library";
import { BarChart, Bar } from "../../src";

const data = [
  { name: "A", uv: 100, pv: 200 },
  { name: "B", uv: 150, pv: 120 },
];

function rectsOf(barLayer: Element): Array<{ y: number; height: number }> {
  return [...barLayer.querySelectorAll(".recharts-bar-rectangle path.recharts-rectangle")].map(
    (r) => ({
      y: Number(r.getAttribute("y")),
      height: Number(r.getAttribute("height")),
    }),
  );
}

describe("stacked <Bar /> rendering", () => {
  it("stacks series 2 on top of series 1 (shared stackId)", () => {
    const { container } = render(() => (
      <BarChart
        width={400}
        height={400}
        data={data}
        margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
      >
        <Bar dataKey="uv" stackId="a" fill="#8884d8" isAnimationActive={false} />
        <Bar dataKey="pv" stackId="a" fill="#82ca9d" isAnimationActive={false} />
      </BarChart>
    ));
    flush();

    const bars = container.querySelectorAll(".recharts-bar");
    expect(bars).toHaveLength(2);
    const series1 = rectsOf(bars[0]!);
    const series2 = rectsOf(bars[1]!);
    expect(series1).toHaveLength(data.length);
    expect(series2).toHaveLength(data.length);

    // For each category, series-2's bottom edge meets series-1's top edge.
    for (let i = 0; i < data.length; i++) {
      const bottomOfSeries2 = series2[i]!.y + series2[i]!.height;
      expect(bottomOfSeries2).toBeCloseTo(series1[i]!.y, 4);
    }
  });
});
