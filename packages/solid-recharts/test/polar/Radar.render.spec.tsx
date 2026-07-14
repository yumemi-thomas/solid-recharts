// Subset port of recharts 3.8.1 test/polar/Radar.spec.tsx (commit 7a23854) — the
// payoff of the Radar vertical: a <Radar> in a RadarChart registers as a polar item
// (giving the angle axis its data-driven domain) and draws the radar polygon with
// byte-identical geometry. The golden `d` is recharts' `expectRadarPolygons` value.
// `flush()` because Radar registers via an effect and points compute from the store.
//
// Tier-A: the polygon `d` is byte-identical to recharts (proves the angle band scale
// + radius scale + polarToCartesian wiring). dots/activeDot/animation/label/shape/
// tooltip/legend deferred.
import { describe, expect, it } from "vitest";

import { render } from "@solidjs/testing-library";
import { RadarChart, Radar, PolarAngleAxis } from "../../src";

const exampleRadarData = [
  { name: "iPhone 3GS", value: 420, half: 210 },
  { name: "iPhone 4", value: 460, half: 230 },
  { name: "iPhone 4s", value: 999, half: 500 },
  { name: "iPhone 5", value: 500, half: 250 },
  { name: "iPhone 5s", value: 864, half: 432 },
  { name: "iPhone 6", value: 650, half: 325 },
  { name: "iPhone 6s", value: 765, half: 383 },
  { name: "iPhone 5se", value: 365, half: 183 },
];

const GOLDEN_RADAR_PATH =
  "M250,167.68L313.7527,186.2473L445.804,250L319.2965,319.2965L250,419.344L159.9146,340.0854L100.06,250L199.4136,199.4136L250,167.68Z";

describe("<Radar /> in RadarChart", () => {
  it("renders the radar polygon with byte-identical geometry", () => {
    const { container } = render(() => (
      <RadarChart width={500} height={500} data={exampleRadarData}>
        <Radar dataKey="value" isAnimationActive={false} />
      </RadarChart>
    ));
    const polygon = container.querySelector(".recharts-radar-polygon path");
    expect(polygon).not.toBeNull();
    expect(polygon?.getAttribute("d")).toBe(GOLDEN_RADAR_PATH);
    // recharts default: no fill default → no fill attribute (the closing Z path
    // would otherwise use props.fill).
    expect(polygon?.getAttribute("fill")).toBeNull();
  });

  it("gives the angle axis a data-driven domain (one tick per data point)", () => {
    const { container } = render(() => (
      <RadarChart width={500} height={500} data={exampleRadarData}>
        <Radar dataKey="value" isAnimationActive={false} />
        <PolarAngleAxis dataKey="value" />
      </RadarChart>
    ));
    // 8 data points → 8 angle-axis ticks (the Radar item supplies the domain).
    expect(container.querySelectorAll(".recharts-polar-angle-axis-tick")).toHaveLength(
      exampleRadarData.length,
    );
  });

  it("renders nothing when hide is set", () => {
    const { container } = render(() => (
      <RadarChart width={500} height={500} data={exampleRadarData}>
        <Radar dataKey="value" hide />
      </RadarChart>
    ));
    expect(container.querySelectorAll(".recharts-radar-polygon")).toHaveLength(0);
  });
});
