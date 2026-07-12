import { describe, expect, it } from "vitest";
import { type DotProps, Line, LineChart, ReferenceDot, getRelativeCoordinate } from "../../src";
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

describe("ReferenceDot event handlers", () => {
  // Handlers are props-first `(dotProps, event)` (recharts parity; see
  // ReferenceDot.spec). The event's currentTarget is the rendered <circle>,
  // so it satisfies SVGMousePointer/SVGTouchPointer and feeds
  // getRelativeCoordinate directly — same as the reference.
  it("should allow calling getRelativeCoordinate with the type provided by Recharts event handler", () => {
    render(() => (
      <LineChart width={100} height={100}>
        <ReferenceDot
          x={10}
          y={10}
          onClick={(_dotProps: DotProps, e) => getRelativeCoordinate(e)}
          onMouseDown={(_dotProps: DotProps, e) => getRelativeCoordinate(e)}
          onMouseUp={(_dotProps: DotProps, e) => getRelativeCoordinate(e)}
          onMouseMove={(_dotProps: DotProps, e) => getRelativeCoordinate(e)}
          onMouseLeave={(_dotProps: DotProps, e) => getRelativeCoordinate(e)}
          onMouseOver={(_dotProps: DotProps, e) => getRelativeCoordinate(e)}
          onMouseOut={(_dotProps: DotProps, e) => getRelativeCoordinate(e)}
          onMouseEnter={(_dotProps: DotProps, e) => getRelativeCoordinate(e)}
          onTouchStart={(_dotProps: DotProps, e) => getRelativeCoordinate(e)}
          onTouchMove={(_dotProps: DotProps, e) => getRelativeCoordinate(e)}
          onTouchEnd={(_dotProps: DotProps, e) => getRelativeCoordinate(e)}
        />
      </LineChart>
    ));
  });
});
