// Proves PER-ROW legend payloads for Pie and RadialBar (recharts emits one legend
// entry per data row, not one per series). Pie's entry color is cell/data/component
// aware (its sectors already resolve fill); RadialBar reads name/fill off each row.
// `flush()` because legend payload registers via effects/selectors.
import { describe, expect, it } from "vitest";
import { flush, For } from "solid-js";
import { render } from "@solidjs/testing-library";
import { PieChart, Pie, RadialBarChart, RadialBar, Legend, Cell } from "../../src";

const pieData = [
  { name: "Group A", value: 400 },
  { name: "Group B", value: 300 },
  { name: "Group C", value: 200 },
];

const radialData = [
  { name: "Alpha", uv: 10, fill: "#aa1111" },
  { name: "Beta", uv: 20, fill: "#11aa11" },
  { name: "Gamma", uv: 30, fill: "#1111aa" },
];

function legendTexts(container: Element): Array<string | null> {
  return [...container.querySelectorAll(".recharts-legend-item-text")].map((n) => n.textContent);
}

function legendIconFills(container: Element): Array<string | null> {
  return [...container.querySelectorAll(".recharts-legend-item .recharts-legend-icon")].map((n) =>
    n.getAttribute("fill"),
  );
}

describe("per-row legend payloads", () => {
  it("Pie emits one legend entry per slice, colored from its <Cell>", () => {
    const colors = ["#e11111", "#11e111", "#1111e1"];
    const { container } = render(() => (
      <PieChart width={400} height={400}>
        <Pie data={pieData} dataKey="value" nameKey="name" isAnimationActive={false}>
          <For each={pieData}>{(_entry, i) => <Cell fill={colors[i()]} />}</For>
        </Pie>
        <Legend />
      </PieChart>
    ));
    flush();

    expect(container.querySelectorAll(".recharts-legend-item")).toHaveLength(pieData.length);
    expect(legendTexts(container)).toEqual(["Group A", "Group B", "Group C"]);
    // The rect legend icon's fill mirrors the cell color, per row.
    expect(legendIconFills(container)).toEqual(colors);
  });

  it("Pie legend falls back to the Pie fill when no Cell sets a color", () => {
    const { container } = render(() => (
      <PieChart width={400} height={400}>
        <Pie
          data={pieData}
          dataKey="value"
          nameKey="name"
          fill="#abcdef"
          isAnimationActive={false}
        />
        <Legend />
      </PieChart>
    ));
    flush();

    expect(legendTexts(container)).toEqual(["Group A", "Group B", "Group C"]);
    expect(legendIconFills(container)).toEqual(["#abcdef", "#abcdef", "#abcdef"]);
  });

  it("RadialBar emits one legend entry per data row, named/colored from the row", () => {
    const { container } = render(() => (
      <RadialBarChart width={400} height={400} data={radialData}>
        <RadialBar dataKey="uv" isAnimationActive={false} />
        <Legend />
      </RadialBarChart>
    ));
    flush();

    expect(container.querySelectorAll(".recharts-legend-item")).toHaveLength(radialData.length);
    expect(legendTexts(container)).toEqual(["Alpha", "Beta", "Gamma"]);
    expect(legendIconFills(container)).toEqual(["#aa1111", "#11aa11", "#1111aa"]);
  });
});
