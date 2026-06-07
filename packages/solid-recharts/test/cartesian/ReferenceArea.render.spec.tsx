// Spec for the ReferenceArea vertical: a rectangle spanning a data-coordinate
// range (x1..x2, y1..y2), mapped to pixels through both cartesian scales.
import { describe, expect, it } from "vitest";
import { flush } from "solid-js";
import { render } from "../helper/render";
import { LineChart, Line, XAxis, YAxis, ReferenceArea } from "../../src";

const data = [
  { name: "A", uv: 10 },
  { name: "B", uv: 30 },
  { name: "C", uv: 50 },
  { name: "D", uv: 70 },
];

describe("<ReferenceArea />", () => {
  it("draws a rectangle spanning the mapped data range", () => {
    const { container } = render(() => (
      <LineChart
        width={500}
        height={500}
        data={data}
        margin={{ top: 5, right: 5, bottom: 5, left: 5 }}
      >
        <XAxis type="number" dataKey="uv" />
        <YAxis type="number" domain={[0, 100]} />
        <Line dataKey="uv" />
        <ReferenceArea x1={20} x2={50} y1={20} y2={80} fill="#ff0000" />
      </LineChart>
    ));
    flush();

    const rect = container.querySelector(".recharts-reference-area-rect");
    expect(rect).not.toBeNull();
    // Number X axis nices its domain to [0,80] → range [65,495]: x1=20 → 172.5,
    // x2=50 → 333.75. Y ([0,100] → [465,5]): y1=20 → 373, y2=80 → 97.
    // rectWithPoints → {x: 172.5, y: 97, width: 161.25, height: 276}.
    expect(rect?.getAttribute("d")).toBe("M 172.5,97 h 161.25 v 276 h -161.25 Z");
    expect(rect?.getAttribute("fill")).toBe("#ff0000");
  });

  it("extends an omitted edge to the plot-area boundary", () => {
    const { container } = render(() => (
      <LineChart
        width={500}
        height={500}
        data={data}
        margin={{ top: 5, right: 5, bottom: 5, left: 5 }}
      >
        <XAxis type="number" dataKey="uv" />
        <YAxis type="number" domain={[0, 100]} />
        <Line dataKey="uv" />
        {/* Only y1/y2 given: the area spans the full plot width [65, 495]. */}
        <ReferenceArea y1={20} y2={80} fill="#00ff00" />
      </LineChart>
    ));
    flush();

    const rect = container.querySelector(".recharts-reference-area-rect");
    expect(rect).not.toBeNull();
    // x spans rangeMin..rangeMax = 65..495 (width 430), y from 97..373 (height 276).
    expect(rect?.getAttribute("d")).toBe("M 65,97 h 430 v 276 h -430 Z");
  });
});
