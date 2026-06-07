import { describe, expect, it } from "vitest";
import { RadialBar, RadialBarChart } from "../../src";
import { render } from "../helper/render";

// Ported from recharts 3.8.1 test/chart/RadialBarChart.typed.spec.tsx.

type ExampleDataPoint = { value: number; name: string };
const data: ReadonlyArray<ExampleDataPoint> = [
  { value: 100, name: "a" },
  { value: 80, name: "b" },
];

describe("RadialBarChart with strong typing", () => {
  it("should allow implicit chart typing", () => {
    render(() => (
      <RadialBarChart data={data} width={400} height={400}>
        <RadialBar dataKey="value" isAnimationActive={false} />
      </RadialBarChart>
    ));
  });

  it("should allow explicit chart typing", () => {
    render(() => (
      <RadialBarChart<ExampleDataPoint> data={data} width={400} height={400}>
        <RadialBar dataKey="value" isAnimationActive={false} />
      </RadialBarChart>
    ));
  });

  it("should show error when chart data shape does not match explicit generic type", () => {
    const invalidChart = (
      // @ts-expect-error TypeScript is correct here - chart data does not match explicit generic type
      <RadialBarChart<ExampleDataPoint> data={{ wrong: 1 }} width={400} height={400}>
        <RadialBar dataKey="value" isAnimationActive={false} />
      </RadialBarChart>
    );
    expect(invalidChart).toBeDefined();
  });
});
