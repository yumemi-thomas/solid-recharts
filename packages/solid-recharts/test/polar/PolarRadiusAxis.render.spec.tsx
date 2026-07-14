// Subset port of recharts 3.8.1 test/polar/PolarRadiusAxis.spec.tsx (commit 7a23854).
// The radius axis (the value axis in a centric RadarChart) renders its axis line +
// numeric tick labels along `angle`. An explicit numeric `domain` gives it a domain
// without needing a Radar item (deferred). `flush()` because the axis registers via
// an effect and ticks compute from the store.
//
// Tier-A subset: structural parity (axis present, ≥1 tick with numeric labels, one
// axis line). Exact nice-tick geometry comes online with Radar + the full spec.
import { describe, expect, it } from "vitest";

import { render } from "@solidjs/testing-library";
import { RadarChart, PolarRadiusAxis } from "../../src";

const data = [
  { subject: "Math", value: 120 },
  { subject: "English", value: 98 },
  { subject: "Science", value: 86 },
];

describe("<PolarRadiusAxis /> in RadarChart", () => {
  it("renders the axis line + numeric tick labels for an explicit domain", () => {
    const { container } = render(() => (
      <RadarChart width={500} height={500} data={data}>
        <PolarRadiusAxis domain={[0, 150]} allowDataOverflow />
      </RadarChart>
    ));
    const axis = container.querySelector(".recharts-polar-radius-axis.radiusAxis");
    expect(axis).not.toBeNull();

    expect(container.querySelectorAll(".recharts-polar-radius-axis-line")).toHaveLength(1);

    const labels = container.querySelectorAll(".recharts-polar-radius-axis-tick-value");
    expect(labels.length).toBeGreaterThan(0);
    // Every tick label is a finite number (the radius scale is numeric).
    for (const l of labels) {
      expect(Number.isFinite(Number(l.textContent))).toBe(true);
    }
  });

  it("renders nothing when hide is set", () => {
    const { container } = render(() => (
      <RadarChart width={500} height={500} data={data}>
        <PolarRadiusAxis domain={[0, 150]} allowDataOverflow hide />
      </RadarChart>
    ));
    expect(container.querySelectorAll(".recharts-polar-radius-axis-tick")).toHaveLength(0);
  });
});
