// Spec for the cartesian axis rendering vertical: <XAxis>/<YAxis> now draw the
// CartesianAxis (axis line + tick lines + tick labels) from the tick selectors,
// not just register settings.
import { describe, expect, it } from "vitest";
import { flush } from "solid-js";
import { render } from "@solidjs/testing-library";
import { LineChart, Line, XAxis, YAxis } from "../../src";
import { PageData } from "../_data";

describe("<XAxis>/<YAxis> rendering", () => {
  it("draws tick labels, tick lines, and the axis line", () => {
    const { container } = render(() => (
      <LineChart
        width={400}
        height={400}
        data={PageData}
        margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
      >
        <XAxis dataKey="name" />
        <YAxis />
        <Line dataKey="uv" stroke="#ff7300" />
      </LineChart>
    ));
    flush();

    // Axis layers exist.
    expect(container.querySelector(".recharts-xAxis")).not.toBeNull();
    expect(container.querySelector(".recharts-yAxis")).not.toBeNull();

    // X axis: one tick label per category, in order.
    const xLabels = [
      ...container.querySelectorAll(".recharts-xAxis .recharts-cartesian-axis-tick-value"),
    ].map((n) => n.textContent);
    expect(xLabels).toEqual(["Page A", "Page B", "Page C", "Page D", "Page E", "Page F"]);

    // Y axis: numeric tick labels spanning the uv domain (0 … 400 nice ticks).
    const yLabels = [
      ...container.querySelectorAll(".recharts-yAxis .recharts-cartesian-axis-tick-value"),
    ].map((n) => n.textContent);
    expect(yLabels.length).toBeGreaterThan(0);
    expect(yLabels).toContain("0");
    expect(yLabels).toContain("400");

    // Axis line + tick lines render.
    expect(container.querySelectorAll(".recharts-cartesian-axis-line").length).toBe(2);
    expect(
      container.querySelectorAll(".recharts-xAxis .recharts-cartesian-axis-tick-line").length,
    ).toBe(6);
  });
});
