// Spec for the ReferenceDot vertical: a circle at a data coordinate (x, y),
// mapped to pixels through both cartesian scales (CartesianScaleHelperImpl).
import { describe, expect, it } from "vitest";

import { render } from "@solidjs/testing-library";
import { LineChart, Line, XAxis, YAxis, ReferenceDot } from "../../src";

const data = [
  { name: "A", uv: 10 },
  { name: "B", uv: 30 },
  { name: "C", uv: 50 },
  { name: "D", uv: 70 },
];

describe("<ReferenceDot />", () => {
  it("draws a circle centered at the mapped data coordinate", () => {
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
        <ReferenceDot x={40} y={50} r={8} fill="#ff0000" />
      </LineChart>
    ));
    const dot = container.querySelector(".recharts-reference-dot-dot");
    expect(dot).not.toBeNull();
    // Y scale [0,100] → range [465, 5]: y=50 → cy=235.
    // X scale (uv domain [10,70]) → range [65, 495]: x=40 → 65 + ((40-10)/60)*430 = 280.
    expect(dot?.getAttribute("cy")).toBe("235");
    expect(dot?.getAttribute("cx")).toBe("280");
    expect(dot?.getAttribute("r")).toBe("8");
    expect(dot?.getAttribute("fill")).toBe("#ff0000");
  });

  it("renders nothing when the dot overflows the domain and ifOverflow='discard'", () => {
    const { container } = render(() => (
      <LineChart width={500} height={500} data={data}>
        <XAxis type="number" dataKey="uv" />
        <YAxis type="number" domain={[0, 100]} />
        <Line dataKey="uv" />
        <ReferenceDot x={40} y={500} r={8} fill="#ff0000" />
      </LineChart>
    ));
    expect(container.querySelectorAll(".recharts-reference-dot-dot")).toHaveLength(0);
  });
});
