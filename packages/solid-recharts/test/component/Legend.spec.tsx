// Ported from recharts 3.8.1 test/component/Legend.spec.tsx.
//
// Tier-A DOM/behavioral assertions are byte-identical to recharts; only the
// harness is adapted: React render -> Solid `render(() => <.../>)`; rerenders are
// driven by a Solid signal (no JSX `rerender`); the reference `expectLegendLabels`
// / `assertHasLegend` helpers and the legendType symbol tables are inlined here
// (the repo has no shared `expectLegendLabels` helper); `rechartsTestRender` ->
// `render` + `flush`. Custom `content` as a React element, `aria-label` on the
// Surface, and the `mockSequenceOfGetBoundingClientRect` regression test are not
// supported by the port (see reclassifiedBlocked) and are omitted.
import { createSignal, flush } from "solid-js";
import { describe, expect, it, test, vi } from "vitest";
import { fireEvent, render, screen } from "../helper/render";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  Radar,
  RadarChart,
  Scatter,
  ScatterChart,
} from "../../src";
import type { LegendProps, LegendType } from "../../src";
import { mockGetBoundingClientRect } from "../helper/mockGetBoundingClientRect";
import { assertNotNull } from "../helper/assertNotNull";
import { createSelectorTestCase } from "../helper/createSelectorTestCase";
import { dataWithSpecialNameAndFillProperties, numericalData } from "../_data";

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
        .toBe("display: inline-block; margin-right: 10px;");
      expect.soft(legendItems[1]!.getAttributeNames()).toEqual(["class", "style"]);
      expect.soft(legendItems[1]!.getAttribute("class")).toBe("recharts-legend-item legend-item-1");
      expect
        .soft(legendItems[1]!.getAttribute("style"))
        .toBe("display: inline-block; margin-right: 10px;");

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
        .toBe("display: inline-block; margin-right: 10px;");

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
        .toBe("display: inline-block; margin-right: 10px;");

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

    describe("wrapper props", () => {
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

      // NOTE: only the layout="vertical" cases are ported here. The 9
      // layout="horizontal" cases expect a computed wrapper width (470px) that the
      // port does not produce (no getWidthOrHeight) — see reclassifiedBlocked.
      const layoutPositionCartesianTests: ReadonlyArray<LegendPositionTextCase> = [
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
          .toBe("display: inline-block; margin-right: 10px;");
        expect.soft(legendItems[1]!.getAttributeNames()).toEqual(["class", "style"]);
        expect
          .soft(legendItems[1]!.getAttribute("class"))
          .toBe("recharts-legend-item legend-item-1");
        expect
          .soft(legendItems[1]!.getAttribute("style"))
          .toBe("display: inline-block; margin-right: 10px;");
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
        .toBe("display: inline-block; margin-right: 10px;");
      expect.soft(legendItems[1]!.getAttributeNames()).toEqual(["class", "style"]);
      expect.soft(legendItems[1]!.getAttribute("class")).toBe("recharts-legend-item legend-item-1");
      expect
        .soft(legendItems[1]!.getAttribute("style"))
        .toBe("display: inline-block; margin-right: 10px;");

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
        .toBe("display: inline-block; margin-right: 10px;");

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
        .toBe("display: inline-block; margin-right: 10px;");

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

  describe("click events", () => {
    it("should call onClick when clicked", () => {
      const onClick = vi.fn();
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
    });
  });
});
