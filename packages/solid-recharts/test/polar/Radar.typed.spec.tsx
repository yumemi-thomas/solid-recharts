import { describe, expect, it } from "vitest";
import { Radar, RadarChart, getRelativeCoordinate } from "../../src";
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

describe("Radar event handlers", () => {
  it("should allow calling getRelativeCoordinate with the type provided by the Solid event handler", () => {
    /*
     * SOLID DEVIATION: handlers are single-arg DOM handlers `(e) => ...`, not the
     * reference's props-first `(data: InternalRadarProps, e) => ...` 2-arg form (there
     * is no `InternalRadarProps` type and no props-first handler arity in the port).
     * The (SVG) event arg is accepted by getRelativeCoordinate.
     */
    render(() => (
      <RadarChart width={100} height={100}>
        <Radar
          dataKey="foo"
          isAnimationActive={false}
          onClick={(e) => {
            getRelativeCoordinate(e);
          }}
          onMouseDown={(e) => {
            getRelativeCoordinate(e);
          }}
          onMouseUp={(e) => {
            getRelativeCoordinate(e);
          }}
          onMouseMove={(e) => {
            getRelativeCoordinate(e);
          }}
          onMouseLeave={(e) => {
            getRelativeCoordinate(e);
          }}
          onMouseOver={(e) => {
            getRelativeCoordinate(e);
          }}
          onMouseOut={(e) => {
            getRelativeCoordinate(e);
          }}
          onMouseEnter={(e) => {
            getRelativeCoordinate(e);
          }}
          onTouchStart={(e) => {
            getRelativeCoordinate(e);
          }}
          onTouchMove={(e) => {
            getRelativeCoordinate(e);
          }}
          onTouchEnd={(e) => {
            getRelativeCoordinate(e);
          }}
        />
      </RadarChart>
    ));
    expect(true).toBe(true);
  });
});
