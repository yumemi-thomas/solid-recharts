import { describe, expect, it } from "vitest";
import { Radar, RadarChart } from "../../src";
import { render } from "../helper/render";

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

describe("Radar with strong typing", () => {
  describe("with all implicit types", () => {
    it("should render Radar with correct data and correct dataKey", () => {
      const { container } = render(() => (
        <RadarChart data={data} width={400} height={400}>
          <Radar dataKey="value" isAnimationActive={false} />
        </RadarChart>
      ));
      expect(container.querySelectorAll(".recharts-radar-polygon")).toHaveLength(1);
    });

    it("should allow incorrect or non-existent dataKeys in implicit mode", () => {
      render(() => (
        <RadarChart data={data} width={400} height={400}>
          <Radar dataKey="name" isAnimationActive={false} />
          <Radar dataKey="foo" isAnimationActive={false} />
        </RadarChart>
      ));
    });
  });

  describe("with explicit Radar type parameters", () => {
    it("should allow correct dataKey when typed explicitly", () => {
      render(() => (
        <RadarChart data={data} width={400} height={400}>
          <Radar<ExampleDataPoint> dataKey="value" isAnimationActive={false} />
          <Radar<ExampleDataPoint>
            dataKey={(entry: ExampleDataPoint) => entry.value}
            isAnimationActive={false}
          />
        </RadarChart>
      ));
    });

    it("should show errors when dataKey does not match explicit typing", () => {
      render(() => (
        <RadarChart data={data} width={400} height={400}>
          {/* @ts-expect-error TypeScript is correct here - the dataKey does not match and this should be an error */}
          <Radar<ExampleDataPoint, number> dataKey="name" isAnimationActive={false} />
          <Radar<ExampleDataPoint, number>
            /* @ts-expect-error TypeScript is correct here - the dataKey return type does not match and this should be an error */
            dataKey={(entry: ExampleDataPoint) => entry.name}
            isAnimationActive={false}
          />
        </RadarChart>
      ));
    });
  });
});
