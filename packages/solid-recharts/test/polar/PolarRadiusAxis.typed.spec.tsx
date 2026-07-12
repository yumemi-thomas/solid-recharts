import { describe, it } from "vitest";
import { PolarRadiusAxis, RadialBar, RadialBarChart, getRelativeCoordinate } from "../../src";
import { render } from "@solidjs/testing-library";

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

describe("PolarRadiusAxis event handlers", () => {
  it("should NOT allow calling getRelativeCoordinate with the raw DOM event Solid passes to a tick handler", () => {
    /*
     * Provenance: the React reference passes a recharts pointer event (1-arg handlers)
     * and expects NO error. The Solid port's per-tick handlers are props-first
     * `(tickItem, index, event)` with a raw DOM `MouseEvent`, whose `currentTarget` is
     * `EventTarget | null` — NOT assignable to `getRelativeCoordinate`'s
     * `HTMLElementTarget | SVGElementTarget`. So each call below is a genuine Solid
     * type error (golden-anchored to the Solid type surface).
     */
    return (
      <RadialBarChart width={100} height={100}>
        <PolarRadiusAxis
          onClick={(_tick, _index, e) => {
            // @ts-expect-error Solid passes a raw DOM event, not a recharts pointer
            getRelativeCoordinate(e);
          }}
          onMouseDown={(_tick, _index, e) => {
            // @ts-expect-error Solid passes a raw DOM event, not a recharts pointer
            getRelativeCoordinate(e);
          }}
          onMouseUp={(_tick, _index, e) => {
            // @ts-expect-error Solid passes a raw DOM event, not a recharts pointer
            getRelativeCoordinate(e);
          }}
          onMouseMove={(_tick, _index, e) => {
            // @ts-expect-error Solid passes a raw DOM event, not a recharts pointer
            getRelativeCoordinate(e);
          }}
          onMouseLeave={(_tick, _index, e) => {
            // @ts-expect-error Solid passes a raw DOM event, not a recharts pointer
            getRelativeCoordinate(e);
          }}
          onMouseOver={(_tick, _index, e) => {
            // @ts-expect-error Solid passes a raw DOM event, not a recharts pointer
            getRelativeCoordinate(e);
          }}
          onMouseOut={(_tick, _index, e) => {
            // @ts-expect-error Solid passes a raw DOM event, not a recharts pointer
            getRelativeCoordinate(e);
          }}
          onMouseEnter={(_tick, _index, e) => {
            // @ts-expect-error Solid passes a raw DOM event, not a recharts pointer
            getRelativeCoordinate(e);
          }}
        />
      </RadialBarChart>
    );
  });
});
