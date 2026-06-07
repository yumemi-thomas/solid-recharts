import { describe, expect, it } from "vitest";
import { Pie, PieChart } from "../../src";
import { render } from "../helper/render";

// Ported from recharts 3.8.1 test/chart/PieChart.typed.spec.tsx.

type ExampleDataPoint = { value: number; name: string };
const data: ReadonlyArray<ExampleDataPoint> = [
  { value: 100, name: "a" },
  { value: 80, name: "b" },
];

describe("PieChart with strong typing", () => {
  it("should allow implicit chart typing", () => {
    render(() => (
      <PieChart data={data} width={400} height={400}>
        <Pie data={data} dataKey="value" isAnimationActive={false} />
      </PieChart>
    ));
  });

  it("should allow explicit chart typing", () => {
    render(() => (
      <PieChart<ExampleDataPoint> data={data} width={400} height={400}>
        <Pie data={data} dataKey="value" isAnimationActive={false} />
      </PieChart>
    ));
  });

  it("should show error when chart data shape does not match explicit generic type", () => {
    const invalidChart = (
      // @ts-expect-error TypeScript is correct here - chart data does not match explicit generic type
      <PieChart<ExampleDataPoint> data={{ wrong: 1 }} width={400} height={400}>
        <Pie data={data} dataKey="value" isAnimationActive={false} />
      </PieChart>
    );
    expect(invalidChart).toBeDefined();
  });
});
