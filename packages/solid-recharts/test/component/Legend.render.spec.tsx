// Spec for the Legend vertical: each graphical item registers a legend payload
// (SetLegendPayload → legendSlice) and <Legend> renders one item per series via
// the portal. itemSorter defaults to "value" → alphabetical by label.
import { describe, expect, it } from "vitest";
import { flush } from "solid-js";
import { render } from "@solidjs/testing-library";
import { Area, AreaChart, Bar, BarChart, Legend, Line, LineChart } from "../../src";
import { numericalData, PageData } from "../_data";

function legendLabels(container: Element): Array<string | null> {
  return [...container.querySelectorAll(".recharts-legend-item-text")].map((n) => n.textContent);
}

describe("<Legend />", () => {
  it("renders one item per series with the dataKey labels", () => {
    const { container } = render(() => (
      <LineChart
        width={400}
        height={400}
        data={PageData}
        margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
      >
        <Legend />
        <Line dataKey="uv" stroke="#ff7300" />
        <Line dataKey="pv" stroke="#387908" />
      </LineChart>
    ));
    flush();

    expect(container.querySelector(".recharts-default-legend")).not.toBeNull();

    // Two series, sorted by value ("pv" before "uv").
    expect(legendLabels(container)).toEqual(["pv", "uv"]);

    // One legend item element per series.
    expect(container.querySelectorAll(".recharts-legend-item")).toHaveLength(2);
  });

  describe("itemSorter", () => {
    it("sorts line legend items by label value by default", () => {
      const { container } = render(() => (
        <LineChart width={500} height={500} data={numericalData}>
          <Legend />
          <Line dataKey="percent" name="B" />
          <Line dataKey="value" name="A" />
        </LineChart>
      ));
      flush();

      expect(legendLabels(container)).toEqual(["A", "B"]);
    });

    it("sorts line legend items when itemSorter=dataKey", () => {
      const { container } = render(() => (
        <LineChart width={500} height={500} data={numericalData}>
          <Legend itemSorter="dataKey" />
          <Line dataKey="percent" name="B" />
          <Line dataKey="value" name="A" />
        </LineChart>
      ));
      flush();

      expect(legendLabels(container)).toEqual(["B", "A"]);
    });

    it("sorts bar legend items by dataKey", () => {
      const { container } = render(() => (
        <BarChart width={500} height={500} data={numericalData}>
          <Legend itemSorter="dataKey" />
          <Bar dataKey="percent" name="B" isAnimationActive={false} />
          <Bar dataKey="value" name="A" isAnimationActive={false} />
        </BarChart>
      ));
      flush();

      expect(legendLabels(container)).toEqual(["B", "A"]);
    });

    it("sorts area legend items by dataKey", () => {
      const { container } = render(() => (
        <AreaChart width={500} height={500} data={numericalData}>
          <Legend itemSorter="dataKey" />
          <Area dataKey="percent" name="B" />
          <Area dataKey="value" name="A" />
        </AreaChart>
      ));
      flush();

      expect(legendLabels(container)).toEqual(["B", "A"]);
    });
  });
});
