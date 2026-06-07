// Subset port of recharts 3.8.1 test/polar/RadialBar/RadialBar.spec.tsx (commit
// 7a23854) — the last polar graphical item: a <RadialBar> in a RadialBarChart
// registers as a polar item and renders one ring sector per data row. `flush()`
// because RadialBar registers via an effect and its sectors compute from the store.
//
// Tier-A subset: structural parity (one `.recharts-radial-bar-sector` per data row,
// inside `.recharts-radial-bar-sectors`, fill forwarded). Stacks/background/
// animation/label/exact geometry deferred.
import { describe, expect, it } from "vitest";
import { flush } from "solid-js";
import { render } from "../helper/render";
import { RadialBarChart, RadialBar } from "../../src";
import { PageData } from "../_data";

describe("<RadialBar /> in RadialBarChart", () => {
  it("renders one ring sector per data row", () => {
    const { container } = render(() => (
      <RadialBarChart width={500} height={500} data={PageData}>
        <RadialBar dataKey="uv" fill="#8884d8" isAnimationActive={false} />
      </RadialBarChart>
    ));
    flush();

    const sectors = container.querySelectorAll(
      ".recharts-radial-bar-sectors .recharts-radial-bar-sector",
    );
    expect(sectors).toHaveLength(PageData.length);
    const first = sectors.item(0);
    if (first == null) {
      throw new Error("expected a radial bar sector");
    }
    // Each sector is a <Sector> path.
    expect(first.tagName.toLowerCase()).toBe("path");
    expect(first).toHaveAttribute("fill", "#8884d8");
    // The path describes a real arc (non-empty `d`).
    expect((first.getAttribute("d") ?? "").length).toBeGreaterThan(0);
  });

  it("renders nothing when hide is set", () => {
    const { container } = render(() => (
      <RadialBarChart width={500} height={500} data={PageData}>
        <RadialBar dataKey="uv" hide />
      </RadialBarChart>
    ));
    flush();

    expect(container.querySelectorAll(".recharts-radial-bar-sector")).toHaveLength(0);
  });

  it("renders a custom sector via the shape render prop (function form)", () => {
    const { container } = render(() => (
      <RadialBarChart width={500} height={500} data={PageData}>
        <RadialBar
          dataKey="uv"
          isAnimationActive={false}
          shape={(p) => <circle class="custom-radial" data-angle={p.endAngle} />}
        />
      </RadialBarChart>
    ));
    flush();

    // No default sector <path>s; one custom circle per data row.
    expect(container.querySelectorAll(".recharts-radial-bar-sector path")).toHaveLength(0);
    expect(container.querySelectorAll("circle.custom-radial")).toHaveLength(PageData.length);
  });
});
