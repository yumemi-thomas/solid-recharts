import { describe, it } from "vitest";
import { PolarAngleAxis, RadialBar, RadialBarChart } from "../../../src";
import { render } from "../../helper/render";

// Ported from recharts 3.8.1 test/polar/PolarAngleAxis/PolarAngleAxis.typed.spec.tsx.

type ExampleDataPoint = { value: number; name: string };
const data: ReadonlyArray<ExampleDataPoint> = [
  { value: 100, name: "a" },
  { value: 80, name: "b" },
];

describe("PolarAngleAxis with strong typing", () => {
  it("should allow implicit dataKey typing", () => {
    render(() => (
      <RadialBarChart data={data} width={400} height={400}>
        <PolarAngleAxis dataKey="name" />
        <RadialBar dataKey="value" />
      </RadialBarChart>
    ));
  });

  it("should allow explicit dataKey typing and reject invalid values", () => {
    render(() => (
      <RadialBarChart data={data} width={400} height={400}>
        <PolarAngleAxis<ExampleDataPoint, string> dataKey="name" />
        {/* @ts-expect-error TypeScript is correct here - value is not string-valued */}
        <PolarAngleAxis<ExampleDataPoint, string> dataKey="value" />
        <RadialBar dataKey="value" />
      </RadialBarChart>
    ));
  });
});
