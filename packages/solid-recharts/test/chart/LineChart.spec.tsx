// Subset port of recharts 3.8.1 test/chart/LineChart.spec.tsx (commit 7a23854) —
// the payoff of the axis/scale vertical: a polyline drawn from data.
//
// Tier-A-adapted: the reference's "Render 1 line in simple LineChart" asserts the
// full attribute set of the curve path, including `width`/`height`/`id`/
// `stroke-dasharray` that come from the deferred animation + clip-path features.
// Those features are intentionally not ported in the minimal <Line> yet, so this
// subset asserts the parity-critical facts — the curve exists under
// `.recharts-line`, carries the right class/stroke/fill, and draws the exact
// reference path geometry `d` (a strong scale-spine parity check) — and omits the
// deferred-feature attributes. The full spec comes online when animation/clip land.
//
// Solid deviations: `render(() => …)` + `flush()` (store writes are
// microtask-batched, so the line registers and its points compute after a flush).
// Any reactive-graph diagnostic fired during a test fails it via the global guard
// in test/setup.ts.
import { describe, expect, it } from "vitest";
import { flush } from "solid-js";
import { render } from "../helper/render";
import { LineChart, Line, XAxis, YAxis } from "../../src";
import { PageData } from "../_data";

describe("<LineChart />", () => {
  it("renders 1 line in a simple LineChart", () => {
    const { container } = render(() => (
      <LineChart
        width={400}
        height={400}
        data={PageData}
        margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
      >
        <Line type="monotone" dataKey="uv" stroke="#ff7300" />
      </LineChart>
    ));
    // The line registers via an effect and its points compute from the store;
    // flush the microtask-batched writes before asserting.
    flush();

    const allLines = container.querySelectorAll(".recharts-line .recharts-line-curve");
    expect(allLines).toHaveLength(1);
    const line = allLines[0];
    expect(line).toHaveAttribute("class", "recharts-curve recharts-line-curve");
    expect(line).toHaveAttribute("stroke", "#ff7300");
    expect(line).toHaveAttribute("fill", "none");
    // Exact reference geometry: point x-scale over 6 categories in [20, 380],
    // linear y-scale over the uv domain, monotone curve. With no XAxis/YAxis the
    // plot offset is the margin (20 on every side), matching recharts exactly.
    expect(line).toHaveAttribute(
      "d",
      "M20,20C44,65,68,110,92,110C116,110,140,110,164,110C188,110,212,200,236,200C260,200,284,129.8,308,129.8C332,129.8,356,169.85,380,209.9",
    );
    // One dot per data point (PageData has 6), rendered in the dots layer.
    const dots = container.querySelectorAll(".recharts-line-dots .recharts-line-dot");
    expect(dots).toHaveLength(6);
  });

  // Explicit <XAxis>/<YAxis> register their settings, and `selectChartOffsetInternal`
  // now subtracts the axis sizes: the 60px Y axis moves the plot's left edge from
  // margin (20) to 80, and the 30px X axis moves the bottom from 20 to 50. So the
  // line's x runs the point scale over [80, 380] (left offset → chartWidth−right)
  // and y scales `uv` into the shrunk band [350, 20] — exact, axis-aware geometry.
  it("draws a line at the axis-shrunk plot area when XAxis/YAxis are registered", () => {
    const { container } = render(() => (
      <LineChart
        width={400}
        height={400}
        data={PageData}
        margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
      >
        <XAxis dataKey="name" />
        <YAxis />
        <Line type="monotone" dataKey="uv" stroke="#ff7300" />
      </LineChart>
    ));
    flush();

    const lines = container.querySelectorAll(".recharts-line .recharts-line-curve");
    expect(lines).toHaveLength(1);
    // x: point scale over the 6 categories in [80, 380]; y: `uv` scaled into
    // the bottom-shrunk band [350, 20]. The left edge at x=80 (not 20) is the
    // proof that the axis-size subtraction took effect.
    expect(lines[0]).toHaveAttribute(
      "d",
      "M80,20C100,61.25,120,102.5,140,102.5C160,102.5,180,102.5,200,102.5C220,102.5,240,185,260,185C280,185,300,120.65,320,120.65C340,120.65,360,157.363,380,194.075",
    );
  });
});
