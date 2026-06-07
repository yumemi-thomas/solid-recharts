// Subset port of recharts 3.8.1 test/chart/BarChart.spec.tsx (commit 7a23854) —
// the payoff of the Bar vertical: rectangles drawn from data via the band scale.
//
// Minimal/Tier-A-adapted: asserts the parity-critical facts (one
// `.recharts-bar-rectangle` per data point, inside `.recharts-bar`, with sane
// geometry). The full spec (background bars, stacks, labels, animation, exact
// per-bar coords) comes online when those features land. `flush()` after render
// because the bar registers via an effect and its rectangles compute from the store.
import { describe, expect, it } from "vitest";
import { flush } from "solid-js";
import { render, fireEvent } from "../helper/render";
import { BarChart, Bar, Tooltip, XAxis, YAxis } from "../../src";
import { PageData } from "../_data";

describe("<BarChart />", () => {
  const data = [
    { name: "food", uv: 400, pv: 2400 },
    { name: "cosmetic", uv: 300, pv: 4567 },
    { name: "storage", uv: 300, pv: 1398 },
    { name: "digital", uv: 200, pv: 9800 },
  ];

  it("renders four labels when label=true", () => {
    const { container } = render(() => (
      <BarChart width={100} height={50} data={data}>
        <Bar isAnimationActive={false} dataKey="uv" label fill="#ff7300" />
      </BarChart>
    ));
    flush();

    expect(container.querySelectorAll(".recharts-label-list")).toHaveLength(1);
    expect(container.querySelectorAll(".recharts-label")).toHaveLength(4);
  });

  it("renders a tooltip shell when Tooltip item is added", () => {
    const { container } = render(() => (
      <BarChart width={100} height={50} data={data}>
        <Bar dataKey="uv" stackId="test" fill="#ff7300" isAnimationActive={false} />
        <Bar dataKey="pv" stackId="test" fill="#387908" isAnimationActive={false} />
        <Tooltip />
      </BarChart>
    ));
    flush();

    expect(container.querySelectorAll(".recharts-default-tooltip")).toHaveLength(1);
    expect(container.querySelectorAll(".recharts-tooltip-wrapper")).toHaveLength(1);
  });

  it("renders empty when data is empty", () => {
    const { container } = render(() => (
      <BarChart width={100} height={50} data={[]}>
        <Bar dataKey="uv" label fill="#ff7300" isAnimationActive={false} />
      </BarChart>
    ));
    flush();

    expect(container.querySelectorAll(".recharts-bar-rectangle")).toHaveLength(0);
    expect(container.querySelectorAll(".recharts-label")).toHaveLength(0);
  });

  it("renders bars in a vertical BarChart", () => {
    const { container } = render(() => (
      <BarChart width={100} height={50} data={data} layout="vertical">
        <XAxis type="number" />
        <YAxis type="category" dataKey="name" />
        <Bar dataKey="uv" fill="#ff7300" isAnimationActive={false} />
        <Bar dataKey="pv" fill="#387908" isAnimationActive={false} />
      </BarChart>
    ));
    flush();

    const layers = container.querySelectorAll(".recharts-bar .recharts-bar-rectangle");
    expect(layers).toHaveLength(8);
    const path0 = layers[0]!.querySelector("path.recharts-rectangle");
    expect(path0).toHaveAttribute("height", "1");
    expect(path0).toHaveAttribute("x", "65");
    const path7 = layers[7]!.querySelector("path.recharts-rectangle");
    expect(path7).toHaveAttribute("fill", "#387908");
  });

  // Any reactive-graph diagnostic fired during this test fails it via the global
  // guard in test/setup.ts (no per-test wrapper needed).
  it("renders one rectangle per data point from the band scale", () => {
    const { container } = render(() => (
      <BarChart
        width={400}
        height={400}
        data={PageData}
        margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
      >
        <Bar dataKey="uv" fill="#ff7300" isAnimationActive={false} />
      </BarChart>
    ));
    flush();

    const paths = container.querySelectorAll(
      ".recharts-bar .recharts-bar-rectangle path.recharts-rectangle",
    );
    expect(paths).toHaveLength(PageData.length);
    expect(paths[0]).toHaveAttribute("fill", "#ff7300");
    // Exact geometry (matches recharts' algorithm): band scale over 6 categories
    // in [20, 380] → bandSize 60; barCategoryGap 10% → offset 6, size 48, so each
    // bar's x = bandStart(20 + 60·i) + 6. Heights from the linear uv scale
    // [0, 400] → range [380, 20]: uv 400→h 360, 300→270, 200→180, 278→250.2, 189→170.1.
    const geometry = [...paths].map((r) =>
      ["x", "y", "width", "height"].map((a) => r.getAttribute(a)).join(","),
    );
    expect(geometry).toEqual([
      "26,20,48,360",
      "86,110,48,270",
      "146,110,48,270",
      "206,200,48,180",
      "266,129.8,48,250.2",
      "326,209.9,48,170.1",
    ]);
  });

  it("renders a custom bar via the shape render prop (replacing the default rect)", () => {
    const { container } = render(() => (
      <BarChart
        width={400}
        height={400}
        data={PageData}
        margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
      >
        <Bar
          dataKey="uv"
          isAnimationActive={false}
          shape={(item) => <circle class="custom-bar" data-x={item.x} data-h={item.height} />}
        />
      </BarChart>
    ));
    flush();

    // No default rectangle shapes; one custom circle per data point, each wrapped in
    // a `.recharts-bar-rectangle` layer that received the bar's geometry.
    expect(container.querySelectorAll("rect.recharts-bar-rectangle")).toHaveLength(0);
    const circles = container.querySelectorAll("circle.custom-bar");
    expect(circles).toHaveLength(PageData.length);
    expect(circles[0]!.getAttribute("data-x")).toBe("26");
    expect(circles[0]!.getAttribute("data-h")).toBe("360");
  });

  it("activates the item tooltip when a custom bar shape is hovered", () => {
    const { container } = render(() => (
      <BarChart
        width={400}
        height={400}
        data={PageData}
        margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
      >
        <Bar
          dataKey="uv"
          isAnimationActive={false}
          shape={(item) => <circle class="custom-bar" data-h={item.height} />}
        />
        <Tooltip shared={false} />
      </BarChart>
    ));
    flush();

    // Handlers live on the wrapping `.recharts-bar-rectangle` layer (mouseenter
    // doesn't bubble from the circle, so hover the layer itself).
    const layers = container.querySelectorAll(".recharts-bar .recharts-bar-rectangle");
    fireEvent.mouseEnter(layers[0]!);
    flush();

    const values = [...container.querySelectorAll(".recharts-tooltip-item-value")].map(
      (n) => n.textContent,
    );
    expect(values).toEqual([String(PageData[0]!.uv)]);
  });
});
