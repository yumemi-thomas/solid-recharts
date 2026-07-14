// Spec for CartesianGrid: draws horizontal + vertical grid lines aligned to the
// axis ticks across the plot area.
import { describe, expect, it } from "vitest";

import { render } from "@solidjs/testing-library";
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "../../src";
import { PageData } from "../_data";

describe("<CartesianGrid />", () => {
  it("draws vertical lines at X ticks and horizontal lines at Y ticks", () => {
    const { container } = render(() => (
      <LineChart
        width={400}
        height={400}
        data={PageData}
        margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Line dataKey="uv" stroke="#ff7300" />
      </LineChart>
    ));
    expect(container.querySelector(".recharts-cartesian-grid")).not.toBeNull();

    // One vertical line per X category (6).
    const verticalLines = container.querySelectorAll(".recharts-cartesian-grid-vertical line");
    expect(verticalLines).toHaveLength(PageData.length);

    // Horizontal lines at the Y nice ticks (>0).
    const horizontalLines = container.querySelectorAll(".recharts-cartesian-grid-horizontal line");
    expect(horizontalLines.length).toBeGreaterThan(0);

    // Dash pattern is forwarded.
    expect(verticalLines[0]?.getAttribute("stroke-dasharray")).toBe("3 3");
  });
});
