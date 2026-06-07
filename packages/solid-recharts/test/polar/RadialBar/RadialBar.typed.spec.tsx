import { describe, expect, it } from "vitest";
import { RadialBar, RadialBarChart } from "../../../src";
import { render } from "../../helper/render";

type ExampleDataPoint = {
  value: number;
  name: string;
};

const data: ReadonlyArray<ExampleDataPoint> = [
  { value: 100, name: "a" },
  { value: 80, name: "b" },
  { value: 60, name: "c" },
  { value: 40, name: "d" },
  { value: 20, name: "e" },
];

describe("RadialBar with strong typing", () => {
  describe("with all implicit types", () => {
    it("should render RadialBar with correct data and correct dataKey", () => {
      const { container } = render(() => (
        <RadialBarChart data={data} width={400} height={400}>
          <RadialBar dataKey="value" isAnimationActive={false} />
        </RadialBarChart>
      ));
      expect(container.querySelectorAll(".recharts-radial-bar-sector").length).toBeGreaterThan(0);
    });

    it("should allow incorrect or non-existent dataKeys in implicit mode", () => {
      render(() => (
        <RadialBarChart data={data} width={400} height={400}>
          <RadialBar dataKey="name" isAnimationActive={false} />
          <RadialBar dataKey="foo" isAnimationActive={false} />
        </RadialBarChart>
      ));
    });
  });

  describe("with explicit RadialBar type parameters", () => {
    it("should allow correct dataKey when typed explicitly", () => {
      render(() => (
        <RadialBarChart data={data} width={400} height={400}>
          <RadialBar<ExampleDataPoint> dataKey="value" isAnimationActive={false} />
          <RadialBar<ExampleDataPoint>
            dataKey={(entry: ExampleDataPoint) => entry.value}
            isAnimationActive={false}
          />
        </RadialBarChart>
      ));
    });

    it("should show errors when dataKey does not match explicit typing", () => {
      render(() => (
        <RadialBarChart data={data} width={400} height={400}>
          {/* @ts-expect-error TypeScript is correct here - the dataKey does not match and this should be an error */}
          <RadialBar<ExampleDataPoint, number> dataKey="name" isAnimationActive={false} />
          <RadialBar<ExampleDataPoint, number>
            /* @ts-expect-error TypeScript is correct here - the dataKey return type does not match and this should be an error */
            dataKey={(entry: ExampleDataPoint) => entry.name}
            isAnimationActive={false}
          />
        </RadialBarChart>
      ));
    });
  });
});
