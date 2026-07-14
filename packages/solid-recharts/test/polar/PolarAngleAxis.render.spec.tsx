// Subset port of recharts 3.8.1 test/polar/PolarAngleAxis/PolarAngleAxis.spec.tsx
// (commit 7a23854) — the payoff of the polar-axis spine: a category PolarAngleAxis
// in a RadarChart renders one tick (line + label) per category plus the polygon
// axis line. The angle/radius axis selectors + the un-deferred axisSelectors polar
// branches feed this. `flush()` because the axis registers via an effect and its
// ticks compute from the store.
//
// Tier-A subset: asserts the structural parity facts (tick count, ordered category
// labels, axis line). Exact tick geometry + the numeric-axis/explicit-tick cases
// come online with Radar (which provides the item domain).
import { describe, expect, it } from "vitest";

import { render } from "@solidjs/testing-library";
import { RadarChart, PolarAngleAxis } from "../../src";

const data = [
  { subject: "Math", value: 120 },
  { subject: "English", value: 98 },
  { subject: "Science", value: 86 },
  { subject: "History", value: 99 },
];

describe("<PolarAngleAxis /> in RadarChart", () => {
  it("renders one tick (line + label) per category + a polygon axis line", () => {
    const { container } = render(() => (
      <RadarChart width={500} height={500} data={data}>
        <PolarAngleAxis dataKey="subject" />
      </RadarChart>
    ));
    const axis = container.querySelector(".recharts-polar-angle-axis.angleAxis");
    expect(axis).not.toBeNull();

    const ticks = container.querySelectorAll(".recharts-polar-angle-axis-tick");
    expect(ticks).toHaveLength(data.length);

    const tickLines = container.querySelectorAll(".recharts-polar-angle-axis-tick-line");
    expect(tickLines).toHaveLength(data.length);

    const labels = container.querySelectorAll(".recharts-polar-angle-axis-tick-value");
    expect([...labels].map((l) => l.textContent)).toEqual([
      "Math",
      "English",
      "Science",
      "History",
    ]);

    // Default axisLineType "polygon" → the ported <Polygon> draws a <path>
    // (documented Polygon deviation: it renders `path d=` not `<polygon>`).
    expect(container.querySelectorAll(".recharts-polar-angle-axis-line")).toHaveLength(1);
    expect(container.querySelector(".recharts-polar-angle-axis-line")?.tagName.toLowerCase()).toBe(
      "path",
    );

    // Geometric faithfulness: the polar viewBox is byte-faithful to recharts —
    // cx/cy = 250 (centric: full-width/2, NOT margin-offset like Pie) and
    // outerRadius = 0.8 · maxRadius = 0.8 · (min(500−10, 500−10)/2) = 196. So every
    // tick-line inner point (x1,y1) must lie exactly on the circle r=196 about (250,250)
    // — matching the reference golden (first tick y1=54 = 250−196).
    for (const tl of tickLines) {
      const x1 = Number(tl.getAttribute("x1"));
      const y1 = Number(tl.getAttribute("y1"));
      const r = Math.sqrt((x1 - 250) ** 2 + (y1 - 250) ** 2);
      expect(r).toBeCloseTo(196, 6);
    }
  });

  it("renders nothing when hide is set", () => {
    const { container } = render(() => (
      <RadarChart width={500} height={500} data={data}>
        <PolarAngleAxis dataKey="subject" hide />
      </RadarChart>
    ));
    expect(container.querySelectorAll(".recharts-polar-angle-axis-tick")).toHaveLength(0);
  });
});
