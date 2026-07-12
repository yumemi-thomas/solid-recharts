// Spec for the Scatter vertical: a point cloud — one <Symbols> per data point at
// the (x, y) computed from the number axes. Reuses the cartesian scale spine via
// selectScatterPoints.
import { describe, expect, it } from "vitest";
import { flush } from "solid-js";
import { render } from "@solidjs/testing-library";
import { ScatterChart, Scatter, XAxis, YAxis } from "../../src";

const data = [
  { x: 100, y: 200 },
  { x: 120, y: 100 },
  { x: 170, y: 300 },
  { x: 140, y: 250 },
  { x: 150, y: 400 },
];

describe("<Scatter />", () => {
  it("renders one symbol per data point", () => {
    const { container } = render(() => (
      <ScatterChart width={400} height={400} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
        <XAxis type="number" dataKey="x" />
        <YAxis type="number" dataKey="y" />
        <Scatter data={data} fill="#ff7300" />
      </ScatterChart>
    ));
    flush();

    const layer = container.querySelector(".recharts-scatter");
    expect(layer).not.toBeNull();

    const symbols = container.querySelectorAll(".recharts-scatter-symbol");
    expect(symbols).toHaveLength(data.length);

    // Each symbol wraps a rendered <path> (the circle), filled with the scatter color.
    const paths = container.querySelectorAll(".recharts-scatter-symbol path");
    expect(paths).toHaveLength(data.length);
    expect(paths[0]?.getAttribute("fill")).toBe("#ff7300");
  });

  it("renders a custom point via the shape render prop (function form)", () => {
    const { container } = render(() => (
      <ScatterChart width={400} height={400} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
        <XAxis type="number" dataKey="x" />
        <YAxis type="number" dataKey="y" />
        <Scatter
          data={data}
          isAnimationActive={false}
          shape={(p) => <rect class="custom-point" x={p.cx} y={p.cy} width={4} height={4} />}
        />
      </ScatterChart>
    ));
    flush();

    // No default symbol <path>s; one custom rect per point, still inside the symbol layer.
    expect(container.querySelectorAll(".recharts-scatter-symbol path")).toHaveLength(0);
    const customs = container.querySelectorAll(".recharts-scatter-symbol rect.custom-point");
    expect(customs).toHaveLength(data.length);
    // The render prop received each point's computed coordinate.
    expect(customs[0]!.getAttribute("x")).not.toBeNull();
  });
});
