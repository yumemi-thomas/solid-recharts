import { describe, it } from "vitest";
import {
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  getRelativeCoordinate,
  type TickItem,
} from "../../../src";
import { render } from "@solidjs/testing-library";

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

describe("PolarAngleAxis event handlers", () => {
  it("should NOT allow calling getRelativeCoordinate with the raw DOM event Solid passes to a tick handler", () => {
    /*
     * Provenance: the React reference passes a recharts pointer event here and expects
     * NO error. The Solid `PolarTickEventHandler` 3rd arg is a raw DOM
     * `MouseEvent`/`TouchEvent`, whose `currentTarget` is `EventTarget | null` — NOT
     * assignable to `getRelativeCoordinate`'s `HTMLElementTarget | SVGElementTarget`.
     * So each call below is a genuine Solid type error (golden-anchored to the Solid
     * type surface).
     */
    return (
      <RadialBarChart width={100} height={100}>
        <PolarAngleAxis
          onClick={(_axisProps: TickItem, _index: number, e) => {
            // @ts-expect-error Solid passes a raw DOM event, not a recharts pointer
            getRelativeCoordinate(e);
          }}
          onMouseDown={(_axisProps: TickItem, _index: number, e) => {
            // @ts-expect-error Solid passes a raw DOM event, not a recharts pointer
            getRelativeCoordinate(e);
          }}
          onMouseUp={(_axisProps: TickItem, _index: number, e) => {
            // @ts-expect-error Solid passes a raw DOM event, not a recharts pointer
            getRelativeCoordinate(e);
          }}
          onMouseMove={(_axisProps: TickItem, _index: number, e) => {
            // @ts-expect-error Solid passes a raw DOM event, not a recharts pointer
            getRelativeCoordinate(e);
          }}
          onMouseLeave={(_axisProps: TickItem, _index: number, e) => {
            // @ts-expect-error Solid passes a raw DOM event, not a recharts pointer
            getRelativeCoordinate(e);
          }}
          onMouseOver={(_axisProps: TickItem, _index: number, e) => {
            // @ts-expect-error Solid passes a raw DOM event, not a recharts pointer
            getRelativeCoordinate(e);
          }}
          onMouseOut={(_axisProps: TickItem, _index: number, e) => {
            // @ts-expect-error Solid passes a raw DOM event, not a recharts pointer
            getRelativeCoordinate(e);
          }}
          onMouseEnter={(_axisProps: TickItem, _index: number, e) => {
            // @ts-expect-error Solid passes a raw DOM event, not a recharts pointer
            getRelativeCoordinate(e);
          }}
          onTouchStart={(_axisProps: TickItem, _index: number, e) => {
            // @ts-expect-error Solid passes a raw DOM event, not a recharts pointer
            getRelativeCoordinate(e);
          }}
          onTouchMove={(_axisProps: TickItem, _index: number, e) => {
            // @ts-expect-error Solid passes a raw DOM event, not a recharts pointer
            getRelativeCoordinate(e);
          }}
          onTouchEnd={(_axisProps: TickItem, _index: number, e) => {
            // @ts-expect-error Solid passes a raw DOM event, not a recharts pointer
            getRelativeCoordinate(e);
          }}
        />
      </RadialBarChart>
    );
  });
});
