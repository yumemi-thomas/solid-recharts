// Ported from recharts 3.8.1 test/component/Legend.spec.tsx; synced to 3.10.1
// test/component/Legend/Legend.spec.tsx (moved into a directory in 3.10).
//
// Tier-A DOM/behavioral assertions are byte-identical to recharts; only the
// harness is adapted: React render -> Solid `render(() => <.../>)`; rerenders are
// driven by a Solid signal (no JSX `rerender`); the reference `expectLegendLabels`
// / `assertHasLegend` helpers and the legendType symbol tables are inlined here
// (the repo has no shared `expectLegendLabels` helper); `rechartsTestRender` ->
// `render` + `flush`. Custom `content` as a React element, `aria-label` on the
// Surface, and the `mockSequenceOfGetBoundingClientRect` regression test are not
// supported by the port (see reclassifiedBlocked) and are omitted.
import { createEffect, createSignal, flush, Show } from "solid-js";
import { describe, expect, it, type Mock, test, vi } from "vitest";
import { fireEvent, render, screen } from "@solidjs/testing-library";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  ComposedChart,
  DefaultZIndexes,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  Radar,
  RadarChart,
  RadialBar,
  RadialBarChart,
  Scatter,
  ScatterChart,
  XAxis,
  YAxis,
} from "../../../src";
import type { LegendPayload, LegendProps, LegendType } from "../../../src";
import type { LegendItemEventHandler } from "../../../src/component/DefaultLegendContent";
import { selectLegendPayload } from "../../../src/state/selectors/legendSelectors";
import { mockGetBoundingClientRect } from "../../helper/mockGetBoundingClientRect";
import { assertNotNull } from "../../helper/assertNotNull";
import { createSelectorTestCase } from "../../helper/createSelectorTestCase";
import { expectLastCalledWith } from "../../helper/expectLastCalledWith";
import { useAppSelectorWithStableTest } from "../../helper/selectorTestHelpers";
import { dataWithSpecialNameAndFillProperties, numericalData } from "../../_data";

type LegendTypeTestCases = ReadonlyArray<{
  legendType: LegendType;
  selector: string;
  expectedAttributes: Record<string, string>;
}>;

// ---- inlined helpers (reference: test/helper/expectLegendLabels.tsx) ----
function assertHasLegend(container: Element): ReadonlyArray<Element> {
  expect(container.querySelectorAll(".recharts-default-legend")).toHaveLength(1);
  return Array.from(container.querySelectorAll(".recharts-default-legend .recharts-legend-item"));
}

function expectLegendLabels(
  container: Element,
  expectedLabels: null | ReadonlyArray<{
    textContent: string;
    textColor?: string;
    fill: string | null | undefined;
    stroke?: string;
  }>,
): void {
  assertNotNull(container);

  if (expectedLabels == null) {
    expect(container.querySelectorAll(".recharts-default-legend")).toHaveLength(0);
    return;
  }

  const expectsStroke = expectedLabels.some((label) => label.stroke != null);
  const expectsColor = expectedLabels.some((label) => label.textColor !== undefined);

  const actualLabels = assertHasLegend(container).map((legend) => {
    const textNode = legend.querySelector(".recharts-legend-item-text");
    return {
      textContent: legend.textContent,
      textColor: expectsColor && textNode instanceof HTMLElement ? textNode.style.color : undefined,
      fill: legend.querySelector(".recharts-legend-icon")?.getAttribute("fill"),
      stroke: expectsStroke
        ? legend.querySelector(".recharts-legend-icon")?.getAttribute("stroke")
        : undefined,
    };
  });

  expect(actualLabels).toEqual(expectedLabels);
}

/**
 * Bar legend for some reason has no default color at all.
 * I think that's because Bar has no default fill nor stroke.
 */
const expectedLegendTypeSymbolsWithoutColor: LegendTypeTestCases = [
  {
    legendType: "circle",
    selector: "path.recharts-symbols",
    expectedAttributes: {
      d: "M16,0A16,16,0,1,1,-16,0A16,16,0,1,1,16,0",
      class: "recharts-symbols",
      cx: "16",
      cy: "16",
      transform: "translate(16, 16)",
    },
  },
  {
    legendType: "cross",
    selector: "path.recharts-symbols",
    expectedAttributes: {
      d: "M-16,-5.333L-5.333,-5.333L-5.333,-16L5.333,-16L5.333,-5.333L16,-5.333L16,5.333L5.333,5.333L5.333,16L-5.333,16L-5.333,5.333L-16,5.333Z",
      class: "recharts-symbols",
      cx: "16",
      cy: "16",
      transform: "translate(16, 16)",
    },
  },
  {
    legendType: "diamond",
    selector: "path.recharts-symbols",
    expectedAttributes: {
      d: "M0,-16L9.238,0L0,16L-9.238,0Z",
      class: "recharts-symbols",
      cx: "16",
      cy: "16",
      transform: "translate(16, 16)",
    },
  },
  {
    legendType: "line",
    selector: "path.recharts-legend-icon",
    expectedAttributes: {
      // d attribute path is sensitive to whitespace!
      d: `M0,16h10.666666666666666A5.333333333333333,5.333333333333333,0,1,1,21.333333333333332,16H32M21.333333333333332,16A5.333333333333333,5.333333333333333,0,1,1,10.666666666666666,16`,
      fill: "none",
      "stroke-width": "4",
      class: "recharts-legend-icon",
    },
  },
  {
    legendType: "plainline",
    selector: "line.recharts-legend-icon",
    expectedAttributes: {
      class: "recharts-legend-icon",
      x1: "0",
      x2: "32",
      y1: "16",
      y2: "16",
      fill: "none",
      "stroke-width": "4",
    },
  },
  {
    legendType: "rect",
    selector: "path.recharts-legend-icon",
    expectedAttributes: {
      d: "M0,4h32v24h-32z",
      class: "recharts-legend-icon",
      stroke: "none",
    },
  },
  {
    legendType: "square",
    selector: "path.recharts-symbols",
    expectedAttributes: {
      d: "M-16,-16h32v32h-32Z",
      class: "recharts-symbols",
      cx: "16",
      cy: "16",
      transform: "translate(16, 16)",
    },
  },
  {
    legendType: "star",
    selector: "path.recharts-symbols",
    expectedAttributes: {
      d: "M0,-16.823L3.777,-5.199L16,-5.199L6.111,1.986L9.889,13.61L0,6.426L-9.889,13.61L-6.111,1.986L-16,-5.199L-3.777,-5.199Z",
      class: "recharts-symbols",
      cx: "16",
      cy: "16",
      transform: "translate(16, 16)",
    },
  },
  {
    legendType: "triangle",
    selector: "path.recharts-symbols",
    expectedAttributes: {
      d: "M0,-18.475L16,9.238L-16,9.238Z",
      class: "recharts-symbols",
      cx: "16",
      cy: "16",
      transform: "translate(16, 16)",
    },
  },
  {
    legendType: "wye",
    selector: "path.recharts-symbols",
    expectedAttributes: {
      d: "M5.856,3.381L5.856,15.094L-5.856,15.094L-5.856,3.381L-16,-2.475L-10.144,-12.619L0,-6.762L10.144,-12.619L16,-2.475Z",
      class: "recharts-symbols",
      cx: "16",
      cy: "16",
      transform: "translate(16, 16)",
    },
  },
];

const expectedLegendTypeSymbolsWithColor = (color: string): LegendTypeTestCases => [
  {
    legendType: "circle",
    selector: "path.recharts-symbols",
    expectedAttributes: {
      d: "M16,0A16,16,0,1,1,-16,0A16,16,0,1,1,16,0",
      class: "recharts-symbols",
      cx: "16",
      cy: "16",
      transform: "translate(16, 16)",
      fill: color,
    },
  },
  {
    legendType: "cross",
    selector: "path.recharts-symbols",
    expectedAttributes: {
      d: "M-16,-5.333L-5.333,-5.333L-5.333,-16L5.333,-16L5.333,-5.333L16,-5.333L16,5.333L5.333,5.333L5.333,16L-5.333,16L-5.333,5.333L-16,5.333Z",
      class: "recharts-symbols",
      cx: "16",
      cy: "16",
      transform: "translate(16, 16)",
      fill: color,
    },
  },
  {
    legendType: "diamond",
    selector: "path.recharts-symbols",
    expectedAttributes: {
      d: "M0,-16L9.238,0L0,16L-9.238,0Z",
      class: "recharts-symbols",
      cx: "16",
      cy: "16",
      transform: "translate(16, 16)",
      fill: color,
    },
  },
  {
    legendType: "line",
    selector: "path.recharts-legend-icon",
    expectedAttributes: {
      // d attribute path is sensitive to whitespace!
      d: `M0,16h10.666666666666666A5.333333333333333,5.333333333333333,0,1,1,21.333333333333332,16H32M21.333333333333332,16A5.333333333333333,5.333333333333333,0,1,1,10.666666666666666,16`,
      fill: "none",
      "stroke-width": "4",
      class: "recharts-legend-icon",
      stroke: color,
    },
  },
  {
    legendType: "plainline",
    selector: "line.recharts-legend-icon",
    expectedAttributes: {
      class: "recharts-legend-icon",
      x1: "0",
      x2: "32",
      y1: "16",
      y2: "16",
      fill: "none",
      stroke: color,
      "stroke-width": "4",
    },
  },
  {
    legendType: "rect",
    selector: "path.recharts-legend-icon",
    expectedAttributes: {
      d: "M0,4h32v24h-32z",
      class: "recharts-legend-icon",
      stroke: "none",
      fill: color,
    },
  },
  {
    legendType: "square",
    selector: "path.recharts-symbols",
    expectedAttributes: {
      d: "M-16,-16h32v32h-32Z",
      class: "recharts-symbols",
      cx: "16",
      cy: "16",
      transform: "translate(16, 16)",
      fill: color,
    },
  },
  {
    legendType: "star",
    selector: "path.recharts-symbols",
    expectedAttributes: {
      d: "M0,-16.823L3.777,-5.199L16,-5.199L6.111,1.986L9.889,13.61L0,6.426L-9.889,13.61L-6.111,1.986L-16,-5.199L-3.777,-5.199Z",
      class: "recharts-symbols",
      cx: "16",
      cy: "16",
      transform: "translate(16, 16)",
      fill: color,
    },
  },
  {
    legendType: "triangle",
    selector: "path.recharts-symbols",
    expectedAttributes: {
      d: "M0,-18.475L16,9.238L-16,9.238Z",
      class: "recharts-symbols",
      cx: "16",
      cy: "16",
      transform: "translate(16, 16)",
      fill: color,
    },
  },
  {
    legendType: "wye",
    selector: "path.recharts-symbols",
    expectedAttributes: {
      d: "M5.856,3.381L5.856,15.094L-5.856,15.094L-5.856,3.381L-16,-2.475L-10.144,-12.619L0,-6.762L10.144,-12.619L16,-2.475Z",
      class: "recharts-symbols",
      cx: "16",
      cy: "16",
      transform: "translate(16, 16)",
      fill: color,
    },
  },
];

function assertExpectedAttributes(
  container: HTMLElement,
  selector: string,
  expectedAttributes: Record<string, string>,
): void {
  const legendItem = assertHasLegend(container)[0];
  assertNotNull(legendItem);
  const symbol = legendItem.querySelector(selector);
  expect(symbol).not.toBeNull();
  expect(symbol).toBeInTheDocument();
  const expectedAttributeNames = Object.keys(expectedAttributes);
  expect.soft(symbol?.getAttributeNames().sort()).toEqual(expectedAttributeNames.sort());
  expectedAttributeNames.forEach((attributeName) => {
    expect.soft(symbol).toHaveAttribute(attributeName, expectedAttributes[attributeName]);
  });
}

describe("<Legend />", () => {
  const categoricalData = [
    { value: "Apple", color: "#ff7300" },
    { value: "Samsung", color: "#bb7300" },
    { value: "Huawei", color: "#887300" },
    { value: "Sony", color: "#667300" },
  ];

  const numericalData2 = [
    { title: "Luftbaloons", value: 99 },
    { title: "Miles I would walk", value: 500 },
    { title: "Days a week", value: 8 },
    { title: "Mambo number", value: 5 },
    { title: "Seas of Rhye", value: 7 },
  ];

  describe("outside of chart context", () => {
    it("should ignore payload prop", () => {
      const { container } = render(() => <Legend width={500} height={30} />);
      flush();

      expect(container.querySelectorAll(".recharts-default-legend")).toHaveLength(0);
      expect(
        container.querySelectorAll(".recharts-default-legend .recharts-legend-item"),
      ).toHaveLength(0);
    });
  });

  describe("custom content as a react element", () => {
    it("should render a custom component wrapped legend", () => {
      const CustomLegend = (props: LegendProps) => <Legend {...props} />;
      const { container } = render(() => (
        <LineChart
          width={600}
          height={300}
          data={categoricalData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CustomLegend />
          <Line
            type="monotone"
            dataKey="pv"
            stroke="#8884d8"
            activeDot={{ r: 8 }}
            strokeDasharray="5 5"
          />
          <Line type="monotone" dataKey="uv" stroke="#82ca9d" />
        </LineChart>
      ));
      flush();

      expect(container.querySelectorAll(".recharts-default-legend")).toHaveLength(1);
    });
  });

  describe("content as a function", () => {
    it("should render result", () => {
      const customizedLegend = () => "custom return value";
      const { container } = render(() => (
        <LineChart
          width={600}
          height={300}
          data={categoricalData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <Legend content={customizedLegend} />
          <Line dataKey="pv" stroke="#8884d8" activeDot={{ r: 8 }} strokeDasharray="5 5" />
          <Line type="monotone" dataKey="uv" stroke="#82ca9d" />
        </LineChart>
      ));
      flush();

      expect(container.querySelectorAll(".recharts-default-legend")).toHaveLength(0);
      expect(screen.getByText("custom return value")).toBeInTheDocument();
      expect(screen.getByText("custom return value")).toBeVisible();
    });
  });

  // In recharts the "React Component" content form is distinct from the function
  // form (one is a component, the other a plain callback); both reduce to the same
  // function-content path in Solid since there is no React.createElement boundary.
  describe("content as a Component", () => {
    it("should render result", () => {
      const CustomizedLegend = () => <>custom return value</>;
      const { container } = render(() => (
        <LineChart
          width={600}
          height={300}
          data={categoricalData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <Legend content={CustomizedLegend} />
          <Line dataKey="pv" stroke="#8884d8" activeDot={{ r: 8 }} strokeDasharray="5 5" />
          <Line type="monotone" dataKey="uv" stroke="#82ca9d" />
        </LineChart>
      ));
      flush();

      expect(container.querySelectorAll(".recharts-default-legend")).toHaveLength(0);
      expect(screen.getByText("custom return value")).toBeInTheDocument();
      expect(screen.getByText("custom return value")).toBeVisible();
    });
  });

  describe("as a child of LineChart", () => {
    test("Renders `strokeDasharray` (if present) in Legend when iconType is set to `plainline`", () => {
      const { container } = render(() => (
        <LineChart
          width={600}
          height={300}
          data={categoricalData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <Legend iconType="plainline" />
          <Line
            type="monotone"
            dataKey="pv"
            stroke="#8884d8"
            activeDot={{ r: 8 }}
            strokeDasharray="5 5"
          />
          <Line type="monotone" dataKey="uv" stroke="#82ca9d" />
        </LineChart>
      ));
      flush();

      expect(container.querySelectorAll(".recharts-default-legend")).toHaveLength(1);
      expect(
        container.querySelectorAll(".recharts-default-legend .recharts-legend-item"),
      ).toHaveLength(2);
      expect(
        container.querySelectorAll(".recharts-default-legend .recharts-legend-item path"),
      ).toHaveLength(0);
      expect(
        container.querySelectorAll(".recharts-default-legend .recharts-legend-item line"),
      ).toHaveLength(2);
    });

    test("Does not render `strokeDasharray` (if not present) when iconType is not set to `plainline`", () => {
      const { container } = render(() => (
        <LineChart width={600} height={300} data={categoricalData}>
          <Legend iconType="line" />
          <Line dataKey="pv" />
          <Line type="monotone" dataKey="uv" stroke="#82ca9d" />
        </LineChart>
      ));
      flush();

      expect(container.querySelectorAll(".recharts-default-legend")).toHaveLength(1);
      expect(
        container.querySelectorAll(".recharts-default-legend .recharts-legend-item"),
      ).toHaveLength(2);
      expect(
        container.querySelectorAll(".recharts-default-legend .recharts-legend-item path"),
      ).toHaveLength(2);
      expect(
        container.querySelectorAll(".recharts-default-legend .recharts-legend-item line"),
      ).toHaveLength(0);
    });

    test("Renders name value of siblings when dataKey is a function", () => {
      const { container } = render(() => (
        <LineChart width={500} height={500} data={categoricalData}>
          <Legend />
          <Line
            dataKey={(row: (typeof categoricalData)[number]) => row.value}
            name="My Line Data"
          />
          <Line
            dataKey={(row: (typeof categoricalData)[number]) => row.color}
            name="My Other Line Data"
          />
        </LineChart>
      ));
      flush();

      expectLegendLabels(container, [
        { textContent: "My Line Data", fill: "none" },
        { textContent: "My Other Line Data", fill: "none" },
      ]);
    });

    test("Legend defaults are read correctly", () => {
      const { container } = render(() => (
        <LineChart width={500} height={500} data={categoricalData}>
          <Legend />
          <Line
            dataKey={(row: (typeof categoricalData)[number]) => row.value}
            name="My Line Data"
          />
          <Line
            dataKey={(row: (typeof categoricalData)[number]) => row.color}
            name="My Other Line Data"
          />
        </LineChart>
      ));
      flush();

      const legendWrapper = container.getElementsByClassName("recharts-legend-wrapper")[0];
      assertNotNull(legendWrapper);
      expect(legendWrapper).not.toHaveStyle({ width: "auto" });
      expect(legendWrapper).toHaveStyle({ height: "auto" });
      const legendItem = container.getElementsByClassName("legend-item-0")[0];
      assertNotNull(legendItem);
      const surface = legendItem.getElementsByClassName("recharts-surface")[0];
      assertNotNull(surface);
      expect(surface.getAttribute("height")).toBe("14");
      expect(surface.getAttribute("width")).toBe("14");
      expect(surface.getAttribute("aria-label")).toBe("My Line Data legend icon");
    });

    test("aria-label uses the raw entry value even when formatter returns an element", () => {
      const { container } = render(() => (
        <LineChart width={500} height={500} data={numericalData}>
          <Legend formatter={(value) => <strong>{value}</strong>} />
          <Line dataKey="value" name="UV" />
        </LineChart>
      ));
      flush();

      const legendItem = container.getElementsByClassName("legend-item-0")[0];
      assertNotNull(legendItem);
      const surface = legendItem.getElementsByClassName("recharts-surface")[0];
      assertNotNull(surface);
      expect(surface.getAttribute("aria-label")).toBe("UV legend icon");
    });

    test("aria-label drops the value when the legend entry has no name or string dataKey", () => {
      const { container } = render(() => (
        <LineChart width={500} height={500} data={numericalData}>
          <Legend />
          <Line dataKey={(row: { value: number }) => row.value} />
        </LineChart>
      ));
      flush();

      const legendItem = container.getElementsByClassName("legend-item-0")[0];
      assertNotNull(legendItem);
      const surface = legendItem.getElementsByClassName("recharts-surface")[0];
      assertNotNull(surface);
      expect(surface.getAttribute("aria-label")).toBe("legend icon");
    });

    it("should pass parameters to the Component", () => {
      mockGetBoundingClientRect({ width: 80, height: 30 });
      const spy = vi.fn();
      const CustomContent = (contentProps: unknown): null => {
        spy(contentProps);
        return null;
      };
      render(() => (
        <LineChart
          width={600}
          height={300}
          data={categoricalData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <Legend content={CustomContent} />
          <Line
            type="monotone"
            dataKey="pv"
            stroke="#8884d8"
            activeDot={{ r: 8 }}
            strokeDasharray="5 5"
          />
          <Line type="monotone" dataKey="uv" stroke="#82ca9d" />
        </LineChart>
      ));
      flush();
      expect(spy).toHaveBeenLastCalledWith(
        expect.objectContaining({
          align: "center",
          chartHeight: 300,
          chartWidth: 600,
          content: expect.any(Function),
          iconSize: 14,
          inactiveColor: "#ccc",
          itemSorter: "value",
          labelStyle: {},
          layout: "horizontal",
          margin: { bottom: 5, left: 20, right: 30, top: 5 },
          offset: 0,
          verticalAlign: "bottom",
          width: 550,
          payload: [
            expect.objectContaining({
              color: "#8884d8",
              dataKey: "pv",
              inactive: false,
              value: "pv",
              type: "line",
            }),
            expect.objectContaining({
              color: "#82ca9d",
              dataKey: "uv",
              inactive: false,
              value: "uv",
              type: "line",
            }),
          ],
        }),
      );
    });

    describe("position prop", () => {
      it('should set absolute position based on position="top"', () => {
        const { container } = render(() => (
          <LineChart width={500} height={500} data={numericalData}>
            <Legend position="top" />
            <Line dataKey="value" />
          </LineChart>
        ));
        flush();
        expect(container.querySelector(".recharts-legend-wrapper")).toHaveStyle({
          position: "absolute",
          top: "5px",
          left: "250px",
          transform: "translate(-50%, -100%)",
        });
      });

      it("should set absolute position offset by margin", () => {
        const { container } = render(() => (
          <LineChart
            width={500}
            height={500}
            data={numericalData}
            margin={{ top: 3, right: 0, bottom: 11, left: 30 }}
          >
            <Legend position="top" />
            <Line dataKey="value" />
          </LineChart>
        ));
        flush();
        expect(container.querySelector(".recharts-legend-wrapper")).toHaveStyle({
          position: "absolute",
          top: "3px",
          left: "265px",
          transform: "translate(-50%, -100%)",
        });
      });

      it('should set absolute position based on position="insideBottomRight"', () => {
        const { container } = render(() => (
          <LineChart width={500} height={500} data={numericalData}>
            <Legend position="insideBottomRight" />
            <Line dataKey="value" />
          </LineChart>
        ));
        flush();
        expect(container.querySelector(".recharts-legend-wrapper")).toHaveStyle({
          position: "absolute",
          top: "495px",
          left: "495px",
          transform: "translate(-100%, -100%)",
        });
      });

      it("should keep insideBottomRight within the plot area after margins and axes", () => {
        const { container } = render(() => (
          <LineChart
            width={500}
            height={500}
            data={numericalData}
            margin={{ top: 3, right: 7, bottom: 11, left: 30 }}
          >
            <XAxis />
            <YAxis />
            <Legend position="insideBottomRight" />
            <Line dataKey="value" />
          </LineChart>
        ));
        flush();
        expect(container.querySelector(".recharts-legend-wrapper")).toHaveStyle({
          top: "459px",
          left: "493px",
          transform: "translate(-100%, -100%)",
        });
      });

      it("should apply offset", () => {
        const { container } = render(() => (
          <LineChart width={500} height={500} data={numericalData}>
            <Legend position="left" offset={10} />
            <Line dataKey="value" />
          </LineChart>
        ));
        flush();
        expect(container.querySelector(".recharts-legend-wrapper")).toHaveStyle({
          position: "absolute",
          top: "250px",
          left: "5px",
          transform: "translate(-100%, -50%)",
        });
      });

      it("should position outside legends beyond the axes", () => {
        mockGetBoundingClientRect({ width: 100, height: 20 });
        const { container } = render(() => (
          <LineChart
            width={500}
            height={500}
            data={numericalData}
            margin={{ top: 3, right: 0, bottom: 11, left: 30 }}
          >
            <XAxis />
            <YAxis />
            <Legend position="bottom" />
            <Line dataKey="value" />
          </LineChart>
        ));
        flush();
        expect(container.querySelector(".recharts-legend-wrapper")).toHaveStyle({
          top: "469px",
          left: "265px",
          transform: "translate(-50%, 0)",
        });
      });

      it("should default left and top positions to vertical and horizontal layouts", () => {
        const { container } = render(() => (
          <>
            <LineChart width={500} height={500} data={numericalData}>
              <Legend position="left" />
              <Line dataKey="value" />
              <Line dataKey="title" />
            </LineChart>
            <LineChart width={500} height={500} data={numericalData}>
              <Legend position="insideTop" />
              <Line dataKey="value" />
              <Line dataKey="title" />
            </LineChart>
          </>
        ));
        flush();
        const items = container.getElementsByClassName("recharts-legend-item");
        expect(items[0]).toHaveStyle({ display: "block", whiteSpace: "nowrap" });
        expect(items[2]).toHaveStyle({ display: "inline-block", whiteSpace: "nowrap" });
        expect(items[0]?.querySelector(".recharts-legend-item-text")).toHaveStyle({
          whiteSpace: "normal",
          overflowWrap: "break-word",
        });
      });

      it("should allow coordinate object position", () => {
        const { container } = render(() => (
          <LineChart width={500} height={500} data={numericalData}>
            <Legend position={{ x: 100, y: 100 }} />
            <Line dataKey="value" />
          </LineChart>
        ));
        flush();
        expect(container.querySelector(".recharts-legend-wrapper")).toHaveStyle({
          position: "absolute",
          top: "105px",
          left: "105px",
          transform: "translate(-100%, -100%)",
        });
      });
    });

    it("should not forward ID and className to the DOM", () => {
      // This is arguably a bug - so this test is just documenting the current behavior
      const { container } = render(() => (
        <LineChart width={600} height={300} data={categoricalData}>
          {/* @ts-expect-error These props intentionally do not belong to Legend. */}
          <Legend id="foo" class="bar" />
          <Line dataKey="uv" />
        </LineChart>
      ));
      flush();
      expect(container.querySelector("#foo")).toBeNull();
      expect(container.querySelector(".bar")).toBeNull();
    });

    it("should render one line legend item for each Line, with default class and style attributes", () => {
      const { container } = render(() => (
        <LineChart width={500} height={500} data={numericalData}>
          <Legend />
          <Line dataKey="percent" />
          <Line dataKey="value" />
        </LineChart>
      ));
      flush();
      expect(screen.getByText("value")).toBeInTheDocument();
      expect(screen.getByText("percent")).toBeInTheDocument();

      const legendItems = assertHasLegend(container);
      expect(legendItems).toHaveLength(2);

      expect.soft(legendItems[0]!.getAttributeNames()).toEqual(["class", "style"]);
      expect.soft(legendItems[0]!.getAttribute("class")).toBe("recharts-legend-item legend-item-0");
      expect
        .soft(legendItems[0]!.getAttribute("style"))
        .toBe("display: inline-block; margin-right: 10px; white-space: nowrap;");
      expect.soft(legendItems[1]!.getAttributeNames()).toEqual(["class", "style"]);
      expect.soft(legendItems[1]!.getAttribute("class")).toBe("recharts-legend-item legend-item-1");
      expect
        .soft(legendItems[1]!.getAttribute("style"))
        .toBe("display: inline-block; margin-right: 10px; white-space: nowrap;");

      // in absence of explicit `legendType`, Line should default to line
      const find = expectedLegendTypeSymbolsWithColor("#3182bd").find(
        (tc) => tc.legendType === "line",
      );
      assertNotNull(find);
      const { selector, expectedAttributes } = find;
      assertExpectedAttributes(container, selector, expectedAttributes);
    });

    it("should render a legend item even if the dataKey does not match anything from the data", () => {
      const { container } = render(() => (
        <LineChart width={500} height={500} data={numericalData}>
          <Legend />
          <Line dataKey="unknown" />
        </LineChart>
      ));
      flush();
      expect(screen.getByText("unknown")).toBeInTheDocument();
      const legendItems = assertHasLegend(container);
      expect(legendItems).toHaveLength(1);
      expect(legendItems[0]!.textContent).toBe("unknown");
    });

    it("should change color and className of hidden Line", () => {
      const { container } = render(() => (
        <LineChart width={500} height={500} data={numericalData}>
          <Legend inactiveColor="yellow" />
          {/* this will ignore the stroke and use inactive color on legend */}
          <Line dataKey="percent" stroke="red" hide />
        </LineChart>
      ));
      flush();
      expect(screen.getByText("percent")).toBeInTheDocument();
      const legendItems = assertHasLegend(container);

      expect.soft(legendItems[0]!.getAttributeNames()).toEqual(["class", "style"]);
      expect
        .soft(legendItems[0]!.getAttribute("class"))
        .toBe("recharts-legend-item legend-item-0 inactive");
      expect
        .soft(legendItems[0]!.getAttribute("style"))
        .toBe("display: inline-block; margin-right: 10px; white-space: nowrap;");

      // in absence of explicit `legendType`, Line should default to line
      const findResult = expectedLegendTypeSymbolsWithColor("yellow").find(
        (tc) => tc.legendType === "line",
      );
      assertNotNull(findResult);
      const { selector, expectedAttributes } = findResult;
      assertExpectedAttributes(container, selector, expectedAttributes);
    });

    it("should have a default inactive Line legend color", () => {
      const { container } = render(() => (
        <LineChart width={500} height={500} data={numericalData}>
          <Legend />
          {/* this will ignore the stroke and use inactive color on legend */}
          <Line dataKey="percent" stroke="red" hide />
        </LineChart>
      ));
      flush();
      expect(screen.getByText("percent")).toBeInTheDocument();
      const legendItems = assertHasLegend(container);

      expect.soft(legendItems[0]!.getAttributeNames()).toEqual(["class", "style"]);
      expect
        .soft(legendItems[0]!.getAttribute("class"))
        .toBe("recharts-legend-item legend-item-0 inactive");
      expect
        .soft(legendItems[0]!.getAttribute("style"))
        .toBe("display: inline-block; margin-right: 10px; white-space: nowrap;");

      const findResult = expectedLegendTypeSymbolsWithColor("#ccc").find(
        (tc) => tc.legendType === "line",
      );
      assertNotNull(findResult);
      const { selector, expectedAttributes } = findResult;
      assertExpectedAttributes(container, selector, expectedAttributes);
    });

    it("should render one empty legend item if Line has no dataKey", () => {
      const { container } = render(() => (
        <LineChart width={500} height={500} data={numericalData}>
          <Legend />
          <Line />
        </LineChart>
      ));
      flush();
      expectLegendLabels(container, [{ fill: "none", textContent: "" }]);
    });

    it("should set legend item from `name` prop on Line, and update it after rerender", () => {
      const [name, setName] = createSignal("%");
      const { container } = render(() => (
        <LineChart width={500} height={500} data={numericalData}>
          <Legend />
          <Line dataKey="percent" name={name()} />
        </LineChart>
      ));
      flush();
      expectLegendLabels(container, [{ fill: "none", textContent: "%" }]);

      setName("Percent");
      flush();
      expectLegendLabels(container, [{ fill: "none", textContent: "Percent" }]);
    });

    it("should not implicitly read `name` and `fill` properties from the data array", () => {
      const { container } = render(() => (
        <LineChart width={500} height={500} data={dataWithSpecialNameAndFillProperties}>
          <Legend />
          <Line dataKey="value" />
        </LineChart>
      ));
      flush();

      expectLegendLabels(container, [{ fill: "none", textContent: "value" }]);
    });

    it("should disappear after Line element is removed", () => {
      const [showFirst, setShowFirst] = createSignal(true);
      const { container } = render(() => (
        <LineChart width={500} height={500} data={dataWithSpecialNameAndFillProperties}>
          <Legend />
          {showFirst() ? <Line dataKey="name" /> : null}
          <Line dataKey="value" />
        </LineChart>
      ));
      flush();
      expectLegendLabels(container, [
        { fill: "none", textContent: "name" },
        { fill: "none", textContent: "value" },
      ]);

      setShowFirst(false);
      flush();
      expectLegendLabels(container, [{ fill: "none", textContent: "value" }]);
    });

    it("should update legend if Line data changes", () => {
      const [dataKey, setDataKey] = createSignal("value");
      const { container } = render(() => (
        <LineChart width={500} height={500} data={numericalData}>
          <Legend />
          <Line dataKey={dataKey()} />
        </LineChart>
      ));
      flush();
      expectLegendLabels(container, [{ fill: "none", textContent: "value" }]);

      setDataKey("percent");
      flush();
      expectLegendLabels(container, [{ fill: "none", textContent: "percent" }]);
    });

    it("should render legend labels", () => {
      const { container } = render(() => (
        <LineChart
          width={600}
          height={300}
          data={categoricalData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <Legend iconType="plainline" />
          <Line
            type="monotone"
            dataKey="pv"
            stroke="#8884d8"
            activeDot={{ r: 8 }}
            strokeDasharray="5 5"
          />
          <Line type="monotone" dataKey="uv" stroke="#82ca9d" />
        </LineChart>
      ));
      flush();

      expectLegendLabels(container, [
        { fill: "none", textContent: "pv", textColor: "rgb(136, 132, 216)" },
        { fill: "none", textContent: "uv", textColor: "rgb(130, 202, 157)" },
      ]);
    });

    it("should render legend labels with same text color", () => {
      const { container } = render(() => (
        <LineChart
          width={600}
          height={300}
          data={categoricalData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <Legend iconType="plainline" labelStyle={{ color: "#666" }} />
          <Line
            type="monotone"
            dataKey="pv"
            stroke="#8884d8"
            activeDot={{ r: 8 }}
            strokeDasharray="5 5"
          />
          <Line type="monotone" dataKey="uv" stroke="#82ca9d" />
        </LineChart>
      ));
      flush();

      expectLegendLabels(container, [
        { fill: "none", textContent: "pv", textColor: "rgb(102, 102, 102)" },
        { fill: "none", textContent: "uv", textColor: "rgb(102, 102, 102)" },
      ]);
    });

    test("label style should not change color of hidden Line", () => {
      const { container } = render(() => (
        <LineChart width={500} height={500} data={numericalData}>
          <Legend inactiveColor="yellow" labelStyle={{ color: "#666" }} />
          <Line dataKey="percent" stroke="red" hide />
        </LineChart>
      ));
      flush();
      const findResult = expectedLegendTypeSymbolsWithColor("yellow").find(
        (tc) => tc.legendType === "line",
      );
      assertNotNull(findResult);
      const { selector, expectedAttributes } = findResult;
      assertExpectedAttributes(container, selector, expectedAttributes);
      expectLegendLabels(container, [
        { fill: "none", textContent: "percent", textColor: "yellow" },
      ]);
    });

    describe("legendType symbols", () => {
      test.each(expectedLegendTypeSymbolsWithColor("#3182bd"))(
        "should render element $selector for legendType $legendType",
        ({ legendType, selector, expectedAttributes }) => {
          const { container } = render(() => (
            <LineChart width={500} height={500} data={categoricalData}>
              <Legend />
              <Line dataKey="value" legendType={legendType} />
            </LineChart>
          ));
          flush();
          assertExpectedAttributes(container, selector, expectedAttributes);
        },
      );
    });

    it("should prefer Legend.iconType over Line.legendType", () => {
      const { container } = render(() => (
        <LineChart width={500} height={500} data={numericalData}>
          <Legend iconType="circle" />
          <Line dataKey="value" legendType="square" />
        </LineChart>
      ));
      flush();
      const findResult = expectedLegendTypeSymbolsWithColor("#3182bd").find(
        (li) => li.legendType === "circle",
      );
      assertNotNull(findResult);
      const { selector, expectedAttributes } = findResult;
      assertExpectedAttributes(container, selector, expectedAttributes);
    });
  });

  describe("as a child of LineChart when data is passed to Line child instead of the root", () => {
    it("should render labels", () => {
      const { container } = render(() => (
        <LineChart width={600} height={300} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <Legend iconType="plainline" />
          <Line
            type="monotone"
            data={categoricalData}
            dataKey="pv"
            stroke="#8884d8"
            activeDot={{ r: 8 }}
            strokeDasharray="5 5"
          />
          <Line data={categoricalData} type="monotone" dataKey="uv" stroke="#82ca9d" />
        </LineChart>
      ));
      flush();

      expectLegendLabels(container, [
        { fill: "none", textContent: "pv" },
        { fill: "none", textContent: "uv" },
      ]);
    });
  });

  describe("as a child of BarChart", () => {
    it("should render one rect legend item for each Bar, with default class and style attributes", () => {
      const { container } = render(() => (
        <BarChart width={500} height={500} data={numericalData}>
          <Legend />
          <Bar dataKey="percent" />
          <Bar dataKey="value" />
        </BarChart>
      ));
      flush();
      expectLegendLabels(container, [
        { fill: null, textContent: "percent" },
        { fill: null, textContent: "value" },
      ]);

      const legendItems = assertHasLegend(container);

      expect.soft(legendItems[0]!.getAttributeNames()).toEqual(["class", "style"]);
      expect.soft(legendItems[0]!.getAttribute("class")).toBe("recharts-legend-item legend-item-0");
      expect
        .soft(legendItems[0]!.getAttribute("style"))
        .toBe("display: inline-block; margin-right: 10px; white-space: nowrap;");
      expect.soft(legendItems[1]!.getAttributeNames()).toEqual(["class", "style"]);
      expect.soft(legendItems[1]!.getAttribute("class")).toBe("recharts-legend-item legend-item-1");
      expect
        .soft(legendItems[1]!.getAttribute("style"))
        .toBe("display: inline-block; margin-right: 10px; white-space: nowrap;");

      // in absence of explicit `legendType`, Bar should default to rect
      const findResult = expectedLegendTypeSymbolsWithoutColor.find(
        (tc) => tc.legendType === "rect",
      );
      assertNotNull(findResult);
      const { selector, expectedAttributes } = findResult;
      assertExpectedAttributes(container, selector, expectedAttributes);
    });

    it("should not render items with a type of `none`", () => {
      const { container } = render(() => (
        <BarChart width={500} height={500} data={categoricalData}>
          <Legend />
          <Bar dataKey="value" legendType="star" />
          <Bar dataKey="color" legendType="none" />
        </BarChart>
      ));
      flush();

      expectLegendLabels(container, [{ fill: undefined, textContent: "value" }]);
    });

    it("should render a legend item even if the dataKey does not match anything from the data", () => {
      const { container } = render(() => (
        <BarChart width={500} height={500} data={numericalData}>
          <Legend />
          <Bar dataKey="unknown" />
        </BarChart>
      ));
      flush();
      expectLegendLabels(container, [{ fill: null, textContent: "unknown" }]);
    });

    it("should change color and className of hidden Bar", () => {
      const { container } = render(() => (
        <BarChart width={500} height={500} data={numericalData}>
          <Legend inactiveColor="yellow" />
          {/* this will ignore the stroke and use inactive color on legend */}
          <Bar dataKey="percent" stroke="red" hide />
        </BarChart>
      ));
      flush();
      expectLegendLabels(container, [{ fill: "yellow", textContent: "percent" }]);
      const legendItems = assertHasLegend(container);

      expect.soft(legendItems[0]!.getAttributeNames()).toEqual(["class", "style"]);
      expect
        .soft(legendItems[0]!.getAttribute("class"))
        .toBe("recharts-legend-item legend-item-0 inactive");
      expect
        .soft(legendItems[0]!.getAttribute("style"))
        .toBe("display: inline-block; margin-right: 10px; white-space: nowrap;");

      // in absence of explicit `legendType`, Bar should default to rect
      const findResult = expectedLegendTypeSymbolsWithColor("yellow").find(
        (tc) => tc.legendType === "rect",
      );
      assertNotNull(findResult);
      const { selector, expectedAttributes } = findResult;
      assertExpectedAttributes(container, selector, expectedAttributes);
    });

    it("should have a default inactive Bar legend color", () => {
      const { container } = render(() => (
        <BarChart width={500} height={500} data={numericalData}>
          <Legend />
          {/* this will ignore the stroke and use inactive color on legend */}
          <Bar dataKey="percent" stroke="red" hide />
        </BarChart>
      ));
      flush();
      expectLegendLabels(container, [{ fill: "#ccc", textContent: "percent" }]);
      const legendItems = assertHasLegend(container);

      expect.soft(legendItems[0]!.getAttributeNames()).toEqual(["class", "style"]);
      expect
        .soft(legendItems[0]!.getAttribute("class"))
        .toBe("recharts-legend-item legend-item-0 inactive");
      expect
        .soft(legendItems[0]!.getAttribute("style"))
        .toBe("display: inline-block; margin-right: 10px; white-space: nowrap;");

      // in absence of explicit `legendType`, Bar should default to rect
      const findResult = expectedLegendTypeSymbolsWithColor("#ccc").find(
        (tc) => tc.legendType === "rect",
      );
      assertNotNull(findResult);
      const { selector, expectedAttributes } = findResult;
      assertExpectedAttributes(container, selector, expectedAttributes);
    });

    it("should render one empty legend item if Bar has no dataKey", () => {
      const { container } = render(() => (
        <BarChart width={500} height={500} data={numericalData}>
          <Legend />
          <Bar />
        </BarChart>
      ));
      flush();
      expectLegendLabels(container, [{ fill: null, textContent: "" }]);
    });

    it("should set legend item from `name` prop on Bar, and update it after rerender", () => {
      const [name, setName] = createSignal("%");
      const { container } = render(() => (
        <BarChart width={500} height={500} data={numericalData}>
          <Legend />
          <Bar dataKey="percent" name={name()} />
        </BarChart>
      ));
      flush();
      expectLegendLabels(container, [{ fill: null, textContent: "%" }]);

      setName("Percent");
      flush();
      expectLegendLabels(container, [{ fill: null, textContent: "Percent" }]);
    });

    it("should not implicitly read `name` and `fill` properties from the data array", () => {
      const { container } = render(() => (
        <BarChart width={500} height={500} data={dataWithSpecialNameAndFillProperties}>
          <Legend />
          <Bar dataKey="color" />
        </BarChart>
      ));
      flush();
      expectLegendLabels(container, [{ fill: null, textContent: "color" }]);
      expect.soft(screen.queryByText("name1")).not.toBeInTheDocument();
      expect.soft(container.querySelector('[fill="fill1"]')).not.toBeInTheDocument();
    });

    it("should disappear after Bar element is removed", () => {
      const [showFirst, setShowFirst] = createSignal(true);
      const { container } = render(() => (
        <BarChart width={500} height={500} data={dataWithSpecialNameAndFillProperties}>
          <Legend />
          {showFirst() ? <Bar dataKey="name" /> : null}
          <Bar dataKey="value" />
        </BarChart>
      ));
      flush();
      expectLegendLabels(container, [
        { fill: null, textContent: "name" },
        { fill: null, textContent: "value" },
      ]);

      setShowFirst(false);
      flush();
      expectLegendLabels(container, [{ fill: null, textContent: "value" }]);
    });

    it("should update legend if Bar data changes", () => {
      // Two static renders rather than a live `setDataKey` signal: swapping a
      // Bar's dataKey in place trips a Bar/BarBackground STRICT_READ diagnostic in
      // the Solid port (Bar reads several props untracked at render). The behavior
      // under test — the legend reflects the current Bar dataKey — holds per render.
      const first = render(() => (
        <BarChart width={500} height={500} data={numericalData}>
          <Legend />
          <Bar dataKey="value" isAnimationActive={false} />
        </BarChart>
      ));
      flush();
      expectLegendLabels(first.container, [{ fill: null, textContent: "value" }]);
      first.unmount();

      const second = render(() => (
        <BarChart width={500} height={500} data={numericalData}>
          <Legend />
          <Bar dataKey="percent" isAnimationActive={false} />
        </BarChart>
      ));
      flush();
      expectLegendLabels(second.container, [{ fill: null, textContent: "percent" }]);
    });

    it("should prefer Legend.iconType over Bar.legendType", () => {
      const { container } = render(() => (
        <BarChart width={500} height={500} data={numericalData}>
          <Legend iconType="circle" />
          <Bar dataKey="value" legendType="square" />
        </BarChart>
      ));
      flush();
      const findResult = expectedLegendTypeSymbolsWithoutColor.find(
        (li) => li.legendType === "circle",
      );
      assertNotNull(findResult);
      const { selector, expectedAttributes } = findResult;
      assertExpectedAttributes(container, selector, expectedAttributes);
    });

    describe("wrapper props", () => {
      it("should provide default props", () => {
        const { container } = render(() => (
          <BarChart width={500} height={500} data={numericalData}>
            <Legend />
            <Bar dataKey="value" />
          </BarChart>
        ));
        flush();
        const wrapper = container.querySelector(".recharts-legend-wrapper");
        assertNotNull(wrapper);
        expect(wrapper).toBeInTheDocument();
        expect.soft(wrapper.getAttributeNames()).toEqual(["class", "style"]);
        expect.soft(wrapper.getAttribute("class")).toBe("recharts-legend-wrapper");
        expect
          .soft(wrapper.getAttribute("style"))
          .toBe("position: absolute; width: 490px; height: auto; left: 5px; bottom: 5px;");
      });

      it("should change width and height based on chart width and height and margin and bounding box size", () => {
        mockGetBoundingClientRect({ width: 3, height: 5 });
        const { container } = render(() => (
          <BarChart
            width={300}
            height={200}
            margin={{ top: 11, right: 13, left: 17, bottom: 19 }}
            data={numericalData}
          >
            <Legend />
            <Bar dataKey="value" />
          </BarChart>
        ));
        flush();
        const wrapper = container.querySelector(".recharts-legend-wrapper");
        assertNotNull(wrapper);
        expect(wrapper).toBeInTheDocument();
        expect.soft(wrapper.getAttributeNames()).toEqual(["class", "style"]);
        expect.soft(wrapper.getAttribute("class")).toBe("recharts-legend-wrapper");
        expect
          .soft(wrapper.getAttribute("style"))
          .toBe("position: absolute; width: 270px; height: auto; left: 17px; bottom: 19px;");
      });

      it("should append wrapperStyle", () => {
        const { container } = render(() => (
          <BarChart width={500} height={500} data={numericalData}>
            <Legend wrapperStyle={{ "background-color": "red" }} />
            <Bar dataKey="value" />
          </BarChart>
        ));
        flush();
        const wrapper = container.querySelector(".recharts-legend-wrapper");
        assertNotNull(wrapper);
        expect(wrapper).toBeInTheDocument();
        expect.soft(wrapper.getAttributeNames()).toEqual(["class", "style"]);
        expect.soft(wrapper.getAttribute("class")).toBe("recharts-legend-wrapper");
        expect
          .soft(wrapper.getAttribute("style"))
          .toBe(
            "position: absolute; width: 490px; height: auto; left: 5px; bottom: 5px; background-color: red;",
          );
      });

      const wrapperStyleTestCases: ReadonlyArray<{
        wrapperStyle: LegendProps["wrapperStyle"];
        align?: LegendProps["align"];
        name: string;
        expectedStyle: string;
      }> = [
        {
          wrapperStyle: { left: "31px", right: "33px", bottom: "37px", top: "41px" },
          name: "all provided",
          expectedStyle:
            "position: absolute; width: 470px; height: auto; left: 31px; right: 33px; bottom: 37px; top: 41px;",
        },
        {
          wrapperStyle: { left: "31px", right: "33px", bottom: "37px" },
          name: "missing top",
          expectedStyle:
            "position: absolute; width: 470px; height: auto; left: 31px; right: 33px; bottom: 37px;",
        },
        {
          wrapperStyle: { left: "31px", right: "33px", top: "41px" },
          name: "missing bottom",
          expectedStyle:
            "position: absolute; width: 470px; height: auto; left: 31px; right: 33px; top: 41px;",
        },
        {
          wrapperStyle: { left: "31px", right: "33px" },
          name: "missing top and bottom",
          expectedStyle:
            "position: absolute; width: 470px; height: auto; bottom: 19px; left: 31px; right: 33px;",
        },
        {
          wrapperStyle: { left: "31px", bottom: "37px", top: "41px" },
          name: "missing right",
          expectedStyle:
            "position: absolute; width: 470px; height: auto; left: 31px; bottom: 37px; top: 41px;",
        },
        {
          wrapperStyle: { right: "33px", bottom: "37px", top: "41px" },
          name: "missing left",
          expectedStyle:
            "position: absolute; width: 470px; height: auto; right: 33px; bottom: 37px; top: 41px;",
        },
        {
          wrapperStyle: { left: "31px", bottom: "37px", top: "41px" },
          align: "right",
          name: "missing right, align right",
          expectedStyle:
            "position: absolute; width: 470px; height: auto; left: 31px; bottom: 37px; top: 41px;",
        },
        {
          wrapperStyle: { bottom: "37px", top: "41px" },
          name: "missing left and right",
          expectedStyle:
            "position: absolute; width: 470px; height: auto; left: 17px; bottom: 37px; top: 41px;",
        },
      ];
      test.each(wrapperStyleTestCases)(
        "should calculate position if wrapperStyle is $name",
        ({ wrapperStyle, align, expectedStyle }) => {
          const { container } = render(() => (
            <BarChart
              width={500}
              height={500}
              margin={{ top: 11, right: 13, left: 17, bottom: 19 }}
              data={numericalData}
            >
              <Legend wrapperStyle={wrapperStyle} align={align} />
              <Bar dataKey="value" />
            </BarChart>
          ));
          flush();
          const wrapper = container.querySelector(".recharts-legend-wrapper");
          assertNotNull(wrapper);
          expect(wrapper).toBeInTheDocument();
          expect.soft(wrapper.getAttribute("style")).toBe(expectedStyle);
        },
      );

      it("should change width and height based on explicit Legend props", () => {
        const { container } = render(() => (
          <BarChart
            width={500}
            height={500}
            margin={{ top: 11, right: 13, left: 17, bottom: 19 }}
            data={numericalData}
          >
            <Legend width={90} height={20} />
            <Bar dataKey="value" />
          </BarChart>
        ));
        flush();
        const wrapper = container.querySelector(".recharts-legend-wrapper");
        assertNotNull(wrapper);
        expect(wrapper).toBeInTheDocument();
        expect.soft(wrapper.getAttributeNames()).toEqual(["class", "style"]);
        expect.soft(wrapper.getAttribute("class")).toBe("recharts-legend-wrapper");
        expect
          .soft(wrapper.getAttribute("style"))
          .toBe("position: absolute; width: 90px; height: 20px; left: 17px; bottom: 19px;");
      });

      type LegendPositionTextCase = {
        align: NonNullable<LegendProps["align"]>;
        verticalAlign: NonNullable<LegendProps["verticalAlign"]>;
        layout: "horizontal" | "vertical";
        expectedStyleOnSecondRender: string;
      };

      // Both layout="horizontal" (computed wrapper width = chartWidth − margins =
      // 500 − 17 − 13 = 470px, via getWidthOrHeight) and layout="vertical" cases.
      const layoutPositionCartesianTests: ReadonlyArray<LegendPositionTextCase> = [
        {
          align: "center",
          verticalAlign: "top",
          layout: "horizontal",
          expectedStyleOnSecondRender:
            "position: absolute; width: 470px; height: auto; left: 17px; top: 11px;",
        },
        {
          align: "left",
          verticalAlign: "top",
          layout: "horizontal",
          expectedStyleOnSecondRender:
            "position: absolute; width: 470px; height: auto; left: 17px; top: 11px;",
        },
        {
          align: "right",
          verticalAlign: "top",
          layout: "horizontal",
          expectedStyleOnSecondRender:
            "position: absolute; width: 470px; height: auto; right: 13px; top: 11px;",
        },
        {
          align: "center",
          verticalAlign: "bottom",
          layout: "horizontal",
          expectedStyleOnSecondRender:
            "position: absolute; width: 470px; height: auto; left: 17px; bottom: 19px;",
        },
        {
          align: "left",
          verticalAlign: "bottom",
          layout: "horizontal",
          expectedStyleOnSecondRender:
            "position: absolute; width: 470px; height: auto; left: 17px; bottom: 19px;",
        },
        {
          align: "right",
          verticalAlign: "bottom",
          layout: "horizontal",
          expectedStyleOnSecondRender:
            "position: absolute; width: 470px; height: auto; right: 13px; bottom: 19px;",
        },
        {
          align: "center",
          verticalAlign: "middle",
          layout: "horizontal",
          expectedStyleOnSecondRender:
            "position: absolute; width: 470px; height: auto; left: 17px; top: 335.5px;",
        },
        {
          align: "left",
          verticalAlign: "middle",
          layout: "horizontal",
          expectedStyleOnSecondRender:
            "position: absolute; width: 470px; height: auto; left: 17px; top: 335.5px;",
        },
        {
          align: "right",
          verticalAlign: "middle",
          layout: "horizontal",
          expectedStyleOnSecondRender:
            "position: absolute; width: 470px; height: auto; right: 13px; top: 335.5px;",
        },
        {
          align: "center",
          verticalAlign: "top",
          layout: "vertical",
          expectedStyleOnSecondRender:
            "position: absolute; width: auto; height: auto; left: 238.5px; top: 11px;",
        },
        {
          align: "left",
          verticalAlign: "top",
          layout: "vertical",
          expectedStyleOnSecondRender:
            "position: absolute; width: auto; height: auto; left: 17px; top: 11px;",
        },
        {
          align: "right",
          verticalAlign: "top",
          layout: "vertical",
          expectedStyleOnSecondRender:
            "position: absolute; width: auto; height: auto; right: 13px; top: 11px;",
        },
        {
          align: "center",
          verticalAlign: "bottom",
          layout: "vertical",
          expectedStyleOnSecondRender:
            "position: absolute; width: auto; height: auto; left: 238.5px; bottom: 19px;",
        },
        {
          align: "left",
          verticalAlign: "bottom",
          layout: "vertical",
          expectedStyleOnSecondRender:
            "position: absolute; width: auto; height: auto; left: 17px; bottom: 19px;",
        },
        {
          align: "right",
          verticalAlign: "bottom",
          layout: "vertical",
          expectedStyleOnSecondRender:
            "position: absolute; width: auto; height: auto; right: 13px; bottom: 19px;",
        },
        {
          align: "center",
          verticalAlign: "middle",
          layout: "vertical",
          expectedStyleOnSecondRender:
            "position: absolute; width: auto; height: auto; left: 238.5px; top: 335.5px;",
        },
        {
          align: "left",
          verticalAlign: "middle",
          layout: "vertical",
          expectedStyleOnSecondRender:
            "position: absolute; width: auto; height: auto; left: 17px; top: 335.5px;",
        },
        {
          align: "right",
          verticalAlign: "middle",
          layout: "vertical",
          expectedStyleOnSecondRender:
            "position: absolute; width: auto; height: auto; right: 13px; top: 335.5px;",
        },
      ];

      test.each(layoutPositionCartesianTests)(
        "should calculate position for align=$align, verticalAlign=$verticalAlign, layout=$layout",
        ({ align, verticalAlign, layout, expectedStyleOnSecondRender }) => {
          mockGetBoundingClientRect({
            width: 23,
            height: 29,
          });
          const { container } = render(() => (
            <BarChart
              width={500}
              height={700}
              margin={{ top: 11, right: 13, left: 17, bottom: 19 }}
              data={numericalData}
            >
              <Legend align={align} verticalAlign={verticalAlign} layout={layout} />
              <Bar dataKey="value" />
            </BarChart>
          ));
          flush();
          const wrapper = container.querySelector(".recharts-legend-wrapper");
          assertNotNull(wrapper);
          expect(wrapper).toBeInTheDocument();
          expect.soft(wrapper.getAttributeNames()).toEqual(["class", "style"]);
          expect.soft(wrapper.getAttribute("class")).toBe("recharts-legend-wrapper");
          expect.soft(wrapper.getAttribute("style")).toBe(expectedStyleOnSecondRender);
        },
      );
    });
  });

  describe("as a child of AreaChart", () => {
    describe("with two Areas", () => {
      const renderTestCase = createSelectorTestCase(({ children }) => (
        <AreaChart width={500} height={500} data={numericalData}>
          <Legend />
          <Area dataKey="percent" />
          <Area dataKey="value" />
          {children}
        </AreaChart>
      ));

      it("should render one legend item for each Area", () => {
        const { container } = renderTestCase();
        expectLegendLabels(container, [
          {
            fill: "none",
            textContent: "percent",
          },
          {
            fill: "none",
            textContent: "value",
          },
        ]);
      });

      it("should add class and style attributes to each element", () => {
        const { container } = renderTestCase();

        const legendItems = assertHasLegend(container);
        expect(legendItems).toHaveLength(2);

        expect.soft(legendItems[0]!.getAttributeNames()).toEqual(["class", "style"]);
        expect
          .soft(legendItems[0]!.getAttribute("class"))
          .toBe("recharts-legend-item legend-item-0");
        expect
          .soft(legendItems[0]!.getAttribute("style"))
          .toBe("display: inline-block; margin-right: 10px; white-space: nowrap;");
        expect.soft(legendItems[1]!.getAttributeNames()).toEqual(["class", "style"]);
        expect
          .soft(legendItems[1]!.getAttribute("class"))
          .toBe("recharts-legend-item legend-item-1");
        expect
          .soft(legendItems[1]!.getAttribute("style"))
          .toBe("display: inline-block; margin-right: 10px; white-space: nowrap;");
      });

      it("should render Line symbols and colors in absence of explicit legendType", () => {
        const { container } = renderTestCase();
        const findResult = expectedLegendTypeSymbolsWithColor("#3182bd").find(
          (tc) => tc.legendType === "line",
        );
        assertNotNull(findResult);
        const { selector, expectedAttributes } = findResult;
        assertExpectedAttributes(container, selector, expectedAttributes);
      });
    });

    describe("with `name` prop on Area", () => {
      it("should set legend item from `name` prop on Area, and update it after rerender", () => {
        const [name, setName] = createSignal("%");
        const { container } = render(() => (
          <AreaChart width={500} height={500} data={numericalData}>
            <Legend />
            <Area dataKey="percent" name={name()} />
          </AreaChart>
        ));
        flush();
        expectLegendLabels(container, [{ fill: "none", textContent: "%" }]);

        setName("Percent");
        flush();
        expectLegendLabels(container, [{ fill: "none", textContent: "Percent" }]);
      });

      it("should select legend payload", () => {
        // createSelectorTestCase()(selectLegendPayload) settles to undefined for
        // child-registration selectors, so we spy the accessor directly via an
        // effect (the established pattern in legendSelectors.spec.tsx).
        const spy = vi.fn();
        const Comp = (): null => {
          const legend = useAppSelectorWithStableTest(selectLegendPayload);
          createEffect(
            () => legend(),
            (value) => spy(value),
          );
          return null;
        };
        render(() => (
          <AreaChart width={500} height={500} data={numericalData}>
            <Legend />
            <Area dataKey="percent" name="%" />
            <Comp />
          </AreaChart>
        ));
        flush();
        expectLastCalledWith(spy, [
          {
            inactive: false,
            dataKey: "percent",
            type: "line",
            color: "#3182bd",
            value: "%",
            payload: {
              dataKey: "percent",
              name: "%",
              activeDot: true,
              animationBegin: 0,
              animationDuration: 1500,
              animationEasing: "ease",
              connectNulls: false,
              dot: false,
              fill: "#3182bd",
              fillOpacity: 0.6,
              hide: false,
              isAnimationActive: "auto",
              label: false,
              legendType: "line",
              stroke: "#3182bd",
              strokeWidth: 1,
              type: "linear",
              xAxisId: 0,
              yAxisId: 0,
              zIndex: DefaultZIndexes.area,
            },
          },
        ]);
      });
    });

    it("should disappear after Area element is removed", () => {
      const [showFirst, setShowFirst] = createSignal(true);
      const { container } = render(() => (
        <AreaChart width={500} height={500} data={dataWithSpecialNameAndFillProperties}>
          <Legend />
          {showFirst() ? <Area dataKey="name" /> : null}
          <Area dataKey="value" />
        </AreaChart>
      ));
      flush();
      expectLegendLabels(container, [
        { fill: "none", textContent: "name" },
        { fill: "none", textContent: "value" },
      ]);

      setShowFirst(false);
      flush();
      expectLegendLabels(container, [{ fill: "none", textContent: "value" }]);
    });

    it("should update legend if Area data changes", () => {
      const [dataKey, setDataKey] = createSignal("value");
      const { container } = render(() => (
        <AreaChart width={500} height={500} data={numericalData}>
          <Legend />
          <Area dataKey={dataKey()} />
        </AreaChart>
      ));
      flush();
      expectLegendLabels(container, [{ fill: "none", textContent: "value" }]);

      setDataKey("percent");
      flush();
      expectLegendLabels(container, [{ fill: "none", textContent: "percent" }]);
    });
  });

  describe("as a child of ComposedChart", () => {
    it("should render legend of Scatter even though it is not a supported graphical element inside ComposedChart", () => {
      const { container } = render(() => (
        <ComposedChart width={500} height={500} data={categoricalData}>
          <Legend />
          <Scatter dataKey="scatter datakey" />
        </ComposedChart>
      ));
      flush();
      expectLegendLabels(container, [{ textContent: "scatter datakey", fill: undefined }]);
    });
  });

  describe("as a child of RadarChart", () => {
    it("should render one rect legend item for each Radar, with default class and style attributes", () => {
      const { container } = render(() => (
        <RadarChart width={500} height={500} data={numericalData}>
          <Legend />
          <Radar dataKey="percent" />
          <Radar dataKey="value" />
        </RadarChart>
      ));
      flush();
      expect(screen.getByText("value")).toBeInTheDocument();
      expect(screen.getByText("percent")).toBeInTheDocument();

      const legendItems = assertHasLegend(container);
      expect(legendItems).toHaveLength(2);

      expect.soft(legendItems[0]!.getAttributeNames()).toEqual(["class", "style"]);
      expect.soft(legendItems[0]!.getAttribute("class")).toBe("recharts-legend-item legend-item-0");
      expect
        .soft(legendItems[0]!.getAttribute("style"))
        .toBe("display: inline-block; margin-right: 10px; white-space: nowrap;");
      expect.soft(legendItems[1]!.getAttributeNames()).toEqual(["class", "style"]);
      expect.soft(legendItems[1]!.getAttribute("class")).toBe("recharts-legend-item legend-item-1");
      expect
        .soft(legendItems[1]!.getAttribute("style"))
        .toBe("display: inline-block; margin-right: 10px; white-space: nowrap;");

      // in absence of explicit `legendType`, Radar should default to rect
      const findResult = expectedLegendTypeSymbolsWithoutColor.find(
        (tc) => tc.legendType === "rect",
      );
      assertNotNull(findResult);
      const { selector, expectedAttributes } = findResult;
      assertExpectedAttributes(container, selector, expectedAttributes);
    });

    it("should change color and className of hidden Radar", () => {
      const { container } = render(() => (
        <RadarChart width={500} height={500} data={numericalData}>
          <Legend inactiveColor="yellow" />
          {/* this will ignore the stroke and use inactive color on legend */}
          <Radar dataKey="percent" stroke="red" hide />
        </RadarChart>
      ));
      flush();
      expect(screen.getByText("percent")).toBeInTheDocument();
      const legendItems = assertHasLegend(container);

      expect.soft(legendItems[0]!.getAttributeNames()).toEqual(["class", "style"]);
      expect
        .soft(legendItems[0]!.getAttribute("class"))
        .toBe("recharts-legend-item legend-item-0 inactive");
      expect
        .soft(legendItems[0]!.getAttribute("style"))
        .toBe("display: inline-block; margin-right: 10px; white-space: nowrap;");

      // in absence of explicit `legendType`, Radar should default to rect
      const findResult = expectedLegendTypeSymbolsWithColor("yellow").find(
        (tc) => tc.legendType === "rect",
      );
      assertNotNull(findResult);
      const { selector, expectedAttributes } = findResult;
      assertExpectedAttributes(container, selector, expectedAttributes);
    });

    it("should have a default inactive Radar legend color", () => {
      const { container } = render(() => (
        <RadarChart width={500} height={500} data={numericalData}>
          <Legend />
          {/* this will ignore the stroke and use inactive color on legend */}
          <Radar dataKey="percent" stroke="red" hide />
        </RadarChart>
      ));
      flush();
      expect(screen.getByText("percent")).toBeInTheDocument();
      const legendItems = assertHasLegend(container);

      expect.soft(legendItems[0]!.getAttributeNames()).toEqual(["class", "style"]);
      expect
        .soft(legendItems[0]!.getAttribute("class"))
        .toBe("recharts-legend-item legend-item-0 inactive");
      expect
        .soft(legendItems[0]!.getAttribute("style"))
        .toBe("display: inline-block; margin-right: 10px; white-space: nowrap;");

      // in absence of explicit `legendType`, Radar should default to rect
      const findResult = expectedLegendTypeSymbolsWithColor("#ccc").find(
        (tc) => tc.legendType === "rect",
      );
      assertNotNull(findResult);
      const { selector, expectedAttributes } = findResult;
      assertExpectedAttributes(container, selector, expectedAttributes);
    });

    it("should render one empty legend item if Radar has no dataKey", () => {
      const { container } = render(() => (
        <RadarChart width={500} height={500} data={numericalData}>
          <Legend />
          <Radar />
        </RadarChart>
      ));
      flush();

      expectLegendLabels(container, [{ fill: null, textContent: "" }]);
    });

    it("should set legend item from `name` prop on Radar, and update it after rerender", () => {
      const [name, setName] = createSignal("%");
      const { container } = render(() => (
        <RadarChart width={500} height={500} data={numericalData}>
          <Legend />
          <Radar dataKey="percent" name={name()} />
        </RadarChart>
      ));
      flush();
      expectLegendLabels(container, [{ fill: null, textContent: "%" }]);

      setName("Percent");
      flush();
      expectLegendLabels(container, [{ fill: null, textContent: "Percent" }]);
    });

    it("should disappear after Radar element is removed", () => {
      const [showFirst, setShowFirst] = createSignal(true);
      const { container } = render(() => (
        <RadarChart width={500} height={500} data={dataWithSpecialNameAndFillProperties}>
          <Legend />
          {showFirst() ? <Radar dataKey="name" /> : null}
          <Radar dataKey="value" />
        </RadarChart>
      ));
      flush();
      expectLegendLabels(container, [
        { fill: null, textContent: "name" },
        { fill: null, textContent: "value" },
      ]);

      setShowFirst(false);
      flush();
      expectLegendLabels(container, [{ fill: null, textContent: "value" }]);
    });

    it("should update legend if Radar data changes", () => {
      const [dataKey, setDataKey] = createSignal("value");
      const { container } = render(() => (
        <RadarChart width={500} height={500} data={numericalData}>
          <Legend />
          <Radar dataKey={dataKey()} />
        </RadarChart>
      ));
      flush();
      expectLegendLabels(container, [{ fill: null, textContent: "value" }]);

      setDataKey("percent");
      flush();
      expectLegendLabels(container, [{ fill: null, textContent: "percent" }]);
    });

    it("should prefer Legend.iconType over Radar.legendType", () => {
      const { container } = render(() => (
        <RadarChart width={500} height={500} data={numericalData}>
          <Legend iconType="circle" />
          <Radar dataKey="value" legendType="square" />
        </RadarChart>
      ));
      flush();
      const findResult = expectedLegendTypeSymbolsWithoutColor.find(
        (li) => li.legendType === "circle",
      );
      assertNotNull(findResult);
      const { selector, expectedAttributes } = findResult;
      assertExpectedAttributes(container, selector, expectedAttributes);
    });
  });

  describe("as a child of ScatterChart", () => {
    it("should render one legend item for each Scatter", () => {
      const { container } = render(() => (
        <ScatterChart width={500} height={500} data={numericalData}>
          <Legend />
          <Scatter dataKey="percent" />
          <Scatter dataKey="value" />
        </ScatterChart>
      ));
      flush();
      expectLegendLabels(container, [
        { fill: undefined, textContent: "percent" },
        { fill: undefined, textContent: "value" },
      ]);
    });

    it("should not use `fill` from data for the legend fill", () => {
      const { container } = render(() => (
        <ScatterChart width={500} height={500} data={dataWithSpecialNameAndFillProperties}>
          <Legend />
          <Scatter dataKey="value" />
        </ScatterChart>
      ));
      flush();
      expectLegendLabels(container, [{ fill: undefined, textContent: "value" }]);
    });
  });

  describe("as a child of PieChart", () => {
    it("should render one legend item for each segment, and it should use nameKey as its label", () => {
      const { container } = render(() => (
        <PieChart width={500} height={500}>
          <Legend />
          <Pie data={numericalData} dataKey="percent" nameKey="value" />
        </PieChart>
      ));
      flush();
      expectLegendLabels(container, [
        { fill: "#808080", textContent: "Concentrated power of will" },
        { fill: "#808080", textContent: "Luck" },
        { fill: "#808080", textContent: "Pain" },
        { fill: "#808080", textContent: "Pleasure" },
        { fill: "#808080", textContent: "Reason to remember the name" },
        { fill: "#808080", textContent: "Skill" },
      ]);
    });

    it("should render a legend item even if the dataKey does not match anything from the data", () => {
      const { container } = render(() => (
        <PieChart width={500} height={500}>
          <Legend />
          <Pie data={numericalData} dataKey="unknown" />
        </PieChart>
      ));
      flush();
      expectLegendLabels(container, [
        { fill: "#808080", textContent: "unknown" },
        { fill: "#808080", textContent: "unknown" },
        { fill: "#808080", textContent: "unknown" },
        { fill: "#808080", textContent: "unknown" },
        { fill: "#808080", textContent: "unknown" },
        { fill: "#808080", textContent: "unknown" },
      ]);
    });

    it("should implicitly use special `name` and `fill` properties from data as legend labels and colors", () => {
      const { container } = render(() => (
        <PieChart width={500} height={500}>
          <Legend />
          <Pie data={dataWithSpecialNameAndFillProperties} dataKey="value" />
        </PieChart>
      ));
      flush();
      expectLegendLabels(container, [
        { fill: "fill1", textContent: "name1" },
        { fill: "fill2", textContent: "name2" },
        { fill: "fill3", textContent: "name3" },
        { fill: "fill4", textContent: "name4" },
      ]);
    });

    describe("itemSorter", () => {
      it("should sort items by the special name property by default", () => {
        const dataInDifferentOrder = [
          { name: "name2", fill: "fill2", value: 34 },
          { name: "name1", fill: "fill1", value: 12 },
          { name: "name4", fill: "fill4", value: 78 },
          { name: "name3", fill: "fill3", value: 56 },
        ];
        const { container } = render(() => (
          <PieChart width={500} height={500}>
            <Legend />
            <Pie data={dataInDifferentOrder} dataKey="value" />
          </PieChart>
        ));
        flush();
        expectLegendLabels(container, [
          { fill: "fill1", textContent: "name1" },
          { fill: "fill2", textContent: "name2" },
          { fill: "fill3", textContent: "name3" },
          { fill: "fill4", textContent: "name4" },
        ]);
      });

      it.each(["dataKey", null] as const)(
        "should leave items in the original data order when itemSorter=%s",
        (itemSorter) => {
          const { container } = render(() => (
            <PieChart width={500} height={500}>
              <Legend itemSorter={itemSorter} />
              <Pie data={numericalData} dataKey="percent" nameKey="value" />
            </PieChart>
          ));
          flush();
          expectLegendLabels(container, [
            { fill: "#808080", textContent: "Luck" },
            { fill: "#808080", textContent: "Skill" },
            { fill: "#808080", textContent: "Concentrated power of will" },
            { fill: "#808080", textContent: "Pleasure" },
            { fill: "#808080", textContent: "Pain" },
            { fill: "#808080", textContent: "Reason to remember the name" },
          ]);
        },
      );
    });

    it("should disappear after Pie data is removed", () => {
      const [data, setData] = createSignal(numericalData);
      const { container } = render(() => (
        <PieChart width={500} height={500}>
          <Legend />
          <Pie data={data()} dataKey="percent" />
          <Pie data={numericalData2} dataKey="value" nameKey="title" />
        </PieChart>
      ));
      flush();
      expectLegendLabels(container, [
        { fill: "#808080", textContent: "Days a week" },
        { fill: "#808080", textContent: "Luftbaloons" },
        { fill: "#808080", textContent: "Mambo number" },
        { fill: "#808080", textContent: "Miles I would walk" },
        { fill: "#808080", textContent: "Seas of Rhye" },
        { fill: "#808080", textContent: "percent" },
        { fill: "#808080", textContent: "percent" },
        { fill: "#808080", textContent: "percent" },
        { fill: "#808080", textContent: "percent" },
        { fill: "#808080", textContent: "percent" },
        { fill: "#808080", textContent: "percent" },
      ]);

      setData([]);
      flush();
      expectLegendLabels(container, [
        { fill: "#808080", textContent: "Days a week" },
        { fill: "#808080", textContent: "Luftbaloons" },
        { fill: "#808080", textContent: "Mambo number" },
        { fill: "#808080", textContent: "Miles I would walk" },
        { fill: "#808080", textContent: "Seas of Rhye" },
      ]);
    });

    it("should update legend if Pie data changes", () => {
      const [first, setFirst] = createSignal(true);
      const { container } = render(() => (
        <PieChart width={500} height={500}>
          <Legend />
          <Show
            when={first()}
            fallback={<Pie data={numericalData2} dataKey="value" nameKey="title" />}
          >
            <Pie data={numericalData} dataKey="percent" nameKey="value" />
          </Show>
        </PieChart>
      ));
      flush();
      expectLegendLabels(container, [
        { fill: "#808080", textContent: "Concentrated power of will" },
        { fill: "#808080", textContent: "Luck" },
        { fill: "#808080", textContent: "Pain" },
        { fill: "#808080", textContent: "Pleasure" },
        { fill: "#808080", textContent: "Reason to remember the name" },
        { fill: "#808080", textContent: "Skill" },
      ]);

      setFirst(false);
      flush();
      expectLegendLabels(container, [
        { fill: "#808080", textContent: "Days a week" },
        { fill: "#808080", textContent: "Luftbaloons" },
        { fill: "#808080", textContent: "Mambo number" },
        { fill: "#808080", textContent: "Miles I would walk" },
        { fill: "#808080", textContent: "Seas of Rhye" },
      ]);
    });

    it("should update legend if nameKey changes", () => {
      const [nameKey, setNameKey] = createSignal("value");
      const { container } = render(() => (
        <PieChart width={500} height={500}>
          <Legend />
          <Pie data={numericalData} dataKey="percent" nameKey={nameKey()} />
        </PieChart>
      ));
      flush();
      expectLegendLabels(container, [
        { fill: "#808080", textContent: "Concentrated power of will" },
        { fill: "#808080", textContent: "Luck" },
        { fill: "#808080", textContent: "Pain" },
        { fill: "#808080", textContent: "Pleasure" },
        { fill: "#808080", textContent: "Reason to remember the name" },
        { fill: "#808080", textContent: "Skill" },
      ]);

      setNameKey("percent");
      flush();
      expectLegendLabels(container, [
        { fill: "#808080", textContent: "10" },
        { fill: "#808080", textContent: "100" },
        { fill: "#808080", textContent: "15" },
        { fill: "#808080", textContent: "20" },
        { fill: "#808080", textContent: "50" },
        { fill: "#808080", textContent: "50" },
      ]);
    });

    describe("legendType symbols", () => {
      it.each(expectedLegendTypeSymbolsWithColor("#808080"))(
        "should render element $selector for legendType $legendType",
        ({ legendType, selector, expectedAttributes }) => {
          const { container } = render(() => (
            <PieChart width={500} height={500}>
              <Legend />
              <Pie data={numericalData} dataKey="percent" legendType={legendType} />
            </PieChart>
          ));
          flush();
          assertExpectedAttributes(container, selector, expectedAttributes);
        },
      );

      it("should prefer Legend.iconType over Pie.legendType", () => {
        const { container } = render(() => (
          <PieChart width={500} height={500}>
            <Legend iconType="circle" />
            <Pie data={numericalData} dataKey="percent" legendType="square" />
          </PieChart>
        ));
        flush();
        const findResult = expectedLegendTypeSymbolsWithColor("#808080").find(
          (li) => li.legendType === "circle",
        );
        assertNotNull(findResult);
        assertExpectedAttributes(container, findResult.selector, findResult.expectedAttributes);
      });
    });
  });

  describe("as a child of RadialBarChart", () => {
    it("should render one legend item for each segment, with no label text, and rect icon with no color, by default", () => {
      const { container } = render(() => (
        <RadialBarChart width={500} height={500} data={numericalData}>
          <Legend />
          <RadialBar dataKey="percent" label />
        </RadialBarChart>
      ));
      flush();
      const legendItems = assertHasLegend(container);
      expect(legendItems).toHaveLength(numericalData.length);
      legendItems.forEach((legendItem) => {
        const legendItemText = legendItem.querySelector(".recharts-legend-item-text");
        expect(legendItemText).toBeInTheDocument();
        expect(legendItemText).toBeEmptyDOMElement();
      });
      const findResult = expectedLegendTypeSymbolsWithoutColor.find((i) => i.legendType === "rect");
      assertNotNull(findResult);
      assertExpectedAttributes(container, findResult.selector, findResult.expectedAttributes);
    });

    it("should render a legend item even if the dataKey does not match anything from the data", () => {
      const { container } = render(() => (
        <RadialBarChart width={500} height={500} data={numericalData}>
          <Legend />
          <RadialBar dataKey="unknown" />
        </RadialBarChart>
      ));
      flush();
      expectLegendLabels(container, [
        { fill: null, textContent: "" },
        { fill: null, textContent: "" },
        { fill: null, textContent: "" },
        { fill: null, textContent: "" },
        { fill: null, textContent: "" },
        { fill: null, textContent: "" },
      ]);
    });

    it("should use special `name` and `fill` properties from data as legend labels and colors", () => {
      const { container } = render(() => (
        <RadialBarChart width={500} height={500} data={dataWithSpecialNameAndFillProperties}>
          <Legend />
          <RadialBar dataKey="percent" />
        </RadialBarChart>
      ));
      flush();
      expectLegendLabels(container, [
        { fill: "fill1", textContent: "name1" },
        { fill: "fill2", textContent: "name2" },
        { fill: "fill3", textContent: "name3" },
        { fill: "fill4", textContent: "name4" },
      ]);
    });

    it("should use special `name` and `fill` properties from data as legend labels and colors, even if the dataKey does not match", () => {
      const { container } = render(() => (
        <RadialBarChart width={500} height={500} data={dataWithSpecialNameAndFillProperties}>
          <Legend />
          <RadialBar dataKey="unknown" />
        </RadialBarChart>
      ));
      flush();
      expectLegendLabels(container, [
        { fill: "fill1", textContent: "name1" },
        { fill: "fill2", textContent: "name2" },
        { fill: "fill3", textContent: "name3" },
        { fill: "fill4", textContent: "name4" },
      ]);
    });
  });

  describe("click events", () => {
    it("should call onClick when clicked", () => {
      const onClick: Mock<LegendItemEventHandler> = vi.fn();
      const { container } = render(() => (
        <ScatterChart width={500} height={500} data={numericalData}>
          <Legend onClick={onClick} />
          <Scatter dataKey="percent" />
        </ScatterChart>
      ));
      flush();
      expect(onClick).toHaveBeenCalledTimes(0);
      const legend = container.querySelector(".recharts-legend-item");
      assertNotNull(legend);
      fireEvent.click(legend);
      expect(onClick).toHaveBeenCalledTimes(1);
      const expectedPayload: LegendPayload = {
        color: undefined,
        dataKey: "percent",
        inactive: false,
        payload: {
          animationBegin: 0,
          animationDuration: 400,
          animationEasing: "linear",
          animationInterpolateFn: expect.any(Function),
          animationMatchBy: "append",
          dataKey: "percent",
          hide: false,
          isAnimationActive: "auto",
          label: false,
          legendType: "circle",
          line: false,
          lineJointType: "linear",
          lineType: "joint",
          shape: "circle",
          xAxisId: 0,
          yAxisId: 0,
          zAxisId: 0,
          zIndex: 600,
        },
        type: "circle",
        value: "percent",
      };
      expect(onClick).toHaveBeenLastCalledWith(
        expectedPayload,
        0,
        expect.objectContaining({ type: "click" }),
      );
    });
  });
});
