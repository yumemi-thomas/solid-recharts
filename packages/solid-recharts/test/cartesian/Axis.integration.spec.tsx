// Axis-integration specs: exercise the XAxis/YAxis ↔ graphical-item spine
// end-to-end — domain computed from data, nice-tick generation, explicit ticks,
// tickCount/allowDecimals, allowDataOverflow, reversed, multiple axes, hide.
//
// These assert tick VALUES / counts / ordering (the offset-independent integration
// facts). Exact pixel coordinates are intentionally NOT asserted: the port's plot
// offset is still margin-only (axis-size subtraction is a separate vertical), so
// coords would diverge from recharts for reasons unrelated to axis logic.
import { describe, expect, it } from "vitest";
import { flush } from "solid-js";
import { render } from "../helper/render";
import { LineChart, Line, XAxis, YAxis } from "../../src";

function tickTexts(container: Element, axis: ".recharts-xAxis" | ".recharts-yAxis"): string[] {
  return [...container.querySelectorAll(`${axis} .recharts-cartesian-axis-tick-value`)].map(
    (n) => n.textContent ?? "",
  );
}

function tickYs(container: Element): number[] {
  return [...container.querySelectorAll(".recharts-yAxis .recharts-cartesian-axis-tick-value")].map(
    (n) => Number(n.getAttribute("y")),
  );
}

const numericData = [
  { name: "A", uv: 0 },
  { name: "B", uv: 100 },
  { name: "C", uv: 200 },
  { name: "D", uv: 300 },
  { name: "E", uv: 400 },
];

const margin = { top: 20, right: 20, bottom: 20, left: 20 };

describe("axis integration", () => {
  it("computes a numeric Y domain from data and generates nice ticks", () => {
    const { container } = render(() => (
      <LineChart width={400} height={400} data={numericData} margin={margin}>
        <YAxis />
        <Line dataKey="uv" />
      </LineChart>
    ));
    flush();
    expect(tickTexts(container, ".recharts-yAxis")).toEqual(["0", "100", "200", "300", "400"]);
  });

  it("renders a category tick per row on a category axis", () => {
    const { container } = render(() => (
      <LineChart width={400} height={400} data={numericData} margin={margin}>
        <XAxis dataKey="name" />
        <Line dataKey="uv" />
      </LineChart>
    ));
    flush();
    expect(tickTexts(container, ".recharts-xAxis")).toEqual(["A", "B", "C", "D", "E"]);
  });

  it("uses explicit ticks verbatim, bypassing generation", () => {
    const { container } = render(() => (
      <LineChart width={400} height={400} data={numericData} margin={margin}>
        <YAxis type="number" ticks={[0, 400, 800, 1200]} />
        <Line dataKey="uv" />
      </LineChart>
    ));
    flush();
    expect(tickTexts(container, ".recharts-yAxis")).toEqual(["0", "400", "800", "1200"]);
  });

  it("honors an explicit domain with allowDataOverflow", () => {
    const { container } = render(() => (
      <LineChart width={400} height={400} data={numericData} margin={margin}>
        <YAxis domain={[0, 1000]} allowDataOverflow />
        <Line dataKey="uv" />
      </LineChart>
    ));
    flush();
    expect(tickTexts(container, ".recharts-yAxis")).toEqual(["0", "250", "500", "750", "1000"]);
  });

  it("produces integer-only ticks with allowDecimals=false + tickCount", () => {
    const decimalData = [
      { name: "A", pv: 24 },
      { name: "B", pv: 45.67 },
      { name: "C", pv: 13.98 },
      { name: "D", pv: 98 },
    ];
    const { container } = render(() => (
      <LineChart width={500} height={300} data={decimalData} margin={margin}>
        <YAxis domain={["dataMin", "dataMax"]} tickCount={3} allowDecimals={false} />
        <Line dataKey="pv" />
      </LineChart>
    ));
    flush();
    // Integer nice-ticks over [13.98, 98] — byte-identical to recharts' output.
    expect(tickTexts(container, ".recharts-yAxis")).toEqual(["14", "59", "98"]);
  });

  it("inverts the tick order when reversed (same values, flipped positions)", () => {
    const normal = render(() => (
      <LineChart width={400} height={400} data={numericData} margin={margin}>
        <YAxis />
        <Line dataKey="uv" />
      </LineChart>
    ));
    flush();
    const reversed = render(() => (
      <LineChart width={400} height={400} data={numericData} margin={margin}>
        <YAxis reversed />
        <Line dataKey="uv" />
      </LineChart>
    ));
    flush();

    // Same tick values either way.
    expect(tickTexts(reversed.container, ".recharts-yAxis")).toEqual(
      tickTexts(normal.container, ".recharts-yAxis"),
    );
    // Normal Y goes high→low pixel as value rises (0 at bottom); reversed flips it.
    const normalYs = tickYs(normal.container);
    const reversedYs = tickYs(reversed.container);
    expect(normalYs[0]).toBeGreaterThan(normalYs[normalYs.length - 1]!);
    expect(reversedYs[0]).toBeLessThan(reversedYs[reversedYs.length - 1]!);
  });

  it("supports multiple Y axes addressed by yAxisId", () => {
    const multiData = [
      { name: "A", uv: 100, pv: 5000 },
      { name: "B", uv: 200, pv: 8000 },
    ];
    const { container } = render(() => (
      <LineChart width={500} height={400} data={multiData} margin={margin}>
        <YAxis yAxisId="left" />
        <YAxis yAxisId="right" orientation="right" />
        <Line dataKey="uv" yAxisId="left" />
        <Line dataKey="pv" yAxisId="right" />
      </LineChart>
    ));
    flush();
    // Two distinct axis layers, each with its own (non-empty) tick set.
    expect(container.querySelectorAll(".recharts-yAxis").length).toBe(2);
    const allYTicks = container.querySelectorAll(
      ".recharts-yAxis .recharts-cartesian-axis-tick-value",
    );
    expect(allYTicks.length).toBeGreaterThan(5);
  });

  it("renders no ticks for a hidden axis", () => {
    const { container } = render(() => (
      <LineChart width={400} height={400} data={numericData} margin={margin}>
        <YAxis hide />
        <Line dataKey="uv" />
      </LineChart>
    ));
    flush();
    expect(tickTexts(container, ".recharts-yAxis")).toEqual([]);
  });
});
