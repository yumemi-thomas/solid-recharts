// Subset port of recharts 3.8.1 test/chart/AreaChart.spec.tsx (commit 7a23854) —
// the payoff of the Area vertical: a filled area drawn from data, reusing the
// Line/axis scale spine plus a numeric baseLine.
//
// Tier-A-adapted (mirrors LineChart.spec): asserts the parity-critical facts —
// the area curve exists under `.recharts-area`, carries the right class/fill,
// and draws the exact reference path `d` (top line forward + flat baseLine back,
// closed), plus dot rendering (boolean / custom render prop / none). Deferred
// (documented in Area.tsx): range areas, activeDot, labels, clip.
//
// Solid deviations: `render(() => …)` + `flush()` (the area registers via an
// effect and its points compute from the microtask-batched store). Any
// reactive-graph diagnostic fired during the test fails it via the global guard
// in test/setup.ts.
import { describe, expect, it } from "vitest";
import { flush } from "solid-js";
import { render } from "../helper/render";
import { AreaChart, Area } from "../../src";
import { PageData } from "../_data";

describe("<AreaChart />", () => {
  it("renders 1 filled area in a simple AreaChart", () => {
    const { container } = render(() => (
      <AreaChart
        width={400}
        height={400}
        data={PageData}
        margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
      >
        <Area dataKey="uv" fill="#ff7300" />
      </AreaChart>
    ));
    // The area registers via an effect and its points compute from the store;
    // flush the microtask-batched writes before asserting.
    flush();

    const areas = container.querySelectorAll(".recharts-area .recharts-area-area");
    expect(areas).toHaveLength(1);
    const area = areas[0];
    expect(area).toHaveAttribute("class", "recharts-curve recharts-area-area");
    expect(area).toHaveAttribute("fill", "#ff7300");
    // Exact reference geometry: linear curve, point x-scale over 6 categories in
    // [20, 380] (x = 20 + 72·i), y from the `uv` linear scale [0, 400] → range
    // [380, 20] (y = 380 − uv·0.9). With no XAxis/YAxis the plot offset is the
    // margin (20 each side). The base value resolves to 0 → baseLine y = 380, so
    // d3.area draws the top line forward then the flat baseline back, closed.
    expect(area).toHaveAttribute(
      "d",
      "M20,20L92,110L164,110L236,200L308,129.8L380,209.9L380,380L308,380L236,380L164,380L92,380L20,380Z",
    );
  });

  it("renders one dot per point when dot is enabled", () => {
    const { container } = render(() => (
      <AreaChart
        width={400}
        height={400}
        data={PageData}
        margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
      >
        <Area dataKey="uv" fill="#ff7300" dot isAnimationActive={false} />
      </AreaChart>
    ));
    flush();

    const dotsLayer = container.querySelector(".recharts-area-dots");
    expect(dotsLayer).not.toBeNull();
    const dots = container.querySelectorAll(".recharts-area-dots .recharts-area-dot");
    expect(dots).toHaveLength(PageData.length);
    // First dot sits at the first point (x = 20, y = 20 from the geometry above).
    expect(dots[0]!.getAttribute("cx")).toBe("20");
    expect(dots[0]!.getAttribute("cy")).toBe("20");
  });

  it("renders a custom dot via the dot render prop (function form)", () => {
    const { container } = render(() => (
      <AreaChart
        width={400}
        height={400}
        data={PageData}
        margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
      >
        <Area
          dataKey="uv"
          fill="#ff7300"
          isAnimationActive={false}
          dot={(p) => <rect class="custom-dot" x={p.cx} y={p.cy} width={2} height={2} />}
        />
      </AreaChart>
    ));
    flush();

    expect(container.querySelectorAll(".recharts-area-dots rect.custom-dot")).toHaveLength(
      PageData.length,
    );
  });

  it("renders no dots by default", () => {
    const { container } = render(() => (
      <AreaChart
        width={400}
        height={400}
        data={PageData}
        margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
      >
        <Area dataKey="uv" fill="#ff7300" isAnimationActive={false} />
      </AreaChart>
    ));
    flush();

    expect(container.querySelector(".recharts-area-dot")).toBeNull();
  });
});
