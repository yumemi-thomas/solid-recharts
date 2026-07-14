// Solid-recharts spec (no recharts counterpart): regression tests for cross-chart
// z-index portal isolation. Two bugs once compounded here:
//  1. zIndexSlice shallow-copied the module-level initial map, so every chart
//     store shared the same ZIndexEntry objects — the last chart to register a
//     portal <g> hijacked every other chart's portal target.
//  2. ZIndexLayer parented its <Portal> to the component owner without disposing
//     it when the keyed target changed, so content ALSO stayed in the stale
//     target — bar rectangles rendered duplicated inside a sibling pie chart.
import { describe, expect, it } from "vitest";
import { createSignal, Show } from "solid-js";
import { Bar, BarChart, Pie, PieChart } from "../../src";
import { assertNotNull } from "../helper/assertNotNull";
import { render } from "@solidjs/testing-library";

const barData = [
  { name: "a", uv: 100 },
  { name: "b", uv: 200 },
  { name: "c", uv: 300 },
];

const pieData = [
  { name: "x", value: 40 },
  { name: "y", value: 30 },
  { name: "z", value: 30 },
];

describe("multi-chart zIndex portal isolation", () => {
  it("keeps bar layers in their own chart when two charts mount together", () => {
    const { container } = render(() => (
      <>
        <BarChart width={300} height={300} data={barData}>
          <Bar dataKey="uv" isAnimationActive={false} />
        </BarChart>
        <PieChart width={300} height={300}>
          <Pie data={pieData} dataKey="value" isAnimationActive={false} />
        </PieChart>
      </>
    ));
    const surfaces = container.querySelectorAll("svg.recharts-surface");
    expect(surfaces).toHaveLength(2);
    const [barSvg, pieSvg] = Array.from(surfaces);
    assertNotNull(barSvg);
    assertNotNull(pieSvg);

    expect(barSvg.querySelectorAll(".recharts-bar")).toHaveLength(1);
    expect(barSvg.querySelectorAll(".recharts-sector")).toHaveLength(0);
    expect(pieSvg.querySelectorAll(".recharts-bar")).toHaveLength(0);
    expect(pieSvg.querySelectorAll(".recharts-sector").length).toBeGreaterThan(0);

    // No duplicated bar layer anywhere (a stale, undisposed portal would leave
    // a second copy behind).
    expect(document.querySelectorAll(".recharts-bar")).toHaveLength(1);
  });

  it("keeps bar layers in their own chart when a second chart mounts later", () => {
    const [showPie, setShowPie] = createSignal(false);
    const { container } = render(() => (
      <>
        <BarChart width={300} height={300} data={barData}>
          <Bar dataKey="uv" isAnimationActive={false} />
        </BarChart>
        <Show when={showPie()}>
          <PieChart width={300} height={300}>
            <Pie data={pieData} dataKey="value" isAnimationActive={false} />
          </PieChart>
        </Show>
      </>
    ));
    expect(container.querySelectorAll("svg.recharts-surface")).toHaveLength(1);

    // Mounting the pie later used to overwrite the bar chart's registered portal
    // element (shared slice state) and re-portal the bars into the pie's svg.
    setShowPie(true);
    const surfaces = container.querySelectorAll("svg.recharts-surface");
    expect(surfaces).toHaveLength(2);
    const [barSvg, pieSvg] = Array.from(surfaces);
    assertNotNull(barSvg);
    assertNotNull(pieSvg);

    expect(barSvg.querySelectorAll(".recharts-bar")).toHaveLength(1);
    expect(pieSvg.querySelectorAll(".recharts-bar")).toHaveLength(0);
    expect(pieSvg.querySelectorAll(".recharts-sector").length).toBeGreaterThan(0);
    expect(document.querySelectorAll(".recharts-bar")).toHaveLength(1);
  });
});
