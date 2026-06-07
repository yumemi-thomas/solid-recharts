// Subset port of recharts 3.8.1 test/polar/Radar.animation.spec.tsx (commit
// 7a23854). Radar animation is deferred in this Solid port, so Radar renders the
// settled t=1 polygon immediately.
import { describe, expect, it } from "vitest";
import { flush } from "solid-js";
import { render } from "../helper/render";
import { RadarChart, Radar } from "../../src";

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

const GOLDEN_RADAR_PATH =
  "M250,167.68L313.7527,186.2473L445.804,250L319.2965,319.2965L250,419.344L159.9146,340.0854L100.06,250L199.4136,199.4136L250,167.68Z";

function radarPath(container: Element): string | null {
  return container.querySelector(".recharts-radar-polygon path")?.getAttribute("d") ?? null;
}

describe("Radar animation", () => {
  it("renders the final polygon immediately while animation is deferred", () => {
    const { container } = render(() => (
      <RadarChart width={500} height={500} data={exampleRadarData}>
        <Radar dataKey="value" />
      </RadarChart>
    ));
    flush();

    expect(radarPath(container)).toBe(GOLDEN_RADAR_PATH);
  });
});
