// Ported from recharts 3.8.1 test/cartesian/Area.typed.spec.tsx (commit 7a23854).
//
// A .typed spec: correctness is enforced by `tsc --noEmit` (the package tsconfig
// includes test/). Cases that "should allow X" merely compile + render; cases
// that "should NOT allow X" sit a `// @ts-expect-error` on the line Solid rejects.
//
// SOLID PROVENANCE / DEVIATIONS from the React reference:
//   - Solid's `<Area>` is NOT generic: it is `Area = (props: AreaProps)` with
//     `dataKey?: DataKey<unknown>`. So:
//       * A function dataKey's parameter is `unknown`, and accessing any property
//         on it (`entry.name`, `entry.value`, `entry.foo`) is a genuine tsc error
//         in Solid — the OPPOSITE of the reference, where the loose `any`-ish form
//         lets every function dataKey compile. These are ported with @ts-expect-error.
//       * Putting `data` on the Area does NOT connect to the dataKey type (Solid
//         keeps `DataKey<unknown>`), so a mismatched STRING dataKey ("foo") does
//         not error — the reference's @ts-expect-error there would be unused, so
//         those cases are ported as "allow".
//       * The whole `with explicit Area type parameters` block (`<Area<...>>`) is a
//         React-ism: Solid's Area takes 0 type arguments, so every case there fails
//         to compile. Left unported (see `blocked`).
//   - Event handlers in Solid are single-arg DOM handlers (`(e) => ...`), not the
//     recharts props-first `(data, e) => ...` 2-arg form. Ported to the single-arg
//     shape; `getRelativeCoordinate(e)` still accepts the (SVG) event.
import { describe, it } from "vitest";
import { Area, AreaChart, getRelativeCoordinate } from "../../src";
import { render } from "@solidjs/testing-library";
import { expectAreaCurve, type ExpectedArea } from "../helper/expectAreaCurve";

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
const expectedAreas: ReadonlyArray<ExpectedArea> = [{ d: "M5,5L102.5,5L200,5L297.5,5L395,5" }];

describe("Area with strong typing", () => {
  describe("with all implicit types", () => {
    /*
     * All test cases in this block are previous behavior:
     * - no explicit type parameters
     * - minimal type safety
     * - it is important that this behavior continues to work for backward compatibility
     */
    it("should render Area with correct data and correct dataKey", () => {
      const { container } = render(() => (
        <AreaChart data={data} width={400} height={400}>
          <Area dataKey="value" isAnimationActive={false} />
        </AreaChart>
      ));
      expectAreaCurve(container, expectedAreas);
    });

    it("should allow using incorrect type dataKey", () => {
      /*
       * TypeScript can't connect the dataKey type to the AreaChart data type,
       * so this is not an error at compile time.
       */
      const { container } = render(() => (
        <AreaChart data={data} width={400} height={400}>
          <Area dataKey="name" isAnimationActive={false} />
        </AreaChart>
      ));
      // the chart does not render - which is what we would like TypeScript to warn about (but it can't)
      expectAreaCurve(container, []);
    });

    it("should allow using non-existent dataKey", () => {
      const { container } = render(() => (
        <AreaChart data={data} width={400} height={400}>
          <Area dataKey="foo" isAnimationActive={false} />
        </AreaChart>
      ));
      // the chart does not render - which is what we would like TypeScript to warn about (but it can't)
      expectAreaCurve(container, []);
    });

    it("should error when using dataKey function that returns wrong value", () => {
      /*
       * SOLID DEVIATION: the function dataKey parameter is `unknown`, so accessing
       * `entry.name` is a genuine tsc error here (the reference allows it).
       */
      const { container } = render(() => (
        <AreaChart data={data} width={400} height={400}>
          {/* @ts-expect-error Solid types the dataKey function arg as `unknown` */}
          <Area dataKey={(entry) => entry.name} isAnimationActive={false} />
        </AreaChart>
      ));
      // the chart does not render - which is what TypeScript warns about
      expectAreaCurve(container, []);
    });

    it("should error when using dataKey function that accesses non-existent property", () => {
      /*
       * SOLID DEVIATION: the function dataKey parameter is `unknown`, so accessing
       * `entry.foo` is a genuine tsc error here (the reference allows it).
       */
      const { container } = render(() => (
        <AreaChart data={data} width={400} height={400}>
          {/* @ts-expect-error Solid types the dataKey function arg as `unknown` */}
          <Area dataKey={(entry) => entry.foo} isAnimationActive={false} />
        </AreaChart>
      ));
      // the chart does not render - which is what TypeScript warns about
      expectAreaCurve(container, []);
    });

    it("should allow when Area data is matching Area dataKey as string", () => {
      const { container } = render(() => (
        <AreaChart width={400} height={400}>
          <Area data={data} dataKey="value" isAnimationActive={false} />
        </AreaChart>
      ));
      // works fine - no compile errors, and the chart renders correctly
      expectAreaCurve(container, expectedAreas);
    });

    it("should error when Area data is matching Area dataKey as function", () => {
      /*
       * SOLID DEVIATION: putting `data` on the Area does NOT narrow the dataKey
       * function arg (Area keeps `DataKey<unknown>`), so `entry.value` is a tsc
       * error here — the reference allows this.
       */
      const { container } = render(() => (
        <AreaChart width={400} height={400}>
          {/* @ts-expect-error Solid types the dataKey function arg as `unknown` */}
          <Area data={data} dataKey={(entry) => entry.value} isAnimationActive={false} />
        </AreaChart>
      ));
      // The directive above suppresses the type error, so at runtime the function
      // dataKey runs and returns `entry.value` — the chart renders.
      expectAreaCurve(container, expectedAreas);
    });

    it("should allow when Area data is not matching Area dataKey as string", () => {
      /*
       * SOLID DEVIATION: a mismatched STRING dataKey does not error (Area is not
       * generic over its data), so the reference's @ts-expect-error would be
       * unused — ported as "allow".
       */
      const { container } = render(() => (
        <AreaChart width={400} height={400}>
          <Area data={data} dataKey="foo" isAnimationActive={false} />
        </AreaChart>
      ));
      // the chart does not render
      expectAreaCurve(container, []);
    });
  });
});

describe("event handlers", () => {
  it("should allow calling getRelativeCoordinate with the type provided by the Solid event handler", () => {
    /*
     * SOLID DEVIATION: handlers are single-arg DOM handlers `(e) => ...`, not the
     * recharts props-first `(data, e) => ...` 2-arg form. The (SVG) event arg is
     * accepted by getRelativeCoordinate.
     */
    render(() => (
      <AreaChart width={100} height={100}>
        <Area
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
      </AreaChart>
    ));
  });
});
