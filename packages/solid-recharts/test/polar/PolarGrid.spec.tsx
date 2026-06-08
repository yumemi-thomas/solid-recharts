// Ported from recharts 3.8.1 test/polar/PolarGrid.spec.tsx (commit 7a23854).
//
// Tier-A DOM cases keep recharts' geometry assertions byte-identical, adapting
// only the harness (React render -> Solid render thunk; @testing-library/react ->
// the repo's local testing-library). Tier-B selector cases are golden-anchored to
// recharts via createSelectorTestCase + the value-spy helpers.
//
// Harness adaptations:
// - `ringsData` is defined inline (the reference imports it from test/_data; the
//   port's _data.ts does not re-export it).
// - `pageData` comes from the port's test/_data.ts (golden-identical to recharts'
//   storybook/stories/data/Page.ts).
// - `flush()` drains Solid's microtask-batched store writes before DOM assertions.
import { describe, expect, it, test } from "vitest";
import { flush } from "solid-js";
import { render } from "../helper/render";
import { pageData } from "../_data";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  RadialBar,
  RadialBarChart,
  Surface,
} from "../../src";
import { createSelectorTestCase } from "../helper/createSelectorTestCase";
import {
  selectPolarAxis,
  selectPolarAxisScale,
  selectPolarAxisTicks,
  selectPolarCategoricalDomain,
} from "../../src/state/selectors/polarScaleSelectors";
import {
  selectPolarGridAngles,
  selectPolarGridRadii,
} from "../../src/state/selectors/polarGridSelectors";
import { expectLastCalledWithScale } from "../helper/expectScale";
import { selectPolarNiceTicks } from "../../src/state/selectors/polarSelectors";
import type { TickItem } from "../../src/util/types";
import { expectLastCalledWith } from "../helper/expectLastCalledWith";

const ringsData = [
  { name: "Elves", rings: 3, fill: "green" },
  { name: "Dwarves", rings: 7, fill: "blue" },
  { name: "Humans", rings: 9, fill: "red" },
  { name: "Sauron", rings: 1, fill: "black" },
];

type ExpectedLine = {
  x1: string | null;
  y1: string | null;
  x2: string | null;
  y2: string | null;
};

function expectPolarGridLines(
  container: HTMLElement,
  expectedLines: ReadonlyArray<ExpectedLine>,
): void {
  const lines = container.querySelectorAll<SVGLineElement>(".recharts-polar-grid-angle line");

  const actualLines: ReadonlyArray<ExpectedLine> = Array.from(lines).map((line) => ({
    x1: line.getAttribute("x1"),
    y1: line.getAttribute("y1"),
    x2: line.getAttribute("x2"),
    y2: line.getAttribute("y2"),
  }));

  expect(actualLines).toEqual(expectedLines);
}

type ExpectedPolygon = {
  cx: number;
  cy: number;
  d: string | null;
  fill?: string | null;
};

function expectPolarGridPolygons(
  container: HTMLElement,
  expectedPolygon: ReadonlyArray<ExpectedPolygon>,
): void {
  const polygons = container.querySelectorAll<SVGPathElement>(
    ".recharts-polar-grid-concentric-polygon",
  );

  const actualPolygons: ReadonlyArray<ExpectedPolygon> = Array.from(polygons).map(
    (polygon): ExpectedPolygon => ({
      cx: Number(polygon.getAttribute("cx")),
      cy: Number(polygon.getAttribute("cy")),
      d: polygon.getAttribute("d"),
      fill: polygon.getAttribute("fill"),
    }),
  );

  expect(actualPolygons).toEqual(expectedPolygon.map((it) => ({ ...it, fill: it.fill ?? "none" })));
}

type ExpectedCircle = {
  cx: number;
  cy: number;
  r: number;
};

function expectPolarGridCircles(
  container: HTMLElement,
  expectedCircles: ReadonlyArray<ExpectedCircle>,
): void {
  const circles = container.querySelectorAll<SVGCircleElement>(
    ".recharts-polar-grid-concentric-circle",
  );

  const actualCircles: ReadonlyArray<ExpectedCircle> = Array.from(circles).map(
    (circle): ExpectedCircle => ({
      cx: Number(circle.getAttribute("cx")),
      cy: Number(circle.getAttribute("cy")),
      r: Number(circle.getAttribute("r")),
    }),
  );

  expect(actualCircles).toEqual(expectedCircles);
}

describe("<PolarGrid />", () => {
  describe("when polarAngles and polarRadius are specified explicitly, outside of any charts", () => {
    const polarAngles = [0, 30, 60, 90, 145, 180, 200, 270, 300];
    const polarRadius = [10, 20, 40, 80];

    test("Don't render any lines or polygons when polarAngles and polarRadius are not specified", () => {
      const { container } = render(() => (
        <Surface width={500} height={500}>
          <PolarGrid cx={250} cy={250} innerRadius={0} outerRadius={200} />
        </Surface>
      ));
      flush();

      expectPolarGridLines(container, []);
      expectPolarGridPolygons(container, []);
      expectPolarGridCircles(container, []);
    });

    test("Render circles when gridType is specified to be circle", () => {
      const { container } = render(() => (
        <Surface width={500} height={500}>
          <PolarGrid
            cx={250}
            cy={250}
            innerRadius={0}
            outerRadius={200}
            gridType="circle"
            polarAngles={polarAngles}
            polarRadius={polarRadius}
          />
        </Surface>
      ));
      flush();

      expect(container.querySelectorAll(".recharts-polar-grid-angle line")).toHaveLength(9);
      expect(container.querySelectorAll(".recharts-polar-grid-concentric-circle")).toHaveLength(4);
    });

    test("Don't render any path when outerRadius is smaller than 0", () => {
      const { container } = render(() => (
        <Surface width={500} height={500}>
          <PolarGrid
            cx={250}
            cy={250}
            innerRadius={0}
            outerRadius={0}
            gridType="circle"
            polarAngles={polarAngles}
            polarRadius={polarRadius}
          />
        </Surface>
      ));
      flush();

      expect(container.querySelectorAll(".recharts-polar-grid-angle line")).toHaveLength(0);
      expect(container.querySelectorAll(".recharts-polar-grid-concentric-circle")).toHaveLength(0);
    });
  });

  describe("as a child of RadialBarChart with explicit axes", () => {
    it("renders circle instead of polygon when gridType=circle", () => {
      const { container } = render(() => (
        <RadialBarChart width={500} height={500} data={pageData}>
          <RadialBar dataKey="uv" />
          <PolarAngleAxis type="number" dataKey="uv" />
          <PolarRadiusAxis type="category" dataKey="name" />
          <PolarGrid gridType="circle" />
        </RadialBarChart>
      ));
      flush();

      expectPolarGridPolygons(container, []);
      expectPolarGridCircles(container, [
        { cx: 250, cy: 250, r: 14 },
        { cx: 250, cy: 250, r: 42 },
        { cx: 250, cy: 250, r: 70 },
        { cx: 250, cy: 250, r: 98 },
        { cx: 250, cy: 250, r: 126 },
        { cx: 250, cy: 250, r: 154 },
        { cx: 250, cy: 250, r: 182 },
      ]);
    });

    it("does not render lines when radialLines=false", () => {
      const { container } = render(() => (
        <RadialBarChart width={500} height={500} data={pageData}>
          <RadialBar dataKey="uv" />
          <PolarAngleAxis type="number" dataKey="uv" />
          <PolarRadiusAxis type="category" dataKey="name" />
          <PolarGrid radialLines={false} />
        </RadialBarChart>
      ));
      flush();

      expectPolarGridLines(container, []);
    });
  });

  describe("as a child of RadialBarChart with implicit axes", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <RadialBarChart width={300} height={300} data={ringsData}>
        <RadialBar dataKey="rings" />
        <PolarGrid gridType="circle" />
        {props.children}
      </RadialBarChart>
    ));

    it("should select radius axis settings", () => {
      const { spy } = renderTestCase((state) => selectPolarAxis(state, "radiusAxis", 0));
      expectLastCalledWith(spy, {
        allowDataOverflow: false,
        allowDecimals: false,
        allowDuplicatedCategory: true,
        dataKey: undefined,
        domain: undefined,
        id: 0,
        includeHidden: false,
        name: undefined,
        reversed: false,
        niceTicks: "auto",
        scale: "auto",
        tick: true,
        tickCount: 5,
        ticks: undefined,
        type: "category",
        unit: undefined,
      });
    });

    it("should select radius axis scale", () => {
      const { spy } = renderTestCase((state) => selectPolarAxisScale(state, "radiusAxis", 0));
      expectLastCalledWithScale(spy, {
        domain: [0, 1, 2, 3],
        range: [0, 116],
        bandwidth: 29,
      });
    });

    it("should select categorical domain", () => {
      const { spy } = renderTestCase((state) =>
        selectPolarCategoricalDomain(state, "radiusAxis", 0),
      );
      expectLastCalledWith(spy, undefined);
    });

    it("should select radius axis ticks", () => {
      const { spy } = renderTestCase((state) =>
        selectPolarAxisTicks(state, "radiusAxis", 0, false),
      );
      expectLastCalledWith(spy, [
        { coordinate: 14.5, index: 0, offset: 14.5, value: 0 },
        { coordinate: 43.5, index: 1, offset: 14.5, value: 1 },
        { coordinate: 72.5, index: 2, offset: 14.5, value: 2 },
        { coordinate: 101.5, index: 3, offset: 14.5, value: 3 },
      ]);
    });

    it("should render concentric circles", () => {
      const { container } = renderTestCase();

      expectPolarGridCircles(container, [
        { cx: 150, cy: 150, r: 14.5 },
        { cx: 150, cy: 150, r: 43.5 },
        { cx: 150, cy: 150, r: 72.5 },
        { cx: 150, cy: 150, r: 101.5 },
      ]);
    });

    it("should select scale", () => {
      const { spy } = renderTestCase((state) => selectPolarAxisScale(state, "angleAxis", 0));
      expectLastCalledWithScale(spy, {
        domain: [0, 9],
        range: [0, 360],
      });
    });

    it("should select angle axis settings", () => {
      const { spy } = renderTestCase((state) => selectPolarAxis(state, "angleAxis", 0));
      expectLastCalledWith(spy, {
        allowDataOverflow: false,
        allowDecimals: false,
        allowDuplicatedCategory: false,
        dataKey: undefined,
        domain: undefined,
        id: 0,
        includeHidden: false,
        name: undefined,
        reversed: false,
        niceTicks: "auto",
        scale: "auto",
        tick: true,
        tickCount: undefined,
        ticks: undefined,
        type: "number",
        unit: undefined,
      });
    });

    it("should select angle ticks", () => {
      const { spy } = renderTestCase((state) => selectPolarAxisTicks(state, "angleAxis", 0, false));
      expectLastCalledWith(spy, [
        { index: 0, coordinate: 0, value: 0, offset: -0 },
        { index: 1, coordinate: 40, value: 1, offset: -0 },
        { index: 2, coordinate: 80, value: 2, offset: -0 },
        { index: 3, coordinate: 120, value: 3, offset: -0 },
        { index: 4, coordinate: 160, value: 4, offset: -0 },
        { index: 5, coordinate: 200, value: 5, offset: -0 },
        { index: 6, coordinate: 240, value: 6, offset: -0 },
        { index: 7, coordinate: 280, value: 7, offset: -0 },
        { index: 8, coordinate: 320, value: 8, offset: -0 },
        { index: 9, coordinate: 360, value: 9, offset: -0 },
      ]);
    });

    it("should select grid angles", () => {
      const { spy } = renderTestCase((state) => selectPolarGridAngles(state, 0));
      expectLastCalledWith(spy, [0, 40, 80, 120, 160, 200, 240, 280, 320, 360]);
    });

    it("should render lines", () => {
      const { container } = renderTestCase();

      expectPolarGridLines(container, [
        { x1: "150", x2: "266", y1: "150", y2: "150" },
        { x1: "150", x2: "238.86115540180145", y1: "150", y2: "75.43663727636145" },
        { x1: "150", x2: "170.14318860936393", y1: "150", y2: "35.76230065058387" },
        { x1: "150", x2: "92.00000000000003", y1: "150", y2: "49.54105316100511" },
        { x1: "150", x2: "40.99565598883464", y1: "150", y2: "110.32566337422242" },
        { x1: "150", x2: "40.99565598883463", y1: "150", y2: "189.67433662577756" },
        { x1: "150", x2: "91.99999999999994", y1: "150", y2: "250.45894683899485" },
        { x1: "150", x2: "170.14318860936388", y1: "150", y2: "264.2376993494162" },
        { x1: "150", x2: "238.86115540180143", y1: "150", y2: "224.5633627236386" },
        { x1: "150", x2: "266", y1: "150", y2: "150.00000000000003" },
      ]);
    });
  });

  describe("with multiple axes", () => {
    function RadialBarChartWithMultipleAxesWrapper(props: {
      children?: import("@solidjs/web").JSX.Element;
    }) {
      return (
        <RadialBarChart width={300} height={300} data={pageData}>
          <RadialBar angleAxisId="axis-pv" radiusAxisId="axis-name" dataKey="pv" />
          <PolarAngleAxis
            angleAxisId="axis-uv"
            dataKey="uv"
            tickFormatter={(value) => `uv${String(value)}`}
            type="number"
          />
          <PolarAngleAxis
            angleAxisId="axis-pv"
            dataKey="pv"
            tickFormatter={(value) => `pv: ${String(value)}`}
            type="number"
            tickCount={3}
          />
          <PolarRadiusAxis radiusAxisId="axis-name" dataKey="name" type="category" />
          <PolarRadiusAxis radiusAxisId="axis-amt" dataKey="amt" type="number" angle={180} />
          {props.children}
        </RadialBarChart>
      );
    }

    describe('when angleAxisId="axis-pv"', () => {
      const renderTestCase = createSelectorTestCase((props) => (
        <RadialBarChartWithMultipleAxesWrapper>
          <PolarGrid angleAxisId="axis-pv" />
          {props.children}
        </RadialBarChartWithMultipleAxesWrapper>
      ));

      it("should render lines pointing to labels of first angle axis", () => {
        const { container } = renderTestCase();

        expectPolarGridLines(container, [
          { x1: "150", x2: "266", y1: "150", y2: "150" },
          { x1: "150", x2: "34", y1: "150", y2: "150" },
          { x1: "150", x2: "266", y1: "150", y2: "150.00000000000003" },
        ]);
      });

      it("should select ticks", () => {
        const { spy } = renderTestCase((state) =>
          selectPolarAxisTicks(state, "angleAxis", "axis-pv", false),
        );
        const expected: ReadonlyArray<TickItem> = [
          { coordinate: 0, offset: -0, value: 0, index: 0 },
          { coordinate: 180, offset: -0, value: 600, index: 1 },
          { coordinate: 360, offset: -0, value: 1200, index: 2 },
        ];
        expectLastCalledWith(spy, expected);
      });

      it("should select angles", () => {
        const { spy } = renderTestCase((state) => selectPolarGridAngles(state, "axis-pv"));
        expectLastCalledWith(spy, [0, 180, 360]);
      });
    });

    describe('when angleAxisId="axis-uv"', () => {
      const renderTestCase = createSelectorTestCase((props) => (
        <RadialBarChartWithMultipleAxesWrapper>
          <PolarGrid angleAxisId="axis-uv" />
          {props.children}
        </RadialBarChartWithMultipleAxesWrapper>
      ));

      it("should select axis settings", () => {
        const { spy } = renderTestCase((state) => selectPolarAxis(state, "angleAxis", "axis-uv"));
        expectLastCalledWith(spy, {
          allowDataOverflow: false,
          allowDecimals: false,
          allowDuplicatedCategory: false,
          dataKey: "uv",
          domain: undefined,
          id: "axis-uv",
          includeHidden: false,
          name: undefined,
          reversed: false,
          niceTicks: "auto",
          scale: "auto",
          tick: true,
          tickCount: undefined,
          ticks: undefined,
          type: "number",
          unit: undefined,
        });
      });

      it("should select nice ticks", () => {
        const { spy } = renderTestCase((state) =>
          selectPolarNiceTicks(state, "angleAxis", "axis-uv"),
        );
        expectLastCalledWith(spy, undefined);
      });

      it("should select scale", () => {
        const { spy } = renderTestCase((state) =>
          selectPolarAxisScale(state, "angleAxis", "axis-uv"),
        );
        expectLastCalledWithScale(spy, {
          domain: [0, 1520],
          range: [0, 360],
        });
      });

      it("should select ticks", () => {
        const { spy } = renderTestCase((state) =>
          selectPolarAxisTicks(state, "angleAxis", "axis-uv", false),
        );
        expectLastCalledWith(spy, [
          { index: 0, coordinate: 0, offset: -0, value: 0 },
          { index: 1, coordinate: 47.368421052631575, offset: -0, value: 200 },
          { index: 2, coordinate: 94.73684210526315, offset: -0, value: 400 },
          { index: 3, coordinate: 142.10526315789474, offset: -0, value: 600 },
          { index: 4, coordinate: 189.4736842105263, offset: -0, value: 800 },
          { index: 5, coordinate: 236.84210526315792, offset: -0, value: 1000 },
          { index: 6, coordinate: 284.2105263157895, offset: -0, value: 1200 },
          { index: 7, coordinate: 331.57894736842104, offset: -0, value: 1400 },
        ]);
      });

      it("should select angles", () => {
        const { spy } = renderTestCase((state) => selectPolarGridAngles(state, "axis-uv"));
        expectLastCalledWith(
          spy,
          [
            0, 47.368421052631575, 94.73684210526315, 142.10526315789474, 189.4736842105263,
            236.84210526315792, 284.2105263157895, 331.57894736842104,
          ],
        );
      });

      it("should render lines pointing to labels of second angle axis", () => {
        const { container } = renderTestCase();

        expectPolarGridLines(container, [
          { x1: "150", x2: "266", y1: "150", y2: "150" },
          { x1: "150", x2: "228.56466230858598", y1: "150", y2: "64.65602636191673" },
          { x1: "150", x2: "140.42079592520946", y1: "150", y2: "34.3961988112263" },
          { x1: "150", x2: "58.459700910018356", y1: "150", y2: "78.75132532799852" },
          { x1: "150", x2: "35.5820888052842", y1: "150", y2: "169.09297247256512" },
          { x1: "150", x2: "86.55401365779848", y1: "150", y2: "247.11131147845333" },
          { x1: "150", x2: "178.47631650833267", y1: "150", y2: "262.45043084896236" },
          { x1: "150", x2: "252.0189551399527", y1: "150", y2: "205.2098975923006" },
        ]);
      });
    });

    describe("when radiusAxisId=axis-name", () => {
      const renderTestCase = createSelectorTestCase((props) => (
        <RadialBarChartWithMultipleAxesWrapper>
          <PolarGrid angleAxisId="axis-pv" radiusAxisId="axis-name" />
          {props.children}
        </RadialBarChartWithMultipleAxesWrapper>
      ));

      it("should select nice ticks", () => {
        const { spy } = renderTestCase((state) =>
          selectPolarNiceTicks(state, "radiusAxis", "axis-name"),
        );
        expectLastCalledWith(spy, undefined);
      });

      it("should select scale", () => {
        const { spy } = renderTestCase((state) =>
          selectPolarAxisScale(state, "radiusAxis", "axis-name"),
        );
        expectLastCalledWithScale(spy, {
          domain: ["Page A", "Page B", "Page C", "Page D", "Page E", "Page F", "Page G"],
          range: [0, 116],
        });
      });

      it("should select ticks", () => {
        const { spy } = renderTestCase((state) =>
          selectPolarAxisTicks(state, "radiusAxis", "axis-name", false),
        );
        expectLastCalledWith(spy, [
          { coordinate: 8.28571428571428, value: "Page A", index: 0, offset: 8.285714285714286 },
          { coordinate: 24.857142857142854, value: "Page B", index: 1, offset: 8.285714285714286 },
          { coordinate: 41.42857142857142, value: "Page C", index: 2, offset: 8.285714285714286 },
          { coordinate: 58, value: "Page D", index: 3, offset: 8.285714285714286 },
          { coordinate: 74.57142857142857, value: "Page E", index: 4, offset: 8.285714285714286 },
          { coordinate: 91.14285714285715, value: "Page F", index: 5, offset: 8.285714285714286 },
          { coordinate: 107.71428571428574, value: "Page G", index: 6, offset: 8.285714285714286 },
        ]);
      });

      it("should select array of radii", () => {
        const { spy } = renderTestCase((state) => selectPolarGridRadii(state, "axis-name"));
        expectLastCalledWith(
          spy,
          [
            8.28571428571428, 24.857142857142854, 41.42857142857142, 58, 74.57142857142857,
            91.14285714285715, 107.71428571428574,
          ],
        );
      });
    });
  });
});
