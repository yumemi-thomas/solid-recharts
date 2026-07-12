import { describe, expect, it } from "vitest";
import { Pie, PieChart } from "../../../src";
import { render } from "@solidjs/testing-library";

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

describe("Pie with strong typing", () => {
  describe("with all implicit types", () => {
    it("should render Pie with correct data and correct dataKey", () => {
      const { container } = render(() => (
        <PieChart width={400} height={400}>
          <Pie data={data} dataKey="value" isAnimationActive={false} />
        </PieChart>
      ));
      expect(container.querySelectorAll(".recharts-sector")).toHaveLength(data.length);
    });

    it("should allow incorrect or non-existent dataKeys in implicit mode", () => {
      render(() => (
        <PieChart width={400} height={400}>
          <Pie data={data} dataKey="name" isAnimationActive={false} />
          <Pie data={data} dataKey="foo" isAnimationActive={false} />
        </PieChart>
      ));
    });
  });

  describe("with explicit Pie type parameters", () => {
    it("should allow correct dataKey when typed explicitly", () => {
      render(() => (
        <PieChart width={400} height={400}>
          <Pie<ExampleDataPoint> data={data} dataKey="value" isAnimationActive={false} />
          <Pie<ExampleDataPoint>
            data={data}
            dataKey={(entry: ExampleDataPoint) => entry.value}
            isAnimationActive={false}
          />
        </PieChart>
      ));
    });

    it("should show errors when dataKey does not match explicit typing", () => {
      render(() => (
        <PieChart width={400} height={400}>
          {/* @ts-expect-error TypeScript is correct here - the dataKey does not match and this should be an error */}
          <Pie<ExampleDataPoint, number> data={data} dataKey="name" isAnimationActive={false} />
          <Pie<ExampleDataPoint, number>
            data={data}
            /* @ts-expect-error TypeScript is correct here - the dataKey return type does not match and this should be an error */
            dataKey={(entry: ExampleDataPoint) => entry.name}
            isAnimationActive={false}
          />
        </PieChart>
      ));
    });
  });
});

/*
 * PERMANENT-N/A — vendored `Pie event handlers > getRelativeCoordinate` case.
 * It asserts the handler `event` type is accepted by `getRelativeCoordinate`.
 * In recharts the handler `e` is a React SyntheticEvent whose `currentTarget` is
 * non-null (matching getRelativeCoordinate's `MousePointer`/`TouchPointer`). The
 * Solid port wires native DOM events, whose `currentTarget` is `EventTarget | null`
 * and so is NOT assignable to those pointer types without an unsafe cast (forbidden
 * in src). The event models differ, so there is no faithful Solid equivalent.
 */
