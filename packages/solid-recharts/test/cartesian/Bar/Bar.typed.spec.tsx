// Ported from recharts 3.8.1 test/cartesian/Bar/Bar.typed.spec.tsx (commit 7a23854).
//
// A .typed spec: the POINT is TYPE checking under `tsc --noEmit`. "should allow X"
// cases compile + render; "should NOT allow X" cases sit on a line tsc genuinely
// rejects, marked with `// @ts-expect-error`.
//
// Solid type-surface deviations from the React reference (provenance-noted inline):
//  - The Solid `<Bar>` is a plain `(props: BarProps) => JSX.Element`; there are NO
//    generic type parameters (`Bar<ExampleDataPoint, number>`). The whole
//    "with explicit Bar type parameters" describe block is a React-ism Solid does
//    not replicate, so those cases (including the two // @ts-expect-error negatives)
//    are NOT ported — see the blocked report.
//  - `dataKey` is `DataKey<unknown>`, so every implicit-type case (string, function,
//    non-existent key) compiles with no error — same as the React reference.
//  - The Solid `BarMouseEvent` 3rd argument is a raw DOM `MouseEvent | TouchEvent`,
//    NOT a recharts pointer type, so it is NOT assignable to `getRelativeCoordinate`
//    (which wants `{ currentTarget: HTMLElementTarget | SVGElementTarget }`). The
//    `Bar types` getRelativeCoordinate case therefore requires `// @ts-expect-error`
//    on each call (golden-anchored to the Solid type surface).
import { describe, it } from "vitest";
import { Bar, BarChart, getRelativeCoordinate, type BarRectangleItem } from "../../../src";
import { render } from "../../helper/render";
import { expectBars, type ExpectedBar } from "../../helper/expectBars";

type ExampleDataPoint = {
  x: number;
  y: number;
  value: number;
  name: string;
};

const data: Array<ExampleDataPoint> = [
  { x: 10, y: 50, value: 100, name: "a" },
  { x: 50, y: 50, value: 100, name: "b" },
  { x: 90, y: 50, value: 100, name: "c" },
  { x: 130, y: 50, value: 100, name: "d" },
  { x: 170, y: 50, value: 100, name: "e" },
];
const expectedBars: ReadonlyArray<ExpectedBar> = [
  {
    d: "M 12.8,5 h 62 v 390 h -62 Z",
    height: "390",
    radius: "0",
    width: "62",
    x: "12.8",
    y: "5",
  },
  {
    d: "M 90.8,5 h 62 v 390 h -62 Z",
    height: "390",
    radius: "0",
    width: "62",
    x: "90.8",
    y: "5",
  },
  {
    d: "M 168.8,5 h 62 v 390 h -62 Z",
    height: "390",
    radius: "0",
    width: "62",
    x: "168.8",
    y: "5",
  },
  {
    d: "M 246.8,5 h 62 v 390 h -62 Z",
    height: "390",
    radius: "0",
    width: "62",
    x: "246.8",
    y: "5",
  },
  {
    d: "M 324.8,5 h 62 v 390 h -62 Z",
    height: "390",
    radius: "0",
    width: "62",
    x: "324.8",
    y: "5",
  },
];

describe("Bar with strong typing", () => {
  describe("with all implicit types", () => {
    /*
     * All test cases in this block are previous behavior:
     * - no explicit type parameters
     * - minimal type safety
     * - it is important that this behavior continues to work for backward compatibility
     * - increased type safety here would be nice but is not important
     */
    it("should render Bar with correct data and correct dataKey", () => {
      const { container } = render(() => (
        <BarChart data={data} width={400} height={400}>
          <Bar dataKey="value" isAnimationActive={false} />
        </BarChart>
      ));
      expectBars(container, expectedBars);
    });

    it("should allow using incorrect type dataKey", () => {
      /*
       * TypeScript does not support resolving types by context,
       * we can't properly connect the dataKey type to the BarChart data type
       * and so this is not going to show an error in compile time.
       */
      const { container } = render(() => (
        <BarChart data={data} width={400} height={400}>
          <Bar dataKey="name" isAnimationActive={false} />
        </BarChart>
      ));
      // the chart does not render - which is what we would like TypeScript to warn about (but it can't)
      expectBars(container, []);
    });

    it("should allow using non-existent dataKey", () => {
      /*
       * TypeScript does not support resolving types by context,
       * we can't properly connect the dataKey type to the BarChart data type
       * and so this is not going to show an error in compile time.
       */
      const { container } = render(() => (
        <BarChart data={data} width={400} height={400}>
          <Bar dataKey="foo" isAnimationActive={false} />
        </BarChart>
      ));
      // the chart does not render - which is what we would like TypeScript to warn about (but it can't)
      expectBars(container, []);
    });

    it("should allow using dataKey function that returns wrong value", () => {
      /*
       * TypeScript does not support resolving types by context,
       * we can't properly connect the dataKey type to the BarChart data type
       * and so this is not going to show an error in compile time.
       */
      const { container } = render(() => (
        <BarChart data={data} width={400} height={400}>
          <Bar dataKey={(entry: ExampleDataPoint) => entry.name} isAnimationActive={false} />
        </BarChart>
      ));
      // the chart does not render - which is what we would like TypeScript to warn about (but it can't)
      expectBars(container, []);
    });
  });
});

describe("Bar types", () => {
  it("should NOT allow calling getRelativeCoordinate with the raw DOM event Solid passes to a Bar handler", () => {
    /*
     * Provenance: the React reference passes a recharts pointer event here and
     * expects NO error. The Solid `BarMouseEvent` 3rd arg is a raw DOM
     * `MouseEvent | TouchEvent`, whose `currentTarget` is `EventTarget | null` —
     * NOT assignable to `getRelativeCoordinate`'s `HTMLElementTarget | SVGElementTarget`.
     * So each call below is a genuine Solid type error.
     */
    return (
      <BarChart width={100} height={100}>
        <Bar
          dataKey="foo"
          onClick={(_data: BarRectangleItem, _i: number, e) => {
            // @ts-expect-error Solid passes a raw DOM event, not a recharts pointer
            getRelativeCoordinate(e);
          }}
          onMouseLeave={(_data: BarRectangleItem, _i: number, e) => {
            // @ts-expect-error Solid passes a raw DOM event, not a recharts pointer
            getRelativeCoordinate(e);
          }}
          onMouseOver={(_data: BarRectangleItem, _i: number, e) => {
            // @ts-expect-error Solid passes a raw DOM event, not a recharts pointer
            getRelativeCoordinate(e);
          }}
          onMouseOut={(_data: BarRectangleItem, _i: number, e) => {
            // @ts-expect-error Solid passes a raw DOM event, not a recharts pointer
            getRelativeCoordinate(e);
          }}
          onMouseEnter={(_data: BarRectangleItem, _i: number, e) => {
            // @ts-expect-error Solid passes a raw DOM event, not a recharts pointer
            getRelativeCoordinate(e);
          }}
          onTouchMove={(_data: BarRectangleItem, _i: number, e) => {
            // @ts-expect-error Solid passes a raw DOM event, not a recharts pointer
            getRelativeCoordinate(e);
          }}
          onTouchEnd={(_data: BarRectangleItem, _i: number, e) => {
            // @ts-expect-error Solid passes a raw DOM event, not a recharts pointer
            getRelativeCoordinate(e);
          }}
        />
      </BarChart>
    );
  });
});
