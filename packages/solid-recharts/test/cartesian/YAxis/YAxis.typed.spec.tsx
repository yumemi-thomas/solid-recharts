import { describe, it } from "vitest";
import { Line, LineChart, YAxis } from "../../../src";
import { render } from "../../helper/render";

// Ported from recharts 3.8.1 test/cartesian/YAxis/YAxis.typed.spec.tsx.

type ExampleDataPoint = { value: number; name: string };
const data: ReadonlyArray<ExampleDataPoint> = [
  { value: 100, name: "a" },
  { value: 80, name: "b" },
];

describe("YAxis with strong typing", () => {
  it("should allow implicit dataKey typing", () => {
    render(() => (
      <LineChart data={data} width={400} height={400}>
        <YAxis dataKey="value" />
        <Line dataKey="value" />
      </LineChart>
    ));
  });

  it("should allow explicit dataKey typing and reject invalid values", () => {
    render(() => (
      <LineChart data={data} width={400} height={400}>
        <YAxis<ExampleDataPoint, number> dataKey="value" />
        <YAxis<ExampleDataPoint, number> dataKey={(entry: ExampleDataPoint) => entry.value} />
        {/* @ts-expect-error TypeScript is correct here - name is not number-valued */}
        <YAxis<ExampleDataPoint, number> dataKey="name" />
        <Line dataKey="value" />
      </LineChart>
    ));
  });
});
