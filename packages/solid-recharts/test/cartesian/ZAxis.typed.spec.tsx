import { describe, it } from "vitest";
import { Scatter, ScatterChart, ZAxis } from "../../src";
import { render } from "@solidjs/testing-library";

// Ported from recharts 3.8.1 test/cartesian/ZAxis.typed.spec.tsx.

type ExampleDataPoint = { value: number; name: string };
const data: ReadonlyArray<ExampleDataPoint> = [
  { value: 100, name: "a" },
  { value: 80, name: "b" },
];

describe("ZAxis with strong typing", () => {
  it("should allow implicit dataKey typing", () => {
    render(() => (
      <ScatterChart data={data} width={400} height={400}>
        <ZAxis dataKey="foo" />
        <Scatter dataKey="value" isAnimationActive={false} />
      </ScatterChart>
    ));
  });

  it("should allow explicit dataKey typing and reject invalid values", () => {
    render(() => (
      <ScatterChart data={data} width={400} height={400}>
        <ZAxis<ExampleDataPoint, number> dataKey="value" />
        {/* @ts-expect-error TypeScript is correct here - name is not number-valued */}
        <ZAxis<ExampleDataPoint, number> dataKey="name" />
        <Scatter dataKey="value" isAnimationActive={false} />
      </ScatterChart>
    ));
  });
});
