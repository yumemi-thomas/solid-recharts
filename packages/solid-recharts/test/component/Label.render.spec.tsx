// Spec for the Label + LabelList vertical: the implicit `label` prop now renders
// real <Text> labels for reference elements (via CartesianLabelFromLabelProp) and
// per-data-point labels for graphical items (via LabelList + its context).
import { describe, expect, it } from "vitest";
import { flush } from "solid-js";
import { render } from "../helper/render";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, ReferenceLine } from "../../src";

const data = [
  { name: "A", uv: 10 },
  { name: "B", uv: 30 },
  { name: "C", uv: 50 },
];

describe("Label / LabelList", () => {
  it("renders a ReferenceLine's string label as a .recharts-label", () => {
    const { container } = render(() => (
      <LineChart width={400} height={300} data={data}>
        <XAxis dataKey="name" />
        <YAxis type="number" domain={[0, 100]} />
        <Line dataKey="uv" />
        <ReferenceLine y={50} label="threshold" />
      </LineChart>
    ));
    flush();

    const labels = container.querySelectorAll(".recharts-label");
    expect(labels).toHaveLength(1);
    expect(labels[0]?.textContent).toContain("threshold");
  });

  it("renders one LabelList label per bar from the bar's value", () => {
    const { container } = render(() => (
      <BarChart
        width={400}
        height={300}
        data={data}
        margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
      >
        <Bar isAnimationActive={false} dataKey="uv" label />
      </BarChart>
    ));
    flush();

    const list = container.querySelector(".recharts-bar .recharts-label-list");
    expect(list).not.toBeNull();
    const labels = container.querySelectorAll(".recharts-label-list .recharts-label");
    expect(labels).toHaveLength(data.length);
    // Default accessor pulls the bar's value: 10, 30, 50.
    expect([...labels].map((l) => l.textContent)).toEqual(["10", "30", "50"]);
  });

  it("renders nothing for label={false}", () => {
    const { container } = render(() => (
      <BarChart width={400} height={300} data={data}>
        <Bar dataKey="uv" label={false} />
      </BarChart>
    ));
    flush();

    expect(container.querySelector(".recharts-label-list")).toBeNull();
  });
});
