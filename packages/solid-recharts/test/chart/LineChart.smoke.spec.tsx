// Smoke test for the empty-chart vertical (steps 1-8). Not a recharts spec — it
// validates that the whole scaffold (store → slices → contexts → selectors →
// containers → chart composition) mounts and renders correct SVG end-to-end.
// The comprehensive `chartDimensions.spec` parity port is the next milestone.
import { describe, it, expect } from "vitest";
import { render } from "../helper/render";
import { LineChart } from "../../src";

describe("LineChart (empty-chart smoke)", () => {
  // Any reactive-graph diagnostic fired while the chart mounts (e.g. a
  // STRICT_READ_UNTRACKED from a top-level prop read) FAILS the test via the
  // global guard in test/setup.ts — that's the diagnostics discipline.
  it("mounts and renders a sized root Surface driven by the store", () => {
    const { container } = render(() => (
      <LineChart
        width={100}
        height={200}
        margin={{ top: 11, right: 12, bottom: 13, left: 14 }}
        title="Line Chart"
        desc="This is a line chart"
      />
    ));

    // one root <div class="recharts-wrapper">
    expect(container.querySelector(".recharts-wrapper")).toBeInTheDocument();

    // one root <svg class="recharts-surface"> sized from the store (width/height props)
    const svgs = container.querySelectorAll("svg");
    expect(svgs).toHaveLength(1);
    const surface = svgs[0];
    expect(surface).toHaveAttribute("width", "100");
    expect(surface).toHaveAttribute("height", "200");
    expect(surface).toHaveAttribute("viewBox", "0 0 100 200");
    expect(surface).toHaveAttribute("tabindex", "0");
    expect(surface).toHaveAttribute("role", "application");

    // title / desc
    expect(container.querySelector("title")).toHaveTextContent("Line Chart");
    expect(container.querySelector("desc")).toHaveTextContent("This is a line chart");

    // one clipPath whose rect is the plot area (chart minus margins): x=14 y=11 w=74 h=176
    const clipPaths = container.querySelectorAll("clipPath");
    expect(clipPaths).toHaveLength(1);
    const rect = clipPaths[0]?.querySelector("rect");
    expect(rect).toHaveAttribute("x", "14");
    expect(rect).toHaveAttribute("y", "11");
    expect(rect).toHaveAttribute("width", "74");
    expect(rect).toHaveAttribute("height", "176");
  });
});
