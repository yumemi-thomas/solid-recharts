import { describe, it, expect, beforeEach } from "vitest";
import { createSelectorTestCase } from "../../helper/createSelectorTestCase";
import { ComposedChart, Legend, Line, Tooltip, XAxis, YAxis } from "../../../src";
import {
  selectAxisScale,
  selectCartesianGraphicalItemsData,
  selectDisplayedData,
} from "../../../src/state/selectors/axisSelectors";
import { selectActiveTooltipIndex } from "../../../src/state/selectors/tooltipSelectors";
import { showTooltipOnCoordinate } from "./tooltipTestHelpers";
import { composedChartMouseHoverTooltipSelector } from "./tooltipMouseHoverSelectors";
import { mockGetBoundingClientRect } from "../../helper/mockGetBoundingClientRect";
import { expectLastCalledWith } from "../../helper/expectLastCalledWith";
import { expectLastCalledWithScale } from "../../helper/expectScale";
import { expectLines } from "../../helper/expectLine";
import { assertNotNull } from "../../helper/assertNotNull";

/*
 * Ported from recharts 3.8.1 test/component/Tooltip/Tooltip.multipleDataArrays.spec.tsx
 * (reproducing https://github.com/recharts/recharts/issues/3044 — two <Line>s each
 * with their own `data`). Ported the robust, soup-free selector value assertions
 * (combined item data, displayed data, golden scale + scale.map) plus the
 * active-index hover/defaultIndex tests. Solid deviations: selectors return
 * Accessors spied via createSelectorTestCase, so exact React render-count
 * assertions (toHaveBeenCalledTimes) are relaxed to value parity
 * (expectLastCalledWith); the `toBeRechartsScale` custom matcher is replaced by
 * expectLastCalledWithScale. Omitted: `should select activeTooltipDataPoints` —
 * its load-bearing by-reference identity assertion (data points must be `===` the
 * original input rows, which recharts' Redux store preserves) cannot hold in this
 * port because state flows through Solid store proxies, not plain objects.
 */

describe("Tooltip in chart with multiple data arrays", () => {
  beforeEach(() => {
    mockGetBoundingClientRect({ width: 100, height: 100 });
  });

  const data1 = [
    { xAxis: 10, y1: 4 },
    { xAxis: 20, y1: 10 },
    { xAxis: 30, y1: 6 },
    { xAxis: 40, y1: 8 },
  ];

  const data2 = [
    { xAxis: 5, y2: 9 },
    { xAxis: 12, y2: 7 },
    { xAxis: 13, y2: 8 },
    { xAxis: 18, y2: 12 },
    { xAxis: 25, y2: 12 },
    { xAxis: 30, y2: 12 },
  ];

  describe("with default props", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <ComposedChart width={500} height={300}>
        <XAxis dataKey="xAxis" type="number" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line dataKey="y1" data={data1} isAnimationActive={false} />
        <Line dataKey="y2" data={data2} isAnimationActive={false} />
        {props.children}
      </ComposedChart>
    ));

    it("should render two lines", () => {
      const { container } = renderTestCase();
      expectLines(container, [
        { d: "M172.5,111.667L280,31.667L387.5,85L495,58.333" },
        { d: "M118.75,45L194,71.667L204.75,58.333L258.5,5L333.75,5L387.5,5" },
      ]);
    });

    it("should select individual items data", () => {
      const { spy } = renderTestCase((state) =>
        selectCartesianGraphicalItemsData(state, "xAxis", 0),
      );

      expectLastCalledWith(spy, [
        { xAxis: 10, y1: 4 },
        { xAxis: 20, y1: 10 },
        { xAxis: 30, y1: 6 },
        { xAxis: 40, y1: 8 },
        { xAxis: 5, y2: 9 },
        { xAxis: 12, y2: 7 },
        { xAxis: 13, y2: 8 },
        { xAxis: 18, y2: 12 },
        { xAxis: 25, y2: 12 },
        { xAxis: 30, y2: 12 },
      ]);
    });

    it("should select displayed data", () => {
      const { spy } = renderTestCase((state) => selectDisplayedData(state, "xAxis", 0, false));

      expectLastCalledWith(spy, [
        { xAxis: 10, y1: 4 },
        { xAxis: 20, y1: 10 },
        { xAxis: 30, y1: 6 },
        { xAxis: 40, y1: 8 },
        { xAxis: 5, y2: 9 },
        { xAxis: 12, y2: 7 },
        { xAxis: 13, y2: 8 },
        { xAxis: 18, y2: 12 },
        { xAxis: 25, y2: 12 },
        { xAxis: 30, y2: 12 },
      ]);
    });

    it("should select scale", () => {
      const { spy } = renderTestCase((state) => selectAxisScale(state, "xAxis", 0, false));

      expectLastCalledWithScale(spy, { domain: [0, 40], range: [65, 495] });
      const scale = spy.mock.lastCall?.[0];
      assertNotNull(scale);
      expect(scale.map(5)).toBe(118.75);
      expect(scale.map(30)).toBe(387.5);
      expect(scale.map(40)).toBe(495);
    });

    it("should highlight the first dot when hovering the first xaxis tick", () => {
      const { container, spy } = renderTestCase(selectActiveTooltipIndex);
      expectLastCalledWith(spy, null);

      showTooltipOnCoordinate(container, composedChartMouseHoverTooltipSelector, {
        clientX: 118.75,
        clientY: 100,
      });
      // this is 4 because the tick is at xAxis=5 which is the fifth point in the displayedData array
      expectLastCalledWith(spy, "4");
    });

    it("should highlight the last dot when hovering the last xaxis tick", () => {
      const { container, spy } = renderTestCase(selectActiveTooltipIndex);
      expectLastCalledWith(spy, null);

      showTooltipOnCoordinate(container, composedChartMouseHoverTooltipSelector, {
        clientX: 495,
        clientY: 100,
      });
      // this is 3 because the tick is at xAxis=40 which is the fourth point in the displayedData array
      expectLastCalledWith(spy, "3");
    });
  });

  describe("with defaultIndex=0", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <ComposedChart width={500} height={300}>
        <XAxis dataKey="xAxis" type="number" />
        <YAxis />
        <Tooltip defaultIndex={0} />
        <Legend />
        <Line dataKey="y1" data={data1} isAnimationActive={false} />
        <Line dataKey="y2" data={data2} isAnimationActive={false} />
        {props.children}
      </ComposedChart>
    ));

    it("should highlight the first dot", () => {
      const { spy } = renderTestCase(selectActiveTooltipIndex);
      expectLastCalledWith(spy, "0");
    });
  });
});
