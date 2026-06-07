// Ported from recharts 3.8.1 test/cartesian/YAxis/YAxis.interval-zero.spec.tsx (commit 7a23854).
import { flush } from "solid-js";
import { describe, expect, it } from "vitest";
import { Line, LineChart, XAxis, YAxis } from "../../../src";
import { render } from "../../helper/render";

describe("YAxis interval={0} with custom ticks - comprehensive tests", () => {
  const data = [
    { name: "A", value: -30 },
    { name: "B", value: -10 },
    { name: "C", value: 0 },
    { name: "D", value: 10 },
    { name: "E", value: 30 },
  ];

  const customTicks = [-35, -25, -15, -5, 0, 5, 15, 25, 35];

  const yAxisTickTexts = (container: Element): ReadonlyArray<string | null> =>
    Array.from(
      container.querySelectorAll(".recharts-yAxis .recharts-cartesian-axis-tick-value"),
    ).map((tick) => tick.textContent);

  it("should display all 9 ticks with interval={0} - standard size", () => {
    const { container } = render(() => (
      <LineChart width={500} height={300} data={data}>
        <XAxis dataKey="name" />
        <YAxis domain={[-35, 35]} interval={0} ticks={customTicks} />
        <Line dataKey="value" />
      </LineChart>
    ));
    flush();

    expect(yAxisTickTexts(container)).toEqual([
      "-35",
      "-25",
      "-15",
      "-5",
      "0",
      "5",
      "15",
      "25",
      "35",
    ]);
  });

  it("should display all 9 ticks with interval={0} - small height", () => {
    const { container } = render(() => (
      <LineChart width={500} height={200} data={data}>
        <XAxis dataKey="name" />
        <YAxis domain={[-35, 35]} interval={0} ticks={customTicks} />
        <Line dataKey="value" />
      </LineChart>
    ));
    flush();

    const tickTexts = yAxisTickTexts(container);
    expect(tickTexts.length).toBe(9);
    expect(tickTexts).toContain("0");
  });

  it("should display all 9 ticks with interval={0} and large minTickGap", () => {
    const { container } = render(() => (
      <LineChart width={500} height={300} data={data}>
        <XAxis dataKey="name" />
        <YAxis domain={[-35, 35]} interval={0} ticks={customTicks} minTickGap={20} />
        <Line dataKey="value" />
      </LineChart>
    ));
    flush();

    const tickTexts = yAxisTickTexts(container);
    expect(tickTexts.length).toBe(9);
    expect(tickTexts).toContain("0");
  });

  it("should respect interval={1} and skip every other tick", () => {
    const { container } = render(() => (
      <LineChart width={500} height={300} data={data}>
        <XAxis dataKey="name" />
        <YAxis domain={[-35, 35]} interval={1} ticks={customTicks} />
        <Line dataKey="value" />
      </LineChart>
    ));
    flush();

    expect(yAxisTickTexts(container)).toEqual(["-35", "-15", "0", "15", "35"]);
  });
});
