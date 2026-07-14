// Proves the polar tooltip + legend wiring (Pie/Radar/RadialBar now register a
// TooltipPayloadConfiguration + a legend payload, mirroring the cartesian items).
// `flush()` because registration + sectors compute via effects/selectors.
import { describe, expect, it } from "vitest";

import { render, fireEvent } from "@solidjs/testing-library";
import {
  PieChart,
  Pie,
  RadarChart,
  Radar,
  RadialBarChart,
  RadialBar,
  Legend,
  Tooltip,
} from "../../src";
import { PageData } from "../_data";

const radarData = [
  { subject: "Math", value: 120 },
  { subject: "English", value: 98 },
  { subject: "Science", value: 86 },
];

describe("polar tooltip + legend wiring", () => {
  it("Pie renders a legend item per slice and an item tooltip on hover", () => {
    const { container } = render(() => (
      <PieChart width={400} height={400}>
        <Pie data={PageData} dataKey="uv" nameKey="name" isAnimationActive={false} />
        <Legend />
        <Tooltip />
      </PieChart>
    ));
    // One legend item per slice.
    expect(container.querySelectorAll(".recharts-legend-item")).toHaveLength(PageData.length);
    expect(container.querySelectorAll(".recharts-tooltip-item")).toHaveLength(0);

    // Hover the first sector → item tooltip for that slice (uv 400, name Page A).
    const firstSector = container.querySelector(".recharts-pie-sector");
    if (firstSector == null) {
      throw new Error("expected a pie sector");
    }
    fireEvent.mouseEnter(firstSector);
    const values = [...container.querySelectorAll(".recharts-tooltip-item-value")].map(
      (n) => n.textContent,
    );
    expect(values).toEqual(["400"]);
  });

  it("Radar registers a single legend item (axis-type)", () => {
    const { container } = render(() => (
      <RadarChart width={400} height={400} data={radarData}>
        <Radar dataKey="value" name="score" stroke="#82ca9d" fill="#82ca9d" />
        <Legend />
      </RadarChart>
    ));
    const items = [...container.querySelectorAll(".recharts-legend-item-text")].map(
      (n) => n.textContent,
    );
    expect(items).toEqual(["score"]);
  });

  it("RadialBar registers a legend item", () => {
    const { container } = render(() => (
      <RadialBarChart width={400} height={400} data={PageData}>
        <RadialBar dataKey="uv" name="uv" fill="#8884d8" />
        <Legend />
      </RadialBarChart>
    ));
    expect(container.querySelectorAll(".recharts-legend-item").length).toBeGreaterThan(0);
  });
});
