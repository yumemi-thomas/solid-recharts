import { describe, expect, it } from "vitest";
import { Bar, BarChart, LineChart, PieChart } from "../../src";
import { render } from "@solidjs/testing-library";

// Ported from recharts 3.8.1 test/chart/BarChart.typed.spec.tsx.

type ExampleDataPoint = { value: number; name: string };
const data: ReadonlyArray<ExampleDataPoint> = [
  { value: 100, name: "a" },
  { value: 80, name: "b" },
];

describe("BarChart types", () => {
  it("should accept cursor prop on BarChart", () => {
    const { container } = render(() => (
      <BarChart width={400} height={300} data={data} cursor="pointer">
        <Bar dataKey="value" />
      </BarChart>
    ));
    expect(container.querySelector(".recharts-surface")).toHaveAttribute("cursor", "pointer");
  });

  it("should accept cursor prop on LineChart", () => {
    const { container } = render(() => (
      <LineChart width={400} height={300} data={data} cursor="crosshair" />
    ));
    expect(container.querySelector(".recharts-surface")).toHaveAttribute("cursor", "crosshair");
  });

  it("should accept cursor prop on PieChart", () => {
    const { container } = render(() => <PieChart width={400} height={300} cursor="default" />);
    expect(container.querySelector(".recharts-surface")).toHaveAttribute("cursor", "default");
  });

  it("should allow implicit chart typing", () => {
    render(() => (
      <BarChart data={data} width={400} height={400}>
        <Bar dataKey="value" isAnimationActive={false} />
      </BarChart>
    ));
  });

  it("should allow explicit chart typing", () => {
    render(() => (
      <BarChart<ExampleDataPoint> data={data} width={400} height={400}>
        <Bar dataKey="value" isAnimationActive={false} />
      </BarChart>
    ));
  });

  it("should show error when chart data shape does not match explicit generic type", () => {
    const InvalidChart = () => (
      // @ts-expect-error TypeScript is correct here - chart data does not match explicit generic type
      <BarChart<ExampleDataPoint> data={{ wrong: 1 }} width={400} height={400}>
        <Bar dataKey="value" isAnimationActive={false} />
      </BarChart>
    );
    expect(InvalidChart).toBeDefined();
  });
});
