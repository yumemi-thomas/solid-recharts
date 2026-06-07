import { describe, expect, it } from "vitest";
import { Line, LineChart, ReferenceDot } from "../../src";
import { render } from "../helper/render";

// Ported from recharts 3.8.1 test/cartesian/ReferenceDot.typed.spec.tsx.

type ExampleDataPoint = { value: number; name: string };
const data: ReadonlyArray<ExampleDataPoint> = [
  { value: 100, name: "a" },
  { value: 80, name: "b" },
];

describe("ReferenceDot with strong typing", () => {
  describe("with all implicit types", () => {
    it("should render ReferenceDot with implicit coordinate types", () => {
      const { container } = render(() => (
        <LineChart data={data} width={400} height={400}>
          <Line dataKey="value" />
          <ReferenceDot x={0} y={100} />
        </LineChart>
      ));
      expect(container.querySelectorAll(".recharts-reference-dot-dot")).toHaveLength(1);
    });
  });

  describe("with explicit ReferenceDot type parameters", () => {
    it("should allow matching explicit coordinate types", () => {
      render(() => (
        <LineChart data={data} width={400} height={400}>
          <Line dataKey="value" />
          <ReferenceDot<number, number> x={0} y={100} />
        </LineChart>
      ));
    });

    it("should show errors when explicit coordinate types do not match", () => {
      render(() => (
        <LineChart data={data} width={400} height={400}>
          <Line dataKey="value" />
          {/* @ts-expect-error TypeScript is correct here - x should be number */}
          <ReferenceDot<number, number> x="a" y={100} />
          {/* @ts-expect-error TypeScript is correct here - y should be number */}
          <ReferenceDot<number, number> x={0} y="a" />
        </LineChart>
      ));
    });
  });
});
