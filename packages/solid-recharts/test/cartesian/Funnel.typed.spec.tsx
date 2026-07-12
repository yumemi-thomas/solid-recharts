import { describe, expect, it } from "vitest";
import { Funnel, FunnelChart, getRelativeCoordinate, type FunnelTrapezoidItem } from "../../src";
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

describe("Funnel with strong typing", () => {
  describe("with all implicit types", () => {
    it("should render Funnel with correct data and correct dataKey", () => {
      const { container } = render(() => (
        <FunnelChart data={data} width={400} height={400}>
          <Funnel dataKey="value" isAnimationActive={false} />
        </FunnelChart>
      ));
      expect(container.getElementsByClassName("recharts-funnel-trapezoid")).toHaveLength(
        data.length,
      );
    });

    it("should allow using incorrect type dataKey", () => {
      render(() => (
        <FunnelChart data={data} width={400} height={400}>
          <Funnel dataKey="name" isAnimationActive={false} />
        </FunnelChart>
      ));
    });

    it("should allow using non-existent dataKey", () => {
      render(() => (
        <FunnelChart data={data} width={400} height={400}>
          <Funnel dataKey="foo" isAnimationActive={false} />
        </FunnelChart>
      ));
    });

    it("should allow using dataKey function that returns wrong value", () => {
      render(() => (
        <FunnelChart data={data} width={400} height={400}>
          <Funnel dataKey={(entry) => entry.name} isAnimationActive={false} />
        </FunnelChart>
      ));
    });

    it("should allow using dataKey function that accesses non-existent property", () => {
      render(() => (
        <FunnelChart data={data} width={400} height={400}>
          <Funnel dataKey={(entry) => entry.foo} isAnimationActive={false} />
        </FunnelChart>
      ));
    });

    it("should allow when Funnel data is matching Funnel dataKey as string", () => {
      const { container } = render(() => (
        <FunnelChart width={400} height={400}>
          <Funnel data={data} dataKey="value" isAnimationActive={false} />
        </FunnelChart>
      ));
      expect(container.getElementsByClassName("recharts-funnel-trapezoid")).toHaveLength(
        data.length,
      );
    });

    it("should allow when Funnel data is matching Funnel dataKey as function", () => {
      const { container } = render(() => (
        <FunnelChart width={400} height={400}>
          <Funnel data={data} dataKey={(entry) => entry.value} isAnimationActive={false} />
        </FunnelChart>
      ));
      expect(container.getElementsByClassName("recharts-funnel-trapezoid")).toHaveLength(
        data.length,
      );
    });

    it("should allow when Funnel data is not matching Funnel dataKey", () => {
      render(() => (
        <FunnelChart width={400} height={400}>
          <Funnel data={data} dataKey="foo" isAnimationActive={false} />
          <Funnel data={data} dataKey={(entry) => entry.foo} isAnimationActive={false} />
        </FunnelChart>
      ));
    });
  });

  describe("with explicit Funnel type parameters", () => {
    it("should allow correct dataKey when I type the Funnel to my data type", () => {
      const { container } = render(() => (
        <FunnelChart data={data} width={400} height={400}>
          <Funnel<ExampleDataPoint> dataKey="value" isAnimationActive={false} />
        </FunnelChart>
      ));
      expect(container.getElementsByClassName("recharts-funnel-trapezoid")).toHaveLength(
        data.length,
      );
    });

    it("should allow correct dataKey function when I inline type the dataKey function", () => {
      render(() => (
        <FunnelChart data={data} width={400} height={400}>
          <Funnel<ExampleDataPoint>
            dataKey={(entry: ExampleDataPoint) => entry.value}
            isAnimationActive={false}
          />
        </FunnelChart>
      ));
    });

    it("should allow correct dataKey function when I type the dataKey function", () => {
      const dataKey = (entry: ExampleDataPoint) => entry.value;
      render(() => (
        <FunnelChart data={data} width={400} height={400}>
          <Funnel<ExampleDataPoint> dataKey={dataKey} isAnimationActive={false} />
        </FunnelChart>
      ));
    });

    it("should show error if I type the Funnel explicitly but use wrong dataKey", () => {
      render(() => (
        <FunnelChart data={data} width={400} height={400}>
          {/* @ts-expect-error TypeScript is correct here - the dataKey does not match and this should be an error */}
          <Funnel<ExampleDataPoint, number> dataKey="name" isAnimationActive={false} />
        </FunnelChart>
      ));
    });

    it("should show error when dataKey is inline typed to return wrong value", () => {
      render(() => (
        <FunnelChart data={data} width={400} height={400}>
          <Funnel<ExampleDataPoint, number>
            /* @ts-expect-error TypeScript is correct here - the dataKey return type does not match and this should be an error */
            dataKey={(entry: ExampleDataPoint) => entry.name}
            isAnimationActive={false}
          />
        </FunnelChart>
      ));
    });

    it("should show error when dataKey is const typed to return wrong value", () => {
      const dataKey = (entry: ExampleDataPoint) => entry.name;
      render(() => (
        <FunnelChart data={data} width={400} height={400}>
          {/* @ts-expect-error TypeScript is correct here - the dataKey return type does not match and this should be an error */}
          <Funnel<ExampleDataPoint, number> dataKey={dataKey} isAnimationActive={false} />
        </FunnelChart>
      ));
    });
  });
});

describe("Funnel event handlers", () => {
  it("should NOT allow calling getRelativeCoordinate with the raw DOM event Solid passes to a Funnel handler", () => {
    /*
     * Provenance: the React reference passes a recharts pointer event here and expects
     * NO error. The Solid `FunnelMouseEvent` 3rd arg is a raw DOM `MouseEvent | TouchEvent`,
     * whose `currentTarget` is `EventTarget | null` — NOT assignable to
     * `getRelativeCoordinate`'s `HTMLElementTarget | SVGElementTarget`. So each call below
     * is a genuine Solid type error (golden-anchored to the Solid type surface).
     */
    return (
      <FunnelChart width={100} height={100}>
        <Funnel
          dataKey="foo"
          onClick={(_data: FunnelTrapezoidItem, _i: number, e) => {
            // @ts-expect-error Solid passes a raw DOM event, not a recharts pointer
            getRelativeCoordinate(e);
          }}
          onMouseDown={(_data: FunnelTrapezoidItem, _i: number, e) => {
            // @ts-expect-error Solid passes a raw DOM event, not a recharts pointer
            getRelativeCoordinate(e);
          }}
          onMouseUp={(_data: FunnelTrapezoidItem, _i: number, e) => {
            // @ts-expect-error Solid passes a raw DOM event, not a recharts pointer
            getRelativeCoordinate(e);
          }}
          onMouseMove={(_data: FunnelTrapezoidItem, _i: number, e) => {
            // @ts-expect-error Solid passes a raw DOM event, not a recharts pointer
            getRelativeCoordinate(e);
          }}
          onMouseLeave={(_data: FunnelTrapezoidItem, _i: number, e) => {
            // @ts-expect-error Solid passes a raw DOM event, not a recharts pointer
            getRelativeCoordinate(e);
          }}
          onMouseOver={(_data: FunnelTrapezoidItem, _i: number, e) => {
            // @ts-expect-error Solid passes a raw DOM event, not a recharts pointer
            getRelativeCoordinate(e);
          }}
          onMouseOut={(_data: FunnelTrapezoidItem, _i: number, e) => {
            // @ts-expect-error Solid passes a raw DOM event, not a recharts pointer
            getRelativeCoordinate(e);
          }}
          onMouseEnter={(_data: FunnelTrapezoidItem, _i: number, e) => {
            // @ts-expect-error Solid passes a raw DOM event, not a recharts pointer
            getRelativeCoordinate(e);
          }}
          onTouchStart={(_data: FunnelTrapezoidItem, _i: number, e) => {
            // @ts-expect-error Solid passes a raw DOM event, not a recharts pointer
            getRelativeCoordinate(e);
          }}
          onTouchMove={(_data: FunnelTrapezoidItem, _i: number, e) => {
            // @ts-expect-error Solid passes a raw DOM event, not a recharts pointer
            getRelativeCoordinate(e);
          }}
          onTouchEnd={(_data: FunnelTrapezoidItem, _i: number, e) => {
            // @ts-expect-error Solid passes a raw DOM event, not a recharts pointer
            getRelativeCoordinate(e);
          }}
        />
      </FunnelChart>
    );
  });
});
