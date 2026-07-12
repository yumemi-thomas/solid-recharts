// Solid-recharts spec: XAxis/YAxis forward `axisLine`, `tickLine`, and `stroke`
// to the rendered <CartesianAxis>. recharts supports these via props but does not
// unit-test them on the cartesian axes (only PolarAngleAxis tests axisLine=false).
import { describe, expect, it } from "vitest";
import { Line, LineChart, XAxis, YAxis } from "../../src";
import { render } from "@solidjs/testing-library";

const data = [
  { name: "a", uv: 100 },
  { name: "b", uv: 200 },
  { name: "c", uv: 300 },
];

describe("axis line / stroke forwarding", () => {
  it("renders the XAxis line by default and hides it with axisLine={false}", () => {
    const shown = render(() => (
      <LineChart width={300} height={300} data={data}>
        <XAxis dataKey="name" />
        <Line dataKey="uv" />
      </LineChart>
    ));
    expect(
      shown.container.querySelectorAll(".recharts-xAxis .recharts-cartesian-axis-line"),
    ).toHaveLength(1);

    const hidden = render(() => (
      <LineChart width={300} height={300} data={data}>
        <XAxis dataKey="name" axisLine={false} />
        <Line dataKey="uv" />
      </LineChart>
    ));
    expect(
      hidden.container.querySelectorAll(".recharts-xAxis .recharts-cartesian-axis-line"),
    ).toHaveLength(0);
  });

  it("hides YAxis tick lines with tickLine={false}", () => {
    const { container } = render(() => (
      <LineChart width={300} height={300} data={data}>
        <YAxis tickLine={false} />
        <Line dataKey="uv" />
      </LineChart>
    ));
    expect(
      container.querySelectorAll(".recharts-yAxis .recharts-cartesian-axis-tick-line"),
    ).toHaveLength(0);
  });

  it("forwards stroke colour onto the XAxis line", () => {
    const { container } = render(() => (
      <LineChart width={300} height={300} data={data}>
        <XAxis dataKey="name" stroke="#ff7300" />
        <Line dataKey="uv" />
      </LineChart>
    ));
    const line = container.querySelector(".recharts-xAxis .recharts-cartesian-axis-line");
    expect(line).not.toBeNull();
    expect(line?.getAttribute("stroke")).toBe("#ff7300");
  });

  it("applies object-form axisLine svg props onto the YAxis line", () => {
    const { container } = render(() => (
      <LineChart width={300} height={300} data={data}>
        <YAxis axisLine={{ strokeWidth: 3 }} />
        <Line dataKey="uv" />
      </LineChart>
    ));
    const line = container.querySelector(".recharts-yAxis .recharts-cartesian-axis-line");
    expect(line).not.toBeNull();
    expect(line?.getAttribute("stroke-width")).toBe("3");
  });
});
