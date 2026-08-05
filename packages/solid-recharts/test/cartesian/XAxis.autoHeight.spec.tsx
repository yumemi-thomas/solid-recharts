// Port of recharts 3.10.1 test/cartesian/XAxis/XAxis.autoHeight.spec.tsx.
import { render } from "@solidjs/testing-library";
import { describe, expect, it } from "vitest";
import { Bar, BarChart, XAxis } from "../../src";
import { assertNotNull } from "../helper/assertNotNull";
import { mockGetBoundingClientRect } from "../helper/mockGetBoundingClientRect";
import { getCalculatedXAxisHeight } from "../../src/util/XAxisUtils";

const data = [
  { name: "Page A", amt: 2400 },
  { name: "Page B", amt: 1398 },
  { name: "Page C", amt: 9800 },
];

describe('<XAxis height="auto" />', () => {
  it("should render the x-axis with the given numeric height", () => {
    const { container } = render(() => (
      <BarChart width={100} height={100} data={data}>
        <XAxis height={40} />
        <Bar dataKey="amt" />
      </BarChart>
    ));
    const xAxis = container.querySelector(".xAxis");
    assertNotNull(xAxis);
    expect(xAxis).toBeVisible();
    expect(xAxis.querySelector("line")).toHaveAttribute("height", "40");
  });

  it('should render x-axis with dynamically calculated height when height="auto"', () => {
    mockGetBoundingClientRect({ width: 30, height: 80 });
    const { container } = render(() => (
      <BarChart width={400} height={300} data={data}>
        <XAxis dataKey="name" height="auto" />
        <Bar dataKey="amt" />
      </BarChart>
    ));

    const tickElements = container.querySelectorAll(".recharts-cartesian-axis-tick-value");
    const calculatedHeight = getCalculatedXAxisHeight({
      ticks: tickElements,
      tickSize: 6,
      tickMargin: 2,
      label: undefined,
      labelGapWithTick: 5,
    });
    expect(calculatedHeight).toBe(88);
    const xAxis = container.querySelector(".xAxis");
    assertNotNull(xAxis);
    expect(xAxis.querySelector("line")).toHaveAttribute("height", "88");
  });
});
