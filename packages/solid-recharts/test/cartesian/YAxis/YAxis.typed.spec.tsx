import { describe, it } from "vitest";
import { getRelativeCoordinate, Line, LineChart, YAxis, type TickItem } from "../../../src";
import { render } from "../../helper/render";

// Ported from recharts 3.8.1 test/cartesian/YAxis/YAxis.typed.spec.tsx.
//
// Solid type-surface deviation (same golden-anchored convention as Bar.typed):
// the tick handlers are props-first `(tickItem, index, event)` like recharts, but
// the 3rd argument is a raw DOM `MouseEvent`/`TouchEvent` whose `currentTarget`
// is `EventTarget | null` — NOT assignable to `getRelativeCoordinate`'s recharts
// pointer types, so each call carries `// @ts-expect-error`.

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

describe("YAxis event handlers", () => {
  it("should NOT allow calling getRelativeCoordinate with the raw DOM event Solid passes to a tick handler", () => {
    /*
     * Provenance: the React reference passes a recharts pointer event here and
     * expects NO error. The Solid tick handler's 3rd arg is a raw DOM
     * `MouseEvent`/`TouchEvent`, whose `currentTarget` is `EventTarget | null` —
     * NOT assignable to `getRelativeCoordinate`'s `HTMLElementTarget | SVGElementTarget`.
     * So each call below is a genuine Solid type error.
     */
    return (
      <LineChart width={100} height={100}>
        <YAxis
          onClick={(_tick: TickItem, _i: number, e) => {
            // @ts-expect-error Solid passes a raw DOM event, not a recharts pointer
            getRelativeCoordinate(e);
          }}
          onMouseDown={(_tick: TickItem, _i: number, e) => {
            // @ts-expect-error Solid passes a raw DOM event, not a recharts pointer
            getRelativeCoordinate(e);
          }}
          onMouseUp={(_tick: TickItem, _i: number, e) => {
            // @ts-expect-error Solid passes a raw DOM event, not a recharts pointer
            getRelativeCoordinate(e);
          }}
          onMouseMove={(_tick: TickItem, _i: number, e) => {
            // @ts-expect-error Solid passes a raw DOM event, not a recharts pointer
            getRelativeCoordinate(e);
          }}
          onMouseLeave={(_tick: TickItem, _i: number, e) => {
            // @ts-expect-error Solid passes a raw DOM event, not a recharts pointer
            getRelativeCoordinate(e);
          }}
          onMouseOver={(_tick: TickItem, _i: number, e) => {
            // @ts-expect-error Solid passes a raw DOM event, not a recharts pointer
            getRelativeCoordinate(e);
          }}
          onMouseOut={(_tick: TickItem, _i: number, e) => {
            // @ts-expect-error Solid passes a raw DOM event, not a recharts pointer
            getRelativeCoordinate(e);
          }}
          onMouseEnter={(_tick: TickItem, _i: number, e) => {
            // @ts-expect-error Solid passes a raw DOM event, not a recharts pointer
            getRelativeCoordinate(e);
          }}
          onTouchStart={(_tick: TickItem, _i: number, e) => {
            // @ts-expect-error Solid passes a raw DOM event, not a recharts pointer
            getRelativeCoordinate(e);
          }}
          onTouchMove={(_tick: TickItem, _i: number, e) => {
            // @ts-expect-error Solid passes a raw DOM event, not a recharts pointer
            getRelativeCoordinate(e);
          }}
          onTouchEnd={(_tick: TickItem, _i: number, e) => {
            // @ts-expect-error Solid passes a raw DOM event, not a recharts pointer
            getRelativeCoordinate(e);
          }}
        />
      </LineChart>
    );
  });
});
