import { describe, it } from "vitest";
import { PolarRadiusAxis, RadialBar, RadialBarChart } from "../../src";
import { render } from "../helper/render";

// Ported from recharts 3.8.1 test/polar/PolarRadiusAxis.typed.spec.tsx.

type ExampleDataPoint = { value: number; name: string };
const data: ReadonlyArray<ExampleDataPoint> = [
  { value: 100, name: "a" },
  { value: 80, name: "b" },
];

describe("PolarRadiusAxis with strong typing", () => {
  it("should allow implicit dataKey typing", () => {
    render(() => (
      <RadialBarChart data={data} width={400} height={400}>
        <PolarRadiusAxis dataKey="value" />
        <RadialBar dataKey="value" />
      </RadialBarChart>
    ));
  });

  it("should allow explicit dataKey typing and reject invalid values", () => {
    render(() => (
      <RadialBarChart data={data} width={400} height={400}>
        <PolarRadiusAxis<ExampleDataPoint, number> dataKey="value" />
        {/* @ts-expect-error TypeScript is correct here - name is not number-valued */}
        <PolarRadiusAxis<ExampleDataPoint, number> dataKey="name" />
        <RadialBar dataKey="value" />
      </RadialBarChart>
    ));
  });
});
