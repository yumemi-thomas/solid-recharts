// Subset port of recharts 3.8.1 test/polar/PolarGrid.spec.tsx (commit 7a23854).
// PolarGrid draws concentric rings (one per radius tick) + radial lines (one per
// angle tick), reading from the polar axis ticks + viewBox. `flush()` because the
// grid reads store-derived ticks that depend on the Radar/axis effects.
//
// Tier-A subset: structural parity (one radial line per angle tick = data length;
// concentric polygons by default, circles when gridType="circle"). Exact grid
// geometry comes online with the full spec.
import { describe, expect, it } from "vitest";
import { flush } from "solid-js";
import { render } from "../helper/render";
import { RadarChart, Radar, PolarGrid } from "../../src";

const exampleRadarData = [
  { name: "iPhone 3GS", value: 420 },
  { name: "iPhone 4", value: 460 },
  { name: "iPhone 4s", value: 999 },
  { name: "iPhone 5", value: 500 },
  { name: "iPhone 5s", value: 864 },
  { name: "iPhone 6", value: 650 },
  { name: "iPhone 6s", value: 765 },
  { name: "iPhone 5se", value: 365 },
];

describe("<PolarGrid /> in RadarChart", () => {
  it("draws one radial line per angle tick + concentric polygons by default", () => {
    const { container } = render(() => (
      <RadarChart width={500} height={500} data={exampleRadarData}>
        <Radar dataKey="value" />
        <PolarGrid />
      </RadarChart>
    ));
    flush();

    expect(container.querySelector(".recharts-polar-grid")).not.toBeNull();

    // 8 categories → 8 radial lines.
    expect(container.querySelectorAll(".recharts-polar-grid-angle line")).toHaveLength(
      exampleRadarData.length,
    );

    // Default gridType "polygon" → concentric polygons (one per radius tick).
    expect(
      container.querySelectorAll(".recharts-polar-grid-concentric-polygon").length,
    ).toBeGreaterThan(0);
    expect(container.querySelectorAll(".recharts-polar-grid-concentric-circle")).toHaveLength(0);
  });

  it("draws concentric circles when gridType is circle", () => {
    const { container } = render(() => (
      <RadarChart width={500} height={500} data={exampleRadarData}>
        <Radar dataKey="value" />
        <PolarGrid gridType="circle" />
      </RadarChart>
    ));
    flush();

    expect(
      container.querySelectorAll(".recharts-polar-grid-concentric-circle").length,
    ).toBeGreaterThan(0);
    expect(container.querySelectorAll(".recharts-polar-grid-concentric-polygon")).toHaveLength(0);
  });

  it("omits radial lines when radialLines is false", () => {
    const { container } = render(() => (
      <RadarChart width={500} height={500} data={exampleRadarData}>
        <Radar dataKey="value" />
        <PolarGrid radialLines={false} />
      </RadarChart>
    ));
    flush();

    expect(container.querySelectorAll(".recharts-polar-grid-angle line")).toHaveLength(0);
  });
});
