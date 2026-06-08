import { describe, expect, it } from "vitest";
import { Line, LineChart, getRelativeCoordinate } from "../../src";
import { render } from "../helper/render";

type ExampleDataPoint = {
  x: number;
  y: number;
  value: number;
  name: string;
};

const data: ReadonlyArray<ExampleDataPoint> = [
  { x: 10, y: 50, value: 100, name: "a" },
  { x: 50, y: 50, value: 100, name: "b" },
  { x: 90, y: 50, value: 100, name: "c" },
  { x: 130, y: 50, value: 100, name: "d" },
  { x: 170, y: 50, value: 100, name: "e" },
];

describe("Line with strong typing", () => {
  // Solid's Line is non-generic: dataKey is typed `DataKey<unknown>`
  // (= string | number | ((entry: unknown) => unknown)). It accepts any
  // string/number key and any single-argument function — there is no compile-time
  // narrowing against the chart/Line data type. The reference spec's explicit
  // type-parameter cases (`<Line<ExampleDataPoint, number>>`) are React-isms that
  // Solid does not replicate; see the blocked notes.
  describe("with all implicit types", () => {
    it("should render Line with correct data and correct dataKey", () => {
      const { container } = render(() => (
        <LineChart data={data} width={400} height={400}>
          <Line dataKey="value" isAnimationActive={false} />
        </LineChart>
      ));
      expect(container.querySelectorAll(".recharts-line-curve")).toHaveLength(1);
    });

    it("should allow using incorrect type dataKey", () => {
      render(() => (
        <LineChart data={data} width={400} height={400}>
          <Line dataKey="name" isAnimationActive={false} />
        </LineChart>
      ));
    });

    it("should allow using non-existent dataKey", () => {
      render(() => (
        <LineChart data={data} width={400} height={400}>
          <Line dataKey="foo" isAnimationActive={false} />
        </LineChart>
      ));
    });

    it("should allow using dataKey function that returns wrong value", () => {
      render(() => (
        <LineChart data={data} width={400} height={400}>
          <Line dataKey={(entry: ExampleDataPoint) => entry.name} isAnimationActive={false} />
        </LineChart>
      ));
    });

    it("should allow using dataKey function that accesses non-existent property", () => {
      render(() => (
        <LineChart data={data} width={400} height={400}>
          <Line dataKey={(entry) => entry} isAnimationActive={false} />
        </LineChart>
      ));
    });

    it("should allow when Line data is matching Line dataKey as string", () => {
      const { container } = render(() => (
        <LineChart width={400} height={400}>
          <Line data={data} dataKey="value" isAnimationActive={false} />
        </LineChart>
      ));
      expect(container.querySelectorAll(".recharts-line-curve")).toHaveLength(1);
    });

    it("should allow when Line data is matching Line dataKey as function", () => {
      const { container } = render(() => (
        <LineChart width={400} height={400}>
          <Line
            data={data}
            dataKey={(entry: ExampleDataPoint) => entry.value}
            isAnimationActive={false}
          />
        </LineChart>
      ));
      expect(container.querySelectorAll(".recharts-line-curve")).toHaveLength(1);
    });

    it("should allow when Line data is not matching Line dataKey", () => {
      // In Solid the dataKey is not narrowed against `data`, so a function form
      // also compiles (entry is `unknown`). The reference @ts-expect-error here
      // is a React-ism; both forms are accepted.
      render(() => (
        <LineChart width={400} height={400}>
          <Line data={data} dataKey="foo" isAnimationActive={false} />
          <Line data={data} dataKey={(entry) => entry} isAnimationActive={false} />
        </LineChart>
      ));
    });
  });
});

describe("Line event handlers", () => {
  // Solid event handlers are single-argument DOM handlers (the recharts two-arg
  // `(data, event) => void` handler type is a React-ism Solid does not replicate),
  // but the event is the same shape getRelativeCoordinate accepts (its
  // currentTarget is the SVGPathElement, satisfying SVGMousePointer/SVGTouchPointer).
  it("should allow calling getRelativeCoordinate with the event from a Line handler", () => {
    render(() => (
      <LineChart width={100} height={100}>
        <Line
          dataKey="foo"
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
      </LineChart>
    ));
  });
});
