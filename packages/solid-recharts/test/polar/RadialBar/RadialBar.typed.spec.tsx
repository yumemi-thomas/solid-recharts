import { describe, expect, it } from "vitest";
import type { RadialBarDataItem } from "../../../src";
import { getRelativeCoordinate, RadialBar, RadialBarChart } from "../../../src";
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

// Ported from the reference RadialBar.typed.spec "RadialBar event handlers" case,
// golden-anchored via `@ts-expect-error` (the Bar.typed convention). Provenance: the
// React reference passes a recharts pointer event to each handler and expects
// getRelativeCoordinate(e) to type-check with NO error. The port's RadialBar handler
// 3rd arg is a raw DOM `MouseEvent | TouchEvent`, whose `currentTarget` is
// `EventTarget | null` — NOT assignable to getRelativeCoordinate's
// `HTMLElementTarget | SVGElementTarget`. So each call below is a genuine Solid type
// error and is annotated.
describe("RadialBar event handlers", () => {
  it("should NOT allow calling getRelativeCoordinate with the raw DOM event Solid passes to a RadialBar handler", () => {
    return (
      <RadialBarChart data={data} width={400} height={400}>
        <RadialBar
          dataKey="value"
          isAnimationActive={false}
          onClick={(_data: RadialBarDataItem, _i: number, e) => {
            // @ts-expect-error Solid passes a raw DOM event, not a recharts pointer
            getRelativeCoordinate(e);
          }}
          onMouseDown={(_data: RadialBarDataItem, _i: number, e) => {
            // @ts-expect-error Solid passes a raw DOM event, not a recharts pointer
            getRelativeCoordinate(e);
          }}
          onMouseUp={(_data: RadialBarDataItem, _i: number, e) => {
            // @ts-expect-error Solid passes a raw DOM event, not a recharts pointer
            getRelativeCoordinate(e);
          }}
          onMouseMove={(_data: RadialBarDataItem, _i: number, e) => {
            // @ts-expect-error Solid passes a raw DOM event, not a recharts pointer
            getRelativeCoordinate(e);
          }}
          onMouseLeave={(_data: RadialBarDataItem, _i: number, e) => {
            // @ts-expect-error Solid passes a raw DOM event, not a recharts pointer
            getRelativeCoordinate(e);
          }}
          onMouseOver={(_data: RadialBarDataItem, _i: number, e) => {
            // @ts-expect-error Solid passes a raw DOM event, not a recharts pointer
            getRelativeCoordinate(e);
          }}
          onMouseOut={(_data: RadialBarDataItem, _i: number, e) => {
            // @ts-expect-error Solid passes a raw DOM event, not a recharts pointer
            getRelativeCoordinate(e);
          }}
          onMouseEnter={(_data: RadialBarDataItem, _i: number, e) => {
            // @ts-expect-error Solid passes a raw DOM event, not a recharts pointer
            getRelativeCoordinate(e);
          }}
          onTouchStart={(_data: RadialBarDataItem, _i: number, e) => {
            // @ts-expect-error Solid passes a raw DOM event, not a recharts pointer
            getRelativeCoordinate(e);
          }}
          onTouchMove={(_data: RadialBarDataItem, _i: number, e) => {
            // @ts-expect-error Solid passes a raw DOM event, not a recharts pointer
            getRelativeCoordinate(e);
          }}
          onTouchEnd={(_data: RadialBarDataItem, _i: number, e) => {
            // @ts-expect-error Solid passes a raw DOM event, not a recharts pointer
            getRelativeCoordinate(e);
          }}
        />
      </RadialBarChart>
    );
  });
});
