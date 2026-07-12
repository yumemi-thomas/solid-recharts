import { describe, expect, it } from "vitest";
import { Line, LineChart, ReferenceLine, getRelativeCoordinate } from "../../../src";
import { render } from "@solidjs/testing-library";

// Ported from recharts 3.8.1 test/cartesian/ReferenceLine/ReferenceLine.typed.spec.tsx.

type ExampleDataPoint = { value: number; name: string };
const data: ReadonlyArray<ExampleDataPoint> = [
  { value: 100, name: "a" },
  { value: 80, name: "b" },
];

describe("ReferenceLine with strong typing", () => {
  describe("with all implicit types", () => {
    it("should render ReferenceLine with implicit coordinate types", () => {
      const { container } = render(() => (
        <LineChart data={data} width={400} height={400}>
          <Line dataKey="value" />
          <ReferenceLine x={0} y={100} />
        </LineChart>
      ));
      expect(container.querySelectorAll(".recharts-reference-line-line")).toHaveLength(1);
    });
  });

  describe("with explicit ReferenceLine type parameters", () => {
    it("should allow matching explicit coordinate types", () => {
      render(() => (
        <LineChart data={data} width={400} height={400}>
          <Line dataKey="value" />
          <ReferenceLine<number, number> x={0} y={100} />
        </LineChart>
      ));
    });

    it("should show errors when explicit coordinate types do not match", () => {
      render(() => (
        <LineChart data={data} width={400} height={400}>
          <Line dataKey="value" />
          {/* @ts-expect-error TypeScript is correct here - x should be number */}
          <ReferenceLine<number, number> x="a" y={100} />
          {/* @ts-expect-error TypeScript is correct here - y should be number */}
          <ReferenceLine<number, number> x={0} y="a" />
        </LineChart>
      ));
    });
  });
});

describe("ReferenceLine event handlers", () => {
  // Handlers spread onto the rendered <line> are Solid single-arg DOM handlers
  // (repo convention; see ReferenceLine.spec "events"). The event's currentTarget
  // is the SVGLineElement, satisfying SVGMousePointer/SVGTouchPointer, so it
  // feeds getRelativeCoordinate directly — same call shape as the reference.
  it("should allow calling getRelativeCoordinate with the type provided by Recharts event handler", () => {
    render(() => (
      <LineChart width={100} height={100}>
        <ReferenceLine
          onClick={(e) => getRelativeCoordinate(e)}
          onMouseDown={(e) => getRelativeCoordinate(e)}
          onMouseUp={(e) => getRelativeCoordinate(e)}
          onMouseMove={(e) => getRelativeCoordinate(e)}
          onMouseLeave={(e) => getRelativeCoordinate(e)}
          onMouseOver={(e) => getRelativeCoordinate(e)}
          onMouseOut={(e) => getRelativeCoordinate(e)}
          onMouseEnter={(e) => getRelativeCoordinate(e)}
          onTouchStart={(e) => getRelativeCoordinate(e)}
          onTouchMove={(e) => getRelativeCoordinate(e)}
          onTouchEnd={(e) => getRelativeCoordinate(e)}
        />
      </LineChart>
    ));
  });
});
