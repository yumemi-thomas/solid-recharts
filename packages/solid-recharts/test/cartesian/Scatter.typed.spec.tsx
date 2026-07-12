// Ported from recharts 3.8.1 test/cartesian/Scatter.typed.spec.tsx.
//
// A `.typed` spec: each case compiles+renders, and "should NOT allow" cases sit
// on a line tsc genuinely rejects (// @ts-expect-error). Correctness is enforced
// by `pnpm --filter solid-recharts typecheck` (tsc --noEmit over test/).
//
// SOLID DIVERGENCES from the React reference (golden-anchored to the Solid type
// surface in src/cartesian/Scatter.tsx):
//   1. `ScatterProps.dataKey` is `DataKey<unknown>` (NON-generic) and `Scatter`
//      is a plain function component (not generic). So:
//        - string dataKeys ("value"/"name"/"foo") always compile (string|number);
//        - a dataKey FUNCTION with an IMPLICIT param gets `entry: unknown`, so
//          accessing any property is a tsc error → those reference "should allow"
//          cases flip to @ts-expect-error here (provenance: Solid `unknown` param);
//        - a dataKey function with an EXPLICITLY annotated param compiles.
//      The reference's "with explicit Scatter type parameters" describe block
//      (`Scatter<ExampleDataPoint, number>`) cannot be ported — Scatter takes 0
//      type arguments in Solid. See `blocked` in the agent report.
//   2. The event-handler block's `getRelativeCoordinate(e)` relies on the React
//      handler giving a recharts `MousePointer`; the Solid handler `event` is a
//      plain DOM `MouseEvent` (not a `MousePointer`), and Solid `ScatterProps`
//      only exposes onClick/onMouseEnter/onMouseLeave. Ported as a reduced
//      compile-only handler case; full getRelativeCoordinate parity is blocked.
import { describe, expect, it } from "vitest";
import { Scatter, ScatterChart } from "../../src";
import type { ScatterPointItem } from "../../src/cartesian/Scatter";
import { render } from "@solidjs/testing-library";

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

describe("Scatter with strong typing", () => {
  describe("with all implicit types", () => {
    it("should render Scatter with correct data and correct dataKey", () => {
      const { container } = render(() => (
        <ScatterChart data={data} width={400} height={400}>
          <Scatter dataKey="value" isAnimationActive={false} />
        </ScatterChart>
      ));
      expect(container.querySelectorAll(".recharts-scatter-symbol")).toHaveLength(data.length);
    });

    it("should allow using incorrect type dataKey", () => {
      render(() => (
        <ScatterChart data={data} width={400} height={400}>
          <Scatter dataKey="name" isAnimationActive={false} />
        </ScatterChart>
      ));
    });

    it("should allow using non-existent dataKey", () => {
      render(() => (
        <ScatterChart data={data} width={400} height={400}>
          <Scatter dataKey="foo" isAnimationActive={false} />
        </ScatterChart>
      ));
    });

    it("should require an explicit param annotation on a dataKey function (reference allows implicit)", () => {
      render(() => (
        <ScatterChart data={data} width={400} height={400}>
          {/* Reference: "should allow using dataKey function that returns wrong value".
              Solid: the implicit param is `unknown`, so `.name` is a tsc error. */}
          {/* @ts-expect-error Solid dataKey function param is `unknown` (DataKey<unknown>) */}
          <Scatter dataKey={(entry) => entry.name} isAnimationActive={false} />
        </ScatterChart>
      ));
    });

    it("should reject accessing a non-existent property on an implicit dataKey param", () => {
      render(() => (
        <ScatterChart data={data} width={400} height={400}>
          {/* Reference: "should allow ... accesses non-existent property".
              Solid: implicit param is `unknown` → tsc error. */}
          {/* @ts-expect-error Solid dataKey function param is `unknown` (DataKey<unknown>) */}
          <Scatter dataKey={(entry) => entry.foo} isAnimationActive={false} />
        </ScatterChart>
      ));
    });

    it("should allow a dataKey function with an explicitly annotated param", () => {
      render(() => (
        <ScatterChart data={data} width={400} height={400}>
          <Scatter dataKey={(entry: ExampleDataPoint) => entry.value} isAnimationActive={false} />
        </ScatterChart>
      ));
    });

    it("should allow when Scatter data is matching Scatter dataKey as string", () => {
      const { container } = render(() => (
        <ScatterChart width={400} height={400}>
          <Scatter data={data} dataKey="value" isAnimationActive={false} />
        </ScatterChart>
      ));
      expect(container.querySelectorAll(".recharts-scatter-symbol")).toHaveLength(data.length);
    });

    it("should allow when Scatter data is matching Scatter dataKey as function (explicit param)", () => {
      const { container } = render(() => (
        <ScatterChart width={400} height={400}>
          <Scatter
            data={data}
            dataKey={(entry: ExampleDataPoint) => entry.value}
            isAnimationActive={false}
          />
        </ScatterChart>
      ));
      expect(container.querySelectorAll(".recharts-scatter-symbol")).toHaveLength(data.length);
    });

    it("should allow when Scatter data is not matching Scatter dataKey", () => {
      render(() => (
        <ScatterChart width={400} height={400}>
          <Scatter data={data} dataKey="foo" isAnimationActive={false} />
          {/* Reference flags `entry => entry.foo` here. In Solid the same line is a
              tsc error, but because the implicit param is `unknown` (not because of
              a data/dataKey mismatch — Scatter is non-generic). */}
          {/* @ts-expect-error Solid dataKey function param is `unknown` (DataKey<unknown>) */}
          <Scatter data={data} dataKey={(entry) => entry.foo} isAnimationActive={false} />
        </ScatterChart>
      ));
    });
  });
});

describe("Scatter event handlers", () => {
  it("should allow typed mouse event handlers (data, index, event)", () => {
    const { container } = render(() => (
      <ScatterChart data={data} width={100} height={100}>
        <Scatter
          dataKey="value"
          isAnimationActive={false}
          onClick={(_data: ScatterPointItem, _i: number, _e: MouseEvent) => {}}
          onMouseEnter={(_data: ScatterPointItem, _i: number, _e: MouseEvent) => {}}
          onMouseLeave={(_data: ScatterPointItem, _i: number, _e: MouseEvent) => {}}
        />
      </ScatterChart>
    ));
    expect(container.querySelectorAll(".recharts-scatter-symbol")).toHaveLength(data.length);
  });
});
