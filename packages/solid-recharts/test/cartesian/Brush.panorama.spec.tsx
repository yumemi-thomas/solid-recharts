// Nested full-chart Brush panorama: <Brush><SomeChart>…</SomeChart></Brush> renders
// a compact overview of the FULL dataset at the brush rect. The nested chart is
// panorama-transparent (CartesianChart short-circuits inside a PanoramaContext),
// so its graphical items draw into the brush's panorama surface using the outer
// store's full data — no cloneElement.
import { describe, expect, it } from "vitest";
import { flush } from "solid-js";
import { Brush, Line, LineChart } from "../../src";
import { render } from "@solidjs/testing-library";

const data = [
  { name: "a", uv: 100 },
  { name: "b", uv: 200 },
  { name: "c", uv: 150 },
  { name: "d", uv: 300 },
];

describe("nested-chart Brush panorama", () => {
  it("renders a panorama line + full-data dots inside the brush", () => {
    const { container } = render(() => (
      <LineChart width={400} height={300} data={data}>
        <Line dataKey="uv" isAnimationActive={false} dot />
        {/* full chart inside the brush → overview of all data */}
        <Brush>
          <LineChart data={data}>
            <Line dataKey="uv" isAnimationActive={false} dot />
          </LineChart>
        </Brush>
      </LineChart>
    ));
    flush();
    // Main line + panorama line.
    expect(container.querySelectorAll(".recharts-line").length).toBe(2);
    // Two nested surfaces (main + panorama).
    expect(container.querySelectorAll("svg.recharts-surface").length).toBe(2);
    // The panorama draws a dot per data point (full dataset) in addition to the main.
    expect(container.querySelectorAll(".recharts-line-dots .recharts-dot").length).toBe(
      data.length * 2,
    );
  });
});
