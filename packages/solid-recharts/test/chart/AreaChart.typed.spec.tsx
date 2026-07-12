import { describe, expect, it } from "vitest";
import { Area, AreaChart } from "../../src";
import { render } from "@solidjs/testing-library";

// Ported from recharts 3.8.1 test/chart/AreaChart.typed.spec.tsx.

type ExampleDataPoint = { value: number; name: string };
const data: ReadonlyArray<ExampleDataPoint> = [
  { value: 100, name: "a" },
  { value: 80, name: "b" },
];

describe("AreaChart with strong typing", () => {
  it("should allow implicit chart typing", () => {
    render(() => (
      <AreaChart data={data} width={400} height={400}>
        <Area dataKey="value" isAnimationActive={false} />
      </AreaChart>
    ));
  });

  it("should allow explicit chart typing", () => {
    render(() => (
      <AreaChart<ExampleDataPoint> data={data} width={400} height={400}>
        <Area dataKey="value" isAnimationActive={false} />
      </AreaChart>
    ));
  });

  it("should show error when chart data shape does not match explicit generic type", () => {
    const invalidChart = (
      // @ts-expect-error TypeScript is correct here - chart data does not match explicit generic type
      <AreaChart<ExampleDataPoint> data={{ wrong: 1 }} width={400} height={400}>
        <Area dataKey="value" isAnimationActive={false} />
      </AreaChart>
    );
    expect(invalidChart).toBeDefined();
  });
});
