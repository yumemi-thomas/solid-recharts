import { describe, it } from "vitest";
import { Line, LineChart, XAxis } from "../../../src";
import { render } from "../../helper/render";

// Ported from recharts 3.8.1 test/cartesian/XAxis/XAxis.typed.spec.tsx.

type ExampleDataPoint = { value: number; name: string };
const data: ReadonlyArray<ExampleDataPoint> = [
  { value: 100, name: "a" },
  { value: 80, name: "b" },
];

describe("XAxis with strong typing", () => {
  it("should allow implicit dataKey typing", () => {
    render(() => (
      <LineChart data={data} width={400} height={400}>
        <XAxis dataKey="name" />
        <Line dataKey="value" />
      </LineChart>
    ));
  });

  it("should allow explicit dataKey typing and reject invalid values", () => {
    render(() => (
      <LineChart data={data} width={400} height={400}>
        <XAxis<ExampleDataPoint, number> dataKey="value" />
        <XAxis<ExampleDataPoint, number> dataKey={(entry: ExampleDataPoint) => entry.value} />
        {/* @ts-expect-error TypeScript is correct here - name is not number-valued */}
        <XAxis<ExampleDataPoint, number> dataKey="name" />
        <Line dataKey="value" />
      </LineChart>
    ));
  });
});
