// Port of recharts 3.8.1 test/cartesian/Bar/Bar.spec.tsx (commit 7a23854).
// Ported: geometry, barSize, maxBarSize, label, minPointSize, background, id/clip,
// legendType, events, stacked tooltip/activeBar (#5124), background zIndex,
// activeBar+null data, ScatterChart matrix, state integration.
// Deferred: full unsupported-chart matrix.
// label spy call-count is data.length (not ×2 — no React StrictMode double-mount).
import { createEffect, createSignal, flush, omit, Show } from "solid-js";
import type { JSX } from "@solidjs/web";
import { afterEach, beforeEach, describe, expect, it, test, vi } from "vitest";
import {
  Bar,
  BarChart,
  BarProps,
  DefaultZIndexes,
  Legend,
  Tooltip,
  type LegendType,
  XAxis,
  YAxis,
} from "../../../src";
import type { CartesianGraphicalItemSettings } from "../../../src/state/graphicalItemsSlice";
import { useAppSelector } from "../../../src/state/hooks";
import { BarSettings } from "../../../src/state/types/BarSettings";
import { fireEvent, render } from "../../helper/render";
import { assertZIndexLayerOrder } from "../../helper/assertZIndexLayerOrder";
import { expectActiveBars, expectBars, getAllBars } from "../../helper/expectBars";
import { expectLabels } from "../../helper/expectLabel";
import { svgPropertiesAndEvents } from "../../../src/util/svgPropertiesAndEvents";
import type { Props as LabelProps } from "../../../src/component/Label";
import { expectLastCalledWith } from "../../helper/expectLastCalledWith";
import { assertNotNull } from "../../helper/assertNotNull";
import {
  BarChartCase,
  chartsWhereBarMustNotRender,
  ComposedChartCase,
  type CartesianChartTestCase,
} from "../../helper/parameterizedTestCases";
import { createSelectorTestCase } from "../../helper/createSelectorTestCase";
import {
  expectTooltipCoordinate,
  expectTooltipPayload,
  showTooltipOnCoordinate,
} from "../../component/Tooltip/tooltipTestHelpers";
import {
  selectActiveTooltipIndex,
  selectTooltipAxisTicks,
} from "../../../src/state/selectors/tooltipSelectors";
import { barChartMouseHoverTooltipSelector } from "../../component/Tooltip/tooltipMouseHoverSelectors";
import { mockGetBoundingClientRect } from "../../helper/mockGetBoundingClientRect";
import { noInteraction, type TooltipState } from "../../../src/state/tooltipSlice";

// Ported from vendor/recharts-reference/test/vitest.setup.ts — scoped to Bar specs
// so activeBar rAF staging is synchronous via vi.runOnlyPendingTimers().
beforeEach(() => {
  vi.useFakeTimers({
    toFake: ["requestAnimationFrame", "cancelAnimationFrame"],
  });
});

afterEach(() => {
  vi.clearAllTimers();
});

const chartsThatSupportBar: ReadonlyArray<CartesianChartTestCase> = [
  ComposedChartCase,
  BarChartCase,
];

const chartsThatDoNotSupportBar = chartsWhereBarMustNotRender(chartsThatSupportBar);

const data = [
  { x: 10, y: 50, width: 20, height: 50, value: 100, label: "test1" },
  { x: 50, y: 50, width: 20, height: 50, value: 200, label: "test2" },
  { x: 90, y: 50, width: 20, height: 50, value: 300, label: "test3" },
  { x: 130, y: 50, width: 20, height: 50, value: 400, label: "test4" },
  { x: 170, y: 50, width: 20, height: 50, value: 500, label: "test5" },
];

function renderChart(ui: () => JSX.Element): { container: HTMLElement } {
  const result = render(ui);
  flush();
  flush();
  flush();
  return result;
}

describe.each(chartsThatSupportBar)("<Bar /> as a child of $testName", ({ ChartElement }) => {
  it(`should render rectangles in horizontal Bar`, () => {
    const { container } = renderChart(() => (
      <ChartElement layout="horizontal" data={data}>
        <Bar isAnimationActive={false} dataKey="value" />
      </ChartElement>
    ));

    expectBars(container, [
      {
        d: "M 14.8,413.3333 h 78 v 81.6667 h -78 Z",
        height: "81.6667",
        radius: "0",
        width: "78",
        x: "14.8",
        y: "413.3333",
      },
      {
        d: "M 112.8,331.6667 h 78 v 163.3333 h -78 Z",
        height: "163.3333",
        radius: "0",
        width: "78",
        x: "112.8",
        y: "331.6667",
      },
      {
        d: "M 210.8,250 h 78 v 245 h -78 Z",
        height: "245",
        radius: "0",
        width: "78",
        x: "210.8",
        y: "250",
      },
      {
        d: "M 308.8,168.3333 h 78 v 326.6667 h -78 Z",
        height: "326.6667",
        radius: "0",
        width: "78",
        x: "308.8",
        y: "168.3333",
      },
      {
        d: "M 406.8,86.6667 h 78 v 408.3333 h -78 Z",
        height: "408.3333",
        radius: "0",
        width: "78",
        x: "406.8",
        y: "86.6667",
      },
    ]);
  });

  it(`should render rectangles when wrapped in custom Component`, () => {
    const MyBar = (props: BarProps) => <Bar {...props} />;
    const { container } = renderChart(() => (
      <ChartElement layout="horizontal" data={data}>
        <MyBar isAnimationActive={false} dataKey="value" />
      </ChartElement>
    ));

    expectBars(container, [
      {
        d: "M 14.8,413.3333 h 78 v 81.6667 h -78 Z",
        height: "81.6667",
        radius: "0",
        width: "78",
        x: "14.8",
        y: "413.3333",
      },
      {
        d: "M 112.8,331.6667 h 78 v 163.3333 h -78 Z",
        height: "163.3333",
        radius: "0",
        width: "78",
        x: "112.8",
        y: "331.6667",
      },
      {
        d: "M 210.8,250 h 78 v 245 h -78 Z",
        height: "245",
        radius: "0",
        width: "78",
        x: "210.8",
        y: "250",
      },
      {
        d: "M 308.8,168.3333 h 78 v 326.6667 h -78 Z",
        height: "326.6667",
        radius: "0",
        width: "78",
        x: "308.8",
        y: "168.3333",
      },
      {
        d: "M 406.8,86.6667 h 78 v 408.3333 h -78 Z",
        height: "408.3333",
        radius: "0",
        width: "78",
        x: "406.8",
        y: "86.6667",
      },
    ]);
  });

  it(`should render rectangles in vertical Bar`, () => {
    const { container } = renderChart(() => (
      <ChartElement layout="vertical" data={data}>
        <YAxis type="category" />
        <XAxis type="number" />
        <Bar isAnimationActive={false} dataKey="value" />
      </ChartElement>
    ));

    expectBars(container, [
      {
        x: "65",
        y: "14.2",
        width: "71.6667",
        height: "74",
        radius: "0",
        d: "M 65,14.2 h 71.6667 v 74 h -71.6667 Z",
      },
      {
        x: "65",
        y: "106.2",
        width: "143.3333",
        height: "74",
        radius: "0",
        d: "M 65,106.2 h 143.3333 v 74 h -143.3333 Z",
      },
      {
        x: "65",
        y: "198.2",
        width: "215",
        height: "74",
        radius: "0",
        d: "M 65,198.2 h 215 v 74 h -215 Z",
      },
      {
        x: "65",
        y: "290.2",
        width: "286.6667",
        height: "74",
        radius: "0",
        d: "M 65,290.2 h 286.6667 v 74 h -286.6667 Z",
      },
      {
        x: "65",
        y: "382.2",
        width: "358.3333",
        height: "74",
        radius: "0",
        d: "M 65,382.2 h 358.3333 v 74 h -358.3333 Z",
      },
    ]);
  });

  it("Don't render any rectangle when data is empty", () => {
    const { container } = renderChart(() => (
      <ChartElement data={[]}>
        <Bar dataKey="value" />
      </ChartElement>
    ));

    expectBars(container, []);
  });

  describe("with explicit ID prop", () => {
    it("should pass id prop to an element in the DOM", () => {
      const { container } = renderChart(() => (
        <ChartElement layout="horizontal" data={data}>
          <Bar isAnimationActive={false} dataKey="value" id="test-bar-id" />
          <XAxis allowDataOverflow />
        </ChartElement>
      ));

      const bar = container.querySelector("#test-bar-id");
      assertNotNull(bar);
      expect(bar.tagName).toBe("g");
      expect(bar.classList.value).toBe("recharts-layer recharts-bar");
    });

    it("should set the ID on the clipPath, if it needs clipping", () => {
      const { container } = renderChart(() => (
        <ChartElement layout="horizontal" data={data}>
          <Bar isAnimationActive={false} dataKey="value" id="test-bar-id" />
          <XAxis allowDataOverflow />
        </ChartElement>
      ));

      const clipPath = container.querySelector("#clipPath-test-bar-id");
      assertNotNull(clipPath);
      expect(clipPath.tagName).toBe("clipPath");
    });
  });

  describe("barSize", () => {
    it("should make bars wider in horizontal chart", () => {
      const barSize = 79;
      const { container } = renderChart(() => (
        <ChartElement layout="horizontal" data={data}>
          <Bar isAnimationActive={false} dataKey="value" barSize={barSize} />
        </ChartElement>
      ));

      expectBars(container, [
        {
          x: "15",
          y: "413.3333",
          width: "79",
          height: "81.6667",
          radius: "0",
          d: "M 15,413.3333 h 79 v 81.6667 h -79 Z",
        },
        {
          x: "113",
          y: "331.6667",
          width: "79",
          height: "163.3333",
          radius: "0",
          d: "M 113,331.6667 h 79 v 163.3333 h -79 Z",
        },
        {
          x: "211",
          y: "250",
          width: "79",
          height: "245",
          radius: "0",
          d: "M 211,250 h 79 v 245 h -79 Z",
        },
        {
          x: "309",
          y: "168.3333",
          width: "79",
          height: "326.6667",
          radius: "0",
          d: "M 309,168.3333 h 79 v 326.6667 h -79 Z",
        },
        {
          x: "407",
          y: "86.6667",
          width: "79",
          height: "408.3333",
          radius: "0",
          d: "M 407,86.6667 h 79 v 408.3333 h -79 Z",
        },
      ]);
    });

    it("should make bars narrower in horizontal chart", () => {
      const barSize = 77;
      const { container } = renderChart(() => (
        <ChartElement layout="horizontal" data={data}>
          <Bar isAnimationActive={false} dataKey="value" barSize={barSize} />
        </ChartElement>
      ));

      expectBars(container, [
        {
          x: "16",
          y: "413.3333",
          width: "77",
          height: "81.6667",
          radius: "0",
          d: "M 16,413.3333 h 77 v 81.6667 h -77 Z",
        },
        {
          x: "114",
          y: "331.6667",
          width: "77",
          height: "163.3333",
          radius: "0",
          d: "M 114,331.6667 h 77 v 163.3333 h -77 Z",
        },
        {
          x: "212",
          y: "250",
          width: "77",
          height: "245",
          radius: "0",
          d: "M 212,250 h 77 v 245 h -77 Z",
        },
        {
          x: "310",
          y: "168.3333",
          width: "77",
          height: "326.6667",
          radius: "0",
          d: "M 310,168.3333 h 77 v 326.6667 h -77 Z",
        },
        {
          x: "408",
          y: "86.6667",
          width: "77",
          height: "408.3333",
          radius: "0",
          d: "M 408,86.6667 h 77 v 408.3333 h -77 Z",
        },
      ]);
    });

    it("should make bars taller in vertical chart", () => {
      const barSize = 74;
      const { container } = renderChart(() => (
        <ChartElement layout="vertical" data={data}>
          <YAxis type="category" />
          <XAxis type="number" />
          <Bar isAnimationActive={false} dataKey="value" barSize={barSize} />
        </ChartElement>
      ));

      expectBars(container, [
        {
          d: "M 65,14 h 71.6667 v 74 h -71.6667 Z",
          height: "74",
          radius: "0",
          width: "71.6667",
          x: "65",
          y: "14",
        },
        {
          d: "M 65,106 h 143.3333 v 74 h -143.3333 Z",
          height: "74",
          radius: "0",
          width: "143.3333",
          x: "65",
          y: "106",
        },
        {
          d: "M 65,198 h 215 v 74 h -215 Z",
          height: "74",
          radius: "0",
          width: "215",
          x: "65",
          y: "198",
        },
        {
          d: "M 65,290 h 286.6667 v 74 h -286.6667 Z",
          height: "74",
          radius: "0",
          width: "286.6667",
          x: "65",
          y: "290",
        },
        {
          d: "M 65,382 h 358.3333 v 74 h -358.3333 Z",
          height: "74",
          radius: "0",
          width: "358.3333",
          x: "65",
          y: "382",
        },
      ]);
    });

    it("should make bars shorter in vertical chart", () => {
      const barSize = 72;
      const { container } = renderChart(() => (
        <ChartElement layout="vertical" data={data}>
          <YAxis type="category" />
          <XAxis type="number" />
          <Bar isAnimationActive={false} dataKey="value" barSize={barSize} />
        </ChartElement>
      ));

      expectBars(container, [
        {
          d: "M 65,15 h 71.6667 v 72 h -71.6667 Z",
          height: "72",
          radius: "0",
          width: "71.6667",
          x: "65",
          y: "15",
        },
        {
          d: "M 65,107 h 143.3333 v 72 h -143.3333 Z",
          height: "72",
          radius: "0",
          width: "143.3333",
          x: "65",
          y: "107",
        },
        {
          d: "M 65,199 h 215 v 72 h -215 Z",
          height: "72",
          radius: "0",
          width: "215",
          x: "65",
          y: "199",
        },
        {
          d: "M 65,291 h 286.6667 v 72 h -286.6667 Z",
          height: "72",
          radius: "0",
          width: "286.6667",
          x: "65",
          y: "291",
        },
        {
          d: "M 65,383 h 358.3333 v 72 h -358.3333 Z",
          height: "72",
          radius: "0",
          width: "358.3333",
          x: "65",
          y: "383",
        },
      ]);
    });
  });

  describe("maxBarSize", () => {
    it("should do nothing if bars are already smaller than the maxBarSize", () => {
      const { container } = renderChart(() => (
        <ChartElement layout="horizontal" data={data}>
          <Bar isAnimationActive={false} dataKey="value" maxBarSize={79} />
        </ChartElement>
      ));

      expectBars(container, [
        {
          d: "M 14.8,413.3333 h 78 v 81.6667 h -78 Z",
          height: "81.6667",
          radius: "0",
          width: "78",
          x: "14.8",
          y: "413.3333",
        },
        {
          d: "M 112.8,331.6667 h 78 v 163.3333 h -78 Z",
          height: "163.3333",
          radius: "0",
          width: "78",
          x: "112.8",
          y: "331.6667",
        },
        {
          d: "M 210.8,250 h 78 v 245 h -78 Z",
          height: "245",
          radius: "0",
          width: "78",
          x: "210.8",
          y: "250",
        },
        {
          d: "M 308.8,168.3333 h 78 v 326.6667 h -78 Z",
          height: "326.6667",
          radius: "0",
          width: "78",
          x: "308.8",
          y: "168.3333",
        },
        {
          d: "M 406.8,86.6667 h 78 v 408.3333 h -78 Z",
          height: "408.3333",
          radius: "0",
          width: "78",
          x: "406.8",
          y: "86.6667",
        },
      ]);
    });

    it("should change all bars width when bars are larger than the maxBarSize", () => {
      const maxBarSize = 77;
      const { container } = renderChart(() => (
        <ChartElement layout="horizontal" data={data}>
          <Bar isAnimationActive={false} dataKey="value" maxBarSize={maxBarSize} />
        </ChartElement>
      ));

      expectBars(container, [
        {
          d: "M 15.3,413.3333 h 77 v 81.6667 h -77 Z",
          height: "81.6667",
          radius: "0",
          width: String(maxBarSize),
          x: "15.3",
          y: "413.3333",
        },
        {
          d: "M 113.3,331.6667 h 77 v 163.3333 h -77 Z",
          height: "163.3333",
          radius: "0",
          width: String(maxBarSize),
          x: "113.3",
          y: "331.6667",
        },
        {
          d: "M 211.3,250 h 77 v 245 h -77 Z",
          height: "245",
          radius: "0",
          width: String(maxBarSize),
          x: "211.3",
          y: "250",
        },
        {
          d: "M 309.3,168.3333 h 77 v 326.6667 h -77 Z",
          height: "326.6667",
          radius: "0",
          width: String(maxBarSize),
          x: "309.3",
          y: "168.3333",
        },
        {
          d: "M 407.3,86.6667 h 77 v 408.3333 h -77 Z",
          height: "408.3333",
          radius: "0",
          width: String(maxBarSize),
          x: "407.3",
          y: "86.6667",
        },
      ]);
    });

    it("should do nothing if barSize is set", () => {
      const maxBarSize = 77;
      const { container } = renderChart(() => (
        <ChartElement layout="horizontal" data={data}>
          <Bar
            isAnimationActive={false}
            dataKey="value"
            maxBarSize={maxBarSize}
            barSize={maxBarSize + 5}
          />
        </ChartElement>
      ));

      expectBars(container, [
        {
          d: "M 13,413.3333 h 82 v 81.6667 h -82 Z",
          height: "81.6667",
          radius: "0",
          width: "82",
          x: "13",
          y: "413.3333",
        },
        {
          d: "M 111,331.6667 h 82 v 163.3333 h -82 Z",
          height: "163.3333",
          radius: "0",
          width: "82",
          x: "111",
          y: "331.6667",
        },
        {
          d: "M 209,250 h 82 v 245 h -82 Z",
          height: "245",
          radius: "0",
          width: "82",
          x: "209",
          y: "250",
        },
        {
          d: "M 307,168.3333 h 82 v 326.6667 h -82 Z",
          height: "326.6667",
          radius: "0",
          width: "82",
          x: "307",
          y: "168.3333",
        },
        {
          d: "M 405,86.6667 h 82 v 408.3333 h -82 Z",
          height: "408.3333",
          radius: "0",
          width: "82",
          x: "405",
          y: "86.6667",
        },
      ]);
    });

    it("should do nothing in vertical chart if all bars are smaller than the maxBarSize", () => {
      const { container } = renderChart(() => (
        <ChartElement layout="vertical" data={data}>
          <YAxis type="category" />
          <XAxis type="number" />
          <Bar isAnimationActive={false} dataKey="value" maxBarSize={74} />
        </ChartElement>
      ));

      expectBars(container, [
        {
          x: "65",
          y: "14.2",
          width: "71.6667",
          height: "74",
          radius: "0",
          d: "M 65,14.2 h 71.6667 v 74 h -71.6667 Z",
        },
        {
          x: "65",
          y: "106.2",
          width: "143.3333",
          height: "74",
          radius: "0",
          d: "M 65,106.2 h 143.3333 v 74 h -143.3333 Z",
        },
        {
          x: "65",
          y: "198.2",
          width: "215",
          height: "74",
          radius: "0",
          d: "M 65,198.2 h 215 v 74 h -215 Z",
        },
        {
          x: "65",
          y: "290.2",
          width: "286.6667",
          height: "74",
          radius: "0",
          d: "M 65,290.2 h 286.6667 v 74 h -286.6667 Z",
        },
        {
          x: "65",
          y: "382.2",
          width: "358.3333",
          height: "74",
          radius: "0",
          d: "M 65,382.2 h 358.3333 v 74 h -358.3333 Z",
        },
      ]);
    });

    it("should change all bars height in vertical chart if all bars are larger than the maxBarSize", () => {
      const maxBarSize = 72;
      const { container } = renderChart(() => (
        <ChartElement layout="vertical" data={data}>
          <YAxis type="category" />
          <XAxis type="number" />
          <Bar isAnimationActive={false} dataKey="value" maxBarSize={maxBarSize} />
        </ChartElement>
      ));

      expectBars(container, [
        {
          x: "65",
          y: "15.2",
          width: "71.6667",
          height: "72",
          radius: "0",
          d: "M 65,15.2 h 71.6667 v 72 h -71.6667 Z",
        },
        {
          x: "65",
          y: "107.2",
          width: "143.3333",
          height: "72",
          radius: "0",
          d: "M 65,107.2 h 143.3333 v 72 h -143.3333 Z",
        },
        {
          x: "65",
          y: "199.2",
          width: "215",
          height: "72",
          radius: "0",
          d: "M 65,199.2 h 215 v 72 h -215 Z",
        },
        {
          x: "65",
          y: "291.2",
          width: "286.6667",
          height: "72",
          radius: "0",
          d: "M 65,291.2 h 286.6667 v 72 h -286.6667 Z",
        },
        {
          x: "65",
          y: "383.2",
          width: "358.3333",
          height: "72",
          radius: "0",
          d: "M 65,383.2 h 358.3333 v 72 h -358.3333 Z",
        },
      ]);
    });

    it("should do nothing if barSize is set in vertical chart", () => {
      const maxBarSize = 72;
      const { container } = renderChart(() => (
        <ChartElement layout="vertical" data={data}>
          <YAxis type="category" />
          <XAxis type="number" />
          <Bar
            isAnimationActive={false}
            dataKey="value"
            maxBarSize={maxBarSize}
            barSize={maxBarSize + 7}
          />
        </ChartElement>
      ));

      expectBars(container, [
        {
          x: "65",
          y: "12",
          width: "71.6667",
          height: "79",
          radius: "0",
          d: "M 65,12 h 71.6667 v 79 h -71.6667 Z",
        },
        {
          x: "65",
          y: "104",
          width: "143.3333",
          height: "79",
          radius: "0",
          d: "M 65,104 h 143.3333 v 79 h -143.3333 Z",
        },
        {
          x: "65",
          y: "196",
          width: "215",
          height: "79",
          radius: "0",
          d: "M 65,196 h 215 v 79 h -215 Z",
        },
        {
          x: "65",
          y: "288",
          width: "286.6667",
          height: "79",
          radius: "0",
          d: "M 65,288 h 286.6667 v 79 h -286.6667 Z",
        },
        {
          x: "65",
          y: "380",
          width: "358.3333",
          height: "79",
          radius: "0",
          d: "M 65,380 h 358.3333 v 79 h -358.3333 Z",
        },
      ]);
    });
  });

  describe("label", () => {
    describe("as boolean", () => {
      it("should draw default labels when label = true", () => {
        const { container } = renderChart(() => (
          <ChartElement data={data}>
            <Bar isAnimationActive={false} label dataKey="value" />
          </ChartElement>
        ));

        const labels = container.querySelectorAll(".recharts-text.recharts-label");
        expect(labels).toHaveLength(data.length);
        labels.forEach((l) => {
          expect(l).toHaveAttribute("x", expect.any(String));
          expect(l).toHaveAttribute("y", expect.any(String));
          expect(l).toHaveAttribute("height", expect.any(String));
          expect(l).toHaveAttribute("offset", "5");
          expect(l).toHaveAttribute("text-anchor", "middle");
          expect(l).toHaveAttribute("width", "78");
          expect(l).toHaveAttribute("fill", "#808080");
        });
      });

      it("should not draw labels while animating", () => {
        const { container } = render(() => (
          <ChartElement data={data}>
            <Bar isAnimationActive label dataKey="value" />
          </ChartElement>
        ));
        flush();

        const labels = container.querySelectorAll(".recharts-text.recharts-label");
        expect(labels).toHaveLength(0);
      });

      it("should not draw labels when label = false", () => {
        const { container } = renderChart(() => (
          <ChartElement data={data}>
            <Bar isAnimationActive={false} label={false} dataKey="value" />
          </ChartElement>
        ));

        const labels = container.querySelectorAll(".recharts-text.recharts-label");
        expect(labels).toHaveLength(0);
      });
    });

    describe("as svg properties object", () => {
      it("should draw labels and add extra props from the object", () => {
        const { container } = renderChart(() => (
          <ChartElement data={data}>
            <Bar
              isAnimationActive={false}
              label={
                {
                  fill: "red",
                  elevation: 9,
                } as never
              }
              dataKey="value"
            />
          </ChartElement>
        ));

        expectLabels(container, [
          {
            height: "81.66666666666669",
            offset: "5",
            textContent: "100",
            width: "78",
            x: "53.8",
            y: "454.16666666666663",
          },
          {
            height: "163.33333333333326",
            offset: "5",
            textContent: "200",
            width: "78",
            x: "151.8",
            y: "413.33333333333337",
          },
          {
            height: "245",
            offset: "5",
            textContent: "300",
            width: "78",
            x: "249.8",
            y: "372.5",
          },
          {
            height: "326.66666666666663",
            offset: "5",
            textContent: "400",
            width: "78",
            x: "347.8",
            y: "331.6666666666667",
          },
          {
            height: "408.33333333333337",
            offset: "5",
            textContent: "500",
            width: "78",
            x: "445.8",
            y: "290.83333333333337",
          },
        ]);
      });

      it("should overwrite the recharts-label className but keep recharts-text className", () => {
        const { container } = renderChart(() => (
          <ChartElement data={data}>
            <Bar
              isAnimationActive={false}
              label={{
                class: "my-test-class",
              }}
              dataKey="value"
            />
          </ChartElement>
        ));

        const labels = container.querySelectorAll(".recharts-text.recharts-label");
        expect(labels).toHaveLength(0);
        const customLabels = container.querySelectorAll(".my-test-class");
        expect(customLabels).toHaveLength(data.length);
        customLabels.forEach((l) => {
          expect(l).toHaveAttribute("class", "recharts-text my-test-class");
        });
      });
    });

    describe("as function", () => {
      it("should pass props to the label function", () => {
        const spy = vi.fn().mockReturnValue(null);
        renderChart(() => (
          <ChartElement data={data}>
            <Bar isAnimationActive={false} label={spy} dataKey="value" />
          </ChartElement>
        ));

        expect(spy).toHaveBeenCalledTimes(data.length);
        // Solid has no StrictMode double-mount; assert the first label call (recharts
        // checks the last of 2×data.length calls after React StrictMode remount).
        expect(spy).toHaveBeenNthCalledWith(1, {
          angle: 0,
          height: expect.any(Number),
          index: expect.any(Number),
          offset: 5,
          parentViewBox: {
            height: expect.any(Number),
            width: expect.any(Number),
            x: expect.any(Number),
            y: expect.any(Number),
          },
          textBreakAll: false,
          position: "middle",
          value: expect.any(Number),
          viewBox: {
            height: expect.any(Number),
            width: expect.any(Number),
            lowerWidth: expect.any(Number),
            upperWidth: expect.any(Number),
            x: expect.any(Number),
            y: 413.3333333333333,
          },
          width: expect.any(Number),
          x: expect.any(Number),
          y: expect.any(Number),
          zIndex: 0,
        });
      });

      it("should render what the label function returned", () => {
        const labelFn = () => <g class="my-mock-class" />;
        const { container } = renderChart(() => (
          <ChartElement data={data}>
            <Bar isAnimationActive={false} label={labelFn} dataKey="value" />
          </ChartElement>
        ));

        const labels = container.querySelectorAll(".my-mock-class");
        expect(labels).toHaveLength(data.length);
        labels.forEach((l) => {
          expect.soft(l).not.toHaveAttribute("x");
          expect.soft(l).not.toHaveAttribute("y");
          expect.soft(l).not.toHaveAttribute("height");
          expect.soft(l).not.toHaveAttribute("offset");
          expect.soft(l).not.toHaveAttribute("text-anchor");
          expect.soft(l).not.toHaveAttribute("width");
          expect.soft(l).not.toHaveAttribute("fill");
        });
      });
    });

    describe("as a custom Element", () => {
      it(`should render what the function returned, and then inject extra sneaky props in it
                - but not all of them, and not the same as in the other ways of rendering labels`, () => {
        // Solid 2 has no cloneElement; a pre-created `<g />` is an opaque object.
        // Behavioral parity: render fn spreads entry attrs onto the template class.
        const MyLabel = (labelProps: LabelProps) => (
          <g
            class="my-mock-class"
            {...svgPropertiesAndEvents(
              omit(
                labelProps as Record<string, unknown>,
                "content",
                "viewBox",
                "formatter",
                "value",
                "children",
                "position",
                "angle",
                "textBreakAll",
                "index",
                "id",
                "zIndex",
                "parentViewBox",
                "class",
              ),
            )}
          />
        );
        const { container } = renderChart(() => (
          <ChartElement data={data}>
            <Bar isAnimationActive={false} label={MyLabel} dataKey="value" />
          </ChartElement>
        ));

        expectLabels(
          container,
          [
            {
              height: "81.66666666666669",
              offset: "5",
              textContent: "",
              width: "78",
              x: "14.8",
              y: "413.3333333333333",
            },
            {
              height: "163.33333333333326",
              offset: "5",
              textContent: "",
              width: "78",
              x: "112.8",
              y: "331.66666666666674",
            },
            {
              height: "245",
              offset: "5",
              textContent: "",
              width: "78",
              x: "210.8",
              y: "250",
            },
            {
              height: "326.66666666666663",
              offset: "5",
              textContent: "",
              width: "78",
              x: "308.8",
              y: "168.33333333333337",
            },
            {
              height: "408.33333333333337",
              offset: "5",
              textContent: "",
              width: "78",
              x: "406.8",
              y: "86.66666666666666",
            },
          ],
          ".my-mock-class",
        );
      });
    });
  });

  describe("minPointSize", () => {
    const highLowData = [
      { name: "test1", value: 10000 },
      { name: "test2", value: 0 },
      { name: "test3", value: 1 },
    ];

    it("should pass props to the minPointSize function", () => {
      const spy = vi.fn().mockImplementation(() => 5);
      renderChart(() => (
        <ChartElement data={highLowData}>
          <XAxis dataKey="name" />
          <YAxis />
          <Bar isAnimationActive={false} minPointSize={spy} dataKey="value" />
        </ChartElement>
      ));

      expect(spy).toBeCalledWith(expect.any(Number), expect.any(Number));
    });

    it("should ignore 0 value bars when minPointSize is undefined, and render the small bars really really small", () => {
      const { container } = renderChart(() => (
        <ChartElement data={highLowData}>
          <XAxis dataKey="name" />
          <Bar isAnimationActive={false} dataKey="value" />
        </ChartElement>
      ));

      expectBars(container, [
        {
          x: "21.3333",
          y: "5",
          width: "131",
          height: "460",
          radius: "0",
          d: "M 21.3333,5 h 131 v 460 h -131 Z",
        },
        {
          x: "348",
          y: "464.954",
          width: "131",
          height: "0.046",
          radius: "0",
          d: "M 348,464.954 h 131 v 0.046 h -131 Z",
        },
      ]);
    });

    it("should assign minimum height to low value bars if minPointSize is a number", () => {
      const { container } = renderChart(() => (
        <ChartElement data={highLowData}>
          <XAxis dataKey="name" />
          <YAxis />
          <Bar isAnimationActive={false} minPointSize={5} dataKey="value" />
        </ChartElement>
      ));

      expectBars(container, [
        {
          x: "79.3333",
          y: "5",
          width: "115",
          height: "460",
          radius: "0",
          d: "M 79.3333,5 h 115 v 460 h -115 Z",
        },
        {
          x: "222.6667",
          y: "460",
          width: "115",
          height: "5",
          radius: "0",
          d: "M 222.6667,460 h 115 v 5 h -115 Z",
        },
        {
          x: "366",
          y: "460",
          width: "115",
          height: "5",
          radius: "0",
          d: "M 366,460 h 115 v 5 h -115 Z",
        },
      ]);
    });

    it("should assign minimum width, in a vertical chart", () => {
      const { container } = renderChart(() => (
        <ChartElement data={highLowData} layout="vertical">
          <XAxis dataKey="value" type="number" />
          <YAxis dataKey="name" type="category" />
          <Bar isAnimationActive={false} minPointSize={5} dataKey="value" />
        </ChartElement>
      ));

      expectBars(container, [
        {
          x: "65",
          y: "20.3333",
          width: "430",
          height: "123",
          radius: "0",
          d: "M 65,20.3333 h 430 v 123 h -430 Z",
        },
        {
          x: "65",
          y: "173.6667",
          width: "5",
          height: "123",
          radius: "0",
          d: "M 65,173.6667 h 5 v 123 h -5 Z",
        },
        {
          x: "65",
          y: "327",
          width: "5",
          height: "123",
          radius: "0",
          d: "M 65,327 h 5 v 123 h -5 Z",
        },
      ]);
    });

    it("should render with varying minPointSize as per function results", () => {
      const { container } = renderChart(() => (
        <ChartElement data={highLowData}>
          <XAxis dataKey="name" />
          <YAxis />
          <Bar
            isAnimationActive={false}
            minPointSize={(value: number | undefined | null) =>
              value != null && value > 0 ? 2 : 0
            }
            dataKey="value"
          />
        </ChartElement>
      ));

      expectBars(container, [
        {
          x: "79.3333",
          y: "5",
          width: "115",
          height: "460",
          radius: "0",
          d: "M 79.3333,5 h 115 v 460 h -115 Z",
        },
        {
          x: "366",
          y: "463",
          width: "115",
          height: "2",
          radius: "0",
          d: "M 366,463 h 115 v 2 h -115 Z",
        },
      ]);
    });
  });

  describe("With background", () => {
    const composedDataWithBackground = [
      {
        x: 10,
        y: 50,
        width: 20,
        height: 20,
        value: 40,
        label: "test",
        background: { x: 10, y: 50, width: 20, height: 50 },
      },
      {
        x: 50,
        y: 50,
        width: 20,
        height: 50,
        value: 100,
        label: "test",
        background: { x: 50, y: 50, width: 20, height: 50 },
      },
    ];

    it("Will create a background Rectangle with the passed in props", () => {
      const { container } = renderChart(() => (
        <ChartElement data={composedDataWithBackground}>
          <Bar background={{ fill: "#000" }} dataKey="value" />
        </ChartElement>
      ));

      expect(container.querySelectorAll(".recharts-bar-background-rectangle")).toHaveLength(
        composedDataWithBackground.length,
      );

      expectBars(container, []);
    });

    it("Will accept a function for the background prop", () => {
      const className = "test-custom-background";
      const backgroundComponent = () => {
        return <g class={className} />;
      };
      const { container } = renderChart(() => (
        <ChartElement data={composedDataWithBackground}>
          <Bar background={backgroundComponent} dataKey="value" />
        </ChartElement>
      ));

      expect(container.querySelectorAll(`.${className}`)).toHaveLength(
        composedDataWithBackground.length,
      );
    });

    it("should pass props to the custom background function", () => {
      const expectedProps = {
        class: "recharts-bar-background-rectangle",
        dataKey: "value",
        fill: "#eee",
        height: 490,
        index: expect.any(Number),
        isActive: false,
        label: "test",
        onMouseEnter: expect.any(Function),
        onMouseLeave: expect.any(Function),
        onClick: expect.any(Function),
        originalDataIndex: expect.any(Number),
        payload: {
          background: {
            height: 50,
            width: 20,
            x: expect.any(Number),
            y: 50,
          },
          height: expect.any(Number),
          label: "test",
          value: expect.any(Number),
          width: 20,
          x: expect.any(Number),
          y: 50,
        },
        stackedBarStart: expect.any(Number),
        width: 196,
        x: expect.any(Number),
        y: 5,
        parentViewBox: {
          height: expect.any(Number),
          width: expect.any(Number),
          x: expect.any(Number),
          y: expect.any(Number),
        },
      };
      const backgroundComponent = (props: unknown) => {
        expect.soft(props).toEqual(expectedProps);
        return <></>;
      };
      renderChart(() => (
        <ChartElement data={composedDataWithBackground}>
          <Bar background={backgroundComponent} dataKey="value" />
        </ChartElement>
      ));
    });
  });

  describe("state integration", () => {
    it("should report its props to redux state, and remove them when removed from DOM", () => {
      const spy = vi.fn();
      const [showBar, setShowBar] = createSignal(true);

      const Comp = (): null => {
        const cartesianItems = useAppSelector((state) => state.graphicalItems.cartesianItems);
        createEffect(
          () => cartesianItems(),
          (items) => spy(items),
        );
        return null;
      };

      renderChart(() => (
        <ChartElement data={data}>
          <Show when={showBar()}>
            <Bar
              dataKey="value"
              xAxisId={7}
              yAxisId={9}
              stackId="q"
              hide
              minPointSize={3}
              maxBarSize={90}
              barSize={13}
            />
          </Show>
          <Comp />
        </ChartElement>
      ));

      const expected: ReadonlyArray<BarSettings> = [
        {
          id: expect.stringMatching("^recharts-bar-[:a-z0-9]+$"),
          isPanorama: false,
          type: "bar",
          data: undefined,
          dataKey: "value",
          xAxisId: 7,
          yAxisId: 9,
          zAxisId: 0,
          stackId: "q",
          hide: true,
          barSize: 13,
          minPointSize: 3,
          maxBarSize: 90,
          hasCustomShape: false,
        },
      ];
      expectLastCalledWith(spy, expected);

      setShowBar(false);
      flush();
      flush();
      expectLastCalledWith(spy, []);
    });

    it("should report default props to redux state", () => {
      const spy = vi.fn();

      const Comp = (): null => {
        const cartesianItems = useAppSelector((state) => state.graphicalItems.cartesianItems);
        createEffect(
          () => cartesianItems(),
          (items) => spy(items),
        );
        return null;
      };

      renderChart(() => (
        <ChartElement data={data}>
          <Bar dataKey="value" />
          <Comp />
        </ChartElement>
      ));

      const expected: ReadonlyArray<CartesianGraphicalItemSettings> = [
        {
          id: expect.stringMatching("^recharts-bar-[:a-z0-9]+$"),
          isPanorama: false,
          type: "bar",
          data: undefined,
          dataKey: "value",
          xAxisId: 0,
          yAxisId: 0,
          zAxisId: 0,
          stackId: undefined,
          hide: false,
          barSize: undefined,
          minPointSize: 0,
          maxBarSize: undefined,
          hasCustomShape: false,
        },
      ];
      expectLastCalledWith(spy, expected);
    });
  });

  describe("legendType", () => {
    const allLegendTypesExceptNone: ReadonlyArray<LegendType> = [
      "circle",
      "cross",
      "diamond",
      "line",
      "plainline",
      "rect",
      "square",
      "star",
      "triangle",
      "wye",
    ];

    test.each(allLegendTypesExceptNone)("should render legendType %s", (legendType) => {
      const { container } = renderChart(() => (
        <ChartElement data={data}>
          <Bar dataKey="value" legendType={legendType} />
          <Legend />
        </ChartElement>
      ));

      const legendIcon = container.querySelectorAll(".recharts-legend-item-text");
      expect(legendIcon).toHaveLength(1);
    });

    it("should not render any legend if legendType = none", () => {
      const { container } = renderChart(() => (
        <ChartElement data={data}>
          <Bar dataKey="value" legendType="none" />
          <Legend />
        </ChartElement>
      ));

      const legendIcon = container.querySelectorAll(".recharts-legend-item-text");
      expect(legendIcon).toHaveLength(0);
    });
  });
});

describe.each(chartsThatDoNotSupportBar)("<Bar /> as a child of $testName", ({ ChartElement }) => {
  it("should not render anything", () => {
    const { container } = renderChart(() => (
      <ChartElement data={data}>
        <Bar isAnimationActive={false} dataKey="value" />
      </ChartElement>
    ));

    expect(container.querySelectorAll(".recharts-bar-rectangle")).toHaveLength(0);
  });
});

describe("mouse interactions in stacked bar: https://github.com/recharts/recharts/issues/5124", () => {
  beforeEach(() => {
    mockGetBoundingClientRect({ width: 100, height: 100 });
  });

  const stackedData = [{ x: 1, y: 2 }];

  const stackedBars = [
    {
      d: "M 14,65 h 72 v 30 h -72 Z",
      height: "30",
      radius: "0",
      width: "72",
      x: "14",
      y: "65",
    },
    {
      d: "M 14,5 h 72 v 60 h -72 Z",
      height: "60",
      radius: "0",
      width: "72",
      x: "14",
      y: "5",
    },
  ];

  describe("with Tooltip shared=true", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <BarChart data={stackedData} width={100} height={100}>
        <Bar activeBar dataKey="x" stackId="1" isAnimationActive={false} />
        <Bar activeBar dataKey="y" stackId="1" isAnimationActive={false} />
        <Tooltip shared isAnimationActive={false} />
        {props.children}
      </BarChart>
    ));

    it("should render two bars on the same index", () => {
      const { container } = renderTestCase();
      expectBars(container, stackedBars);
    });

    it("should render all bars inactive before user interaction", () => {
      const { container } = renderTestCase();
      const bars = getAllBars(container);
      expectActiveBars(container, []);
      expect(bars).toHaveLength(2);
    });

    it("should show tooltip when hovering over a chart", () => {
      const { container, spy } = renderTestCase(selectActiveTooltipIndex);
      expectLastCalledWith(spy, null);

      showTooltipOnCoordinate(container, barChartMouseHoverTooltipSelector, {
        clientX: 10,
        clientY: 10,
      });
      expectLastCalledWith(spy, "0");
      expectTooltipPayload(container, "0", ["x : 1", "y : 2"]);
    });

    it("should show tooltip somewhere close to the mouse cursor", () => {
      mockGetBoundingClientRect({
        width: 10,
        height: 10,
      });
      const { container } = renderTestCase();

      showTooltipOnCoordinate(container, barChartMouseHoverTooltipSelector, {
        clientX: 10,
        clientY: 10,
      });
      expectTooltipCoordinate(container, { x: 60, y: 20 });

      showTooltipOnCoordinate(container, barChartMouseHoverTooltipSelector, {
        clientX: 20,
        clientY: 20,
      });
      expectTooltipCoordinate(container, { x: 60, y: 30 });
    });

    it("should make both bars active when hovering over the chart", () => {
      const { container } = renderTestCase();

      expectActiveBars(container, []);

      showTooltipOnCoordinate(container, barChartMouseHoverTooltipSelector, {
        clientX: 10,
        clientY: 10,
      });
      vi.runOnlyPendingTimers();
      flush();

      expectActiveBars(container, stackedBars);
    });
  });

  describe("with Tooltip shared=false", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <BarChart data={stackedData} width={100} height={100}>
        <Bar activeBar dataKey="x" stackId="1" isAnimationActive={false} />
        <Bar activeBar dataKey="y" stackId="1" isAnimationActive={false} />
        <Tooltip shared={false} isAnimationActive={false} />
        {props.children}
      </BarChart>
    ));

    it("should render two bars on the same index", () => {
      const { container } = renderTestCase();
      expectBars(container, stackedBars);
    });

    it("should render all bars inactive before user interaction", () => {
      const { container } = renderTestCase();
      const bars = getAllBars(container);

      expectActiveBars(container, []);
      expect(bars).toHaveLength(2);
    });

    it("should show tooltip when hovering over a bar", () => {
      const { container, spy } = renderTestCase(selectActiveTooltipIndex);
      expectLastCalledWith(spy, null);

      const bars = getAllBars(container);
      showTooltipOnCoordinate(bars[0]!, undefined, { clientX: 10, clientY: 10 });
      expectLastCalledWith(spy, "0");
      expectTooltipPayload(container, "", ["x : 1"]);
    });

    it("should select tooltip axis ticks", () => {
      const { spy } = renderTestCase(selectTooltipAxisTicks);
      expectLastCalledWith(spy, [
        {
          coordinate: 50,
          index: 0,
          offset: 45,
          value: 0,
        },
      ]);
    });

    it("should update tooltip interaction state after mouse hover", () => {
      const { container, spy } = renderTestCase((state) => state.tooltip);
      const expectedStateBeforeHover: TooltipState = {
        axisInteraction: {
          click: noInteraction,
          hover: noInteraction,
        },
        itemInteraction: {
          click: noInteraction,
          hover: noInteraction,
        },
        keyboardInteraction: noInteraction,
        settings: {
          active: undefined,
          axisId: 0,
          defaultIndex: undefined,
          shared: false,
          trigger: "hover",
        },
        syncInteraction: {
          ...noInteraction,
          label: undefined,
          sourceViewBox: undefined,
        },
        tooltipItemPayloads: [
          {
            dataDefinedOnItem: undefined,
            getPosition: expect.any(Function),
            settings: {
              color: undefined,
              dataKey: "x",
              fill: undefined,
              graphicalItemId: expect.stringMatching(/^recharts-bar-.+/),
              hide: false,
              name: "x",
              nameKey: undefined,
              stroke: undefined,
              strokeWidth: undefined,
              type: undefined,
              unit: undefined,
            },
          },
          {
            dataDefinedOnItem: undefined,
            getPosition: expect.any(Function),
            settings: {
              color: undefined,
              dataKey: "y",
              fill: undefined,
              graphicalItemId: expect.stringMatching(/^recharts-bar-.+/),
              hide: false,
              name: "y",
              nameKey: undefined,
              stroke: undefined,
              strokeWidth: undefined,
              type: undefined,
              unit: undefined,
            },
          },
        ],
      };
      expectLastCalledWith(spy, expectedStateBeforeHover);

      const bars = getAllBars(container);
      showTooltipOnCoordinate(bars[0]!, undefined, { clientX: 10, clientY: 10 });

      const expectedStateAfterHover: TooltipState = {
        axisInteraction: {
          click: noInteraction,
          hover: noInteraction,
        },
        itemInteraction: {
          click: noInteraction,
          hover: {
            active: true,
            coordinate: {
              x: 50,
              y: 80,
            },
            dataKey: "x",
            index: "0",
            graphicalItemId: expect.stringMatching(/^recharts-bar-.+/),
          },
        },
        keyboardInteraction: noInteraction,
        settings: {
          active: undefined,
          axisId: 0,
          defaultIndex: undefined,
          shared: false,
          trigger: "hover",
        },
        syncInteraction: {
          ...noInteraction,
          label: undefined,
          sourceViewBox: undefined,
        },
        tooltipItemPayloads: [
          {
            dataDefinedOnItem: undefined,
            getPosition: expect.any(Function),
            settings: {
              color: undefined,
              dataKey: "x",
              fill: undefined,
              graphicalItemId: expect.stringMatching(/^recharts-bar-.+/),
              hide: false,
              name: "x",
              nameKey: undefined,
              stroke: undefined,
              strokeWidth: undefined,
              type: undefined,
              unit: undefined,
            },
          },
          {
            dataDefinedOnItem: undefined,
            getPosition: expect.any(Function),
            settings: {
              color: undefined,
              dataKey: "y",
              fill: undefined,
              graphicalItemId: expect.stringMatching(/^recharts-bar-.+/),
              hide: false,
              name: "y",
              nameKey: undefined,
              stroke: undefined,
              strokeWidth: undefined,
              type: undefined,
              unit: undefined,
            },
          },
        ],
      };
      expectLastCalledWith(spy, expectedStateAfterHover);
    });

    it("should show tooltip somewhere close to the mouse cursor", () => {
      mockGetBoundingClientRect({
        width: 10,
        height: 10,
      });
      const { container } = renderTestCase();

      const bars = getAllBars(container);
      showTooltipOnCoordinate(bars[0]!, undefined, { clientX: 10, clientY: 10 });
      expectTooltipCoordinate(container, { x: 60, y: 60 });

      showTooltipOnCoordinate(bars[0]!, undefined, { clientX: 20, clientY: 20 });
      /*
       * okay so it shows the tooltip at the same place as the last time, not the new mouse position
       * - fine, it's sticking to the item, not the mouse.
       */
      expectTooltipCoordinate(container, { x: 60, y: 60 });

      // let's hover over the second bar and check the coordinate again
      showTooltipOnCoordinate(bars[1]!, undefined, { clientX: 20, clientY: 20 });
      expectTooltipCoordinate(container, { x: 60, y: 45.00000000000001 });
    });

    it("should make the first bar active - but not the second one - when hovering over it", () => {
      const { container } = renderTestCase();
      const bars = getAllBars(container);
      expectActiveBars(container, []);

      showTooltipOnCoordinate(bars[0]!, undefined, { clientX: 10, clientY: 10 });
      expectActiveBars(container, [stackedBars[0]!]);
    });
  });
});

describe("Bar events", () => {
  it("should fire onClick event when clicking on a bar", () => {
    const handleClick = vi.fn();
    const { container } = renderChart(() => (
      <BarChart width={200} height={200} layout="horizontal" data={data}>
        <Bar isAnimationActive={false} dataKey="value" onClick={handleClick} />
      </BarChart>
    ));

    const bars = getAllBars(container);
    const index = 1;
    fireEvent.click(bars[index]!);
    expect(handleClick).toHaveBeenCalledTimes(1);
    expectLastCalledWith(
      handleClick,
      expect.objectContaining({
        label: "test2",
        originalDataIndex: 1,
        value: 200,
        payload: expect.objectContaining({ label: "test2", value: 200 }),
      }),
      index,
      expect.any(Object),
    );
  });

  it("should fire onMouseOver and onMouseOut events when hovering over a bar", () => {
    const handleMouseOver = vi.fn();
    const handleMouseOut = vi.fn();

    const { container } = renderChart(() => (
      <BarChart width={200} height={200} layout="horizontal" data={data}>
        <Bar
          isAnimationActive={false}
          dataKey="value"
          onMouseOver={handleMouseOver}
          onMouseOut={handleMouseOut}
        />
      </BarChart>
    ));

    const bars = getAllBars(container);
    fireEvent.mouseOver(bars[1]!);
    expect(handleMouseOver).toHaveBeenCalledTimes(1);
    expectLastCalledWith(
      handleMouseOver,
      expect.objectContaining({ label: "test2", originalDataIndex: 1, value: 200 }),
      1,
      expect.any(Object),
    );

    fireEvent.mouseOut(bars[1]!);
    expect(handleMouseOut).toHaveBeenCalledTimes(1);
    expectLastCalledWith(
      handleMouseOut,
      expect.objectContaining({ label: "test2", originalDataIndex: 1, value: 200 }),
      1,
      expect.any(Object),
    );
  });

  it("should fire onTouchMove and onTouchEnd events when touching a bar", () => {
    const handleTouchMove = vi.fn();
    const handleTouchEnd = vi.fn();

    const { container } = renderChart(() => (
      <BarChart width={200} height={200} layout="horizontal" data={data} throttledEvents={[]}>
        <Bar
          isAnimationActive={false}
          dataKey="value"
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        />
      </BarChart>
    ));

    const bars = getAllBars(container);
    fireEvent.touchMove(bars[0]!, { touches: [{ clientX: 200, clientY: 200 }] });
    expect(handleTouchMove).toHaveBeenCalledTimes(1);
    expectLastCalledWith(
      handleTouchMove,
      expect.objectContaining({ label: "test1", originalDataIndex: 0, value: 100 }),
      0,
      expect.any(Object),
    );
  });
});

describe("Bar background zIndex", () => {
  const composedDataWithBackground = [
    {
      x: 10,
      y: 50,
      width: 20,
      height: 20,
      value: 40,
      label: "test",
      background: { x: 10, y: 50, width: 20, height: 50 },
    },
    {
      x: 50,
      y: 50,
      width: 20,
      height: 50,
      value: 100,
      label: "test",
      background: { x: 50, y: 50, width: 20, height: 50 },
    },
  ];

  it("should use default barBackground zIndex when background prop is true", () => {
    const { container } = renderChart(() => (
      <BarChart width={500} height={300} data={composedDataWithBackground}>
        <Bar background isAnimationActive={false} dataKey="value" />
      </BarChart>
    ));

    const backgroundRects = container.querySelectorAll(".recharts-bar-background-rectangle");
    expect(backgroundRects).toHaveLength(composedDataWithBackground.length);
    const bars = container.querySelectorAll(".recharts-bar-rectangle");
    assertZIndexLayerOrder({ front: bars[0]!, back: backgroundRects[0]! });
  });

  it("should use default barBackground zIndex when background prop is an object without zIndex", () => {
    const { container } = renderChart(() => (
      <BarChart width={500} height={300} data={composedDataWithBackground}>
        <Bar background={{ fill: "#eee" }} isAnimationActive={false} dataKey="value" />
      </BarChart>
    ));

    const backgroundRects = container.querySelectorAll(".recharts-bar-background-rectangle");
    expect(backgroundRects).toHaveLength(composedDataWithBackground.length);
    const bars = container.querySelectorAll(".recharts-bar-rectangle");
    assertZIndexLayerOrder({ front: bars[0]!, back: backgroundRects[0]! });
  });

  it("should use custom zIndex when background prop is an object with zIndex", () => {
    const customZIndex = DefaultZIndexes.bar + 1;
    const { container } = renderChart(() => (
      <BarChart width={500} height={300} data={composedDataWithBackground}>
        <Bar
          background={{ fill: "#eee", zIndex: customZIndex }}
          isAnimationActive={false}
          dataKey="value"
        />
      </BarChart>
    ));
    flush();

    const bars = container.querySelectorAll(".recharts-bar-rectangle");
    const backgroundRects = container.querySelectorAll(".recharts-bar-background-rectangle");
    assertZIndexLayerOrder({ back: bars[0]!, front: backgroundRects[0]! });
  });

  it("should handle background prop with zIndex as 0", () => {
    const { container } = renderChart(() => (
      <BarChart width={500} height={300} data={composedDataWithBackground}>
        <Bar background={{ fill: "#eee", zIndex: 0 }} isAnimationActive={false} dataKey="value" />
      </BarChart>
    ));

    const bars = container.querySelectorAll(".recharts-bar-rectangle");
    const backgroundRects = container.querySelectorAll(".recharts-bar-background-rectangle");
    assertZIndexLayerOrder({ front: bars[0]!, back: backgroundRects[0]! });
  });

  it("should handle negative zIndex values in background prop", () => {
    const { container } = renderChart(() => (
      <BarChart width={500} height={300} data={composedDataWithBackground}>
        <Bar
          background={{ fill: "#eee", zIndex: -200 }}
          isAnimationActive={false}
          dataKey="value"
        />
      </BarChart>
    ));
    flush();

    const backgroundRects = container.querySelectorAll(".recharts-bar-background-rectangle");
    const bars = container.querySelectorAll(".recharts-bar-rectangle");
    assertZIndexLayerOrder({ front: bars[0]!, back: backgroundRects[0]! });
  });

  it("should ignore non-number zIndex values in background prop", () => {
    const { container } = renderChart(() => (
      <BarChart width={500} height={300} data={composedDataWithBackground}>
        <Bar
          background={
            { fill: "#eee", zIndex: "1100" } as unknown as BarProps["background"] & {
              zIndex: string;
            }
          }
          isAnimationActive={false}
          dataKey="value"
        />
      </BarChart>
    ));

    const backgroundRects = container.querySelectorAll(".recharts-bar-background-rectangle");
    const bars = container.querySelectorAll(".recharts-bar-rectangle");
    assertZIndexLayerOrder({ front: bars[0]!, back: backgroundRects[0]! });
  });

  it("should handle background prop when it is a function", () => {
    const backgroundComponent = () => <rect class="custom-background" />;
    const { container } = renderChart(() => (
      <BarChart width={500} height={300} data={composedDataWithBackground}>
        <Bar background={backgroundComponent} isAnimationActive={false} dataKey="value" />
      </BarChart>
    ));

    const customBackgrounds = container.querySelectorAll(".custom-background");
    expect(customBackgrounds).toHaveLength(composedDataWithBackground.length);
    const bars = container.querySelectorAll(".recharts-bar-rectangle");
    assertZIndexLayerOrder({ front: bars[0]!, back: customBackgrounds[0]! });
  });
});

describe("activeBar with missing data", () => {
  beforeEach(() => {
    mockGetBoundingClientRect({ width: 500, height: 300 });
  });

  it("should highlight the correct bar when data has null values", () => {
    const dataWithMissingValues = [
      { name: "Page A", uv: 2400, pv: 4000 },
      { name: "Page B", uv: null, pv: null },
      { name: "Page C", uv: 9800, pv: 2000 },
      { name: "Page D", uv: null, pv: null },
      { name: "Page E", uv: 4800, pv: 1890 },
    ];

    const renderTestCase = createSelectorTestCase((props) => (
      <BarChart data={dataWithMissingValues} width={500} height={300}>
        <XAxis dataKey="name" />
        <YAxis />
        <Bar activeBar dataKey="uv" isAnimationActive={false} />
        <Tooltip isAnimationActive={false} />
        {props.children}
      </BarChart>
    ));

    const { container, spy } = renderTestCase(selectActiveTooltipIndex);

    expectActiveBars(container, []);
    expectLastCalledWith(spy, null);

    const allBars = getAllBars(container);
    expect(allBars).toHaveLength(3);

    showTooltipOnCoordinate(container, barChartMouseHoverTooltipSelector, {
      clientX: 450,
      clientY: 150,
    });

    expectLastCalledWith(spy, "4");

    vi.runOnlyPendingTimers();
    flush();

    const activeBars = container.querySelectorAll(".recharts-active-bar");
    expect(activeBars).toHaveLength(1);

    expectTooltipPayload(container, "Page E", ["uv : 4800"]);
  });

  it("should highlight the correct bar when hovering over middle bar with surrounding nulls", () => {
    const dataWithMissingValues = [
      { name: "Page A", uv: 2400 },
      { name: "Page B", uv: null },
      { name: "Page C", uv: 9800 },
      { name: "Page D", uv: null },
      { name: "Page E", uv: 4800 },
    ];

    const renderTestCase = createSelectorTestCase((props) => (
      <BarChart data={dataWithMissingValues} width={500} height={300}>
        <XAxis dataKey="name" />
        <YAxis />
        <Bar activeBar dataKey="uv" isAnimationActive={false} />
        <Tooltip isAnimationActive={false} />
        {props.children}
      </BarChart>
    ));

    const { container, spy } = renderTestCase(selectActiveTooltipIndex);

    showTooltipOnCoordinate(container, barChartMouseHoverTooltipSelector, {
      clientX: 250,
      clientY: 150,
    });

    expectLastCalledWith(spy, "2");

    vi.runOnlyPendingTimers();
    flush();

    const activeBars = container.querySelectorAll(".recharts-active-bar");
    expect(activeBars).toHaveLength(1);

    expectTooltipPayload(container, "Page C", ["uv : 9800"]);
  });
});

describe("Bar background disabled", () => {
  const composedDataWithBackground = [
    {
      x: 10,
      y: 50,
      width: 20,
      height: 20,
      value: 40,
      label: "test",
      background: { x: 10, y: 50, width: 20, height: 50 },
    },
    {
      x: 50,
      y: 50,
      width: 20,
      height: 50,
      value: 100,
      label: "test",
      background: { x: 50, y: 50, width: 20, height: 50 },
    },
  ];

  it.each([null, false, undefined] as const)(
    "should not render any background elements when background=%s",
    (background) => {
      const { container } = renderChart(() => (
        <BarChart width={500} height={300} data={composedDataWithBackground}>
          <Bar
            background={background as BarProps["background"]}
            isAnimationActive={false}
            dataKey="value"
          />
        </BarChart>
      ));

      const backgroundRects = container.querySelectorAll(".recharts-bar-background-rectangle");
      expect(backgroundRects).toHaveLength(0);
    },
  );
});
