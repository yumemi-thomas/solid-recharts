import { describe, expect, it } from "vitest";
import { Scatter, ScatterChart } from "../../src";
import { render } from "@solidjs/testing-library";

// Ported from recharts 3.8.1 test/chart/ScatterChart.typed.spec.tsx.

type ExampleDataPoint = { value: number; name: string };
const data: ReadonlyArray<ExampleDataPoint> = [
  { value: 100, name: "a" },
  { value: 80, name: "b" },
];

describe("ScatterChart with strong typing", () => {
  it("should allow implicit chart typing", () => {
    render(() => (
      <ScatterChart data={data} width={400} height={400}>
        <Scatter dataKey="value" isAnimationActive={false} />
      </ScatterChart>
    ));
  });

  it("should allow explicit chart typing", () => {
    render(() => (
      <ScatterChart<ExampleDataPoint> data={data} width={400} height={400}>
        <Scatter dataKey="value" isAnimationActive={false} />
      </ScatterChart>
    ));
  });

  it("should show error when chart data shape does not match explicit generic type", () => {
    const invalidChart = (
      // @ts-expect-error TypeScript is correct here - chart data does not match explicit generic type
      <ScatterChart<ExampleDataPoint> data={{ wrong: 1 }} width={400} height={400}>
        <Scatter dataKey="value" isAnimationActive={false} />
      </ScatterChart>
    );
    expect(invalidChart).toBeDefined();
  });
});
