import { describe, it, expect, beforeEach } from "vitest";
import { createSelectorTestCase } from "../../helper/createSelectorTestCase";
import { ComposedChart, Legend, Line, Tooltip, XAxis, YAxis } from "../../../src";
import {
  selectAxisScale,
  selectCartesianGraphicalItemsData,
  selectDisplayedData,
} from "../../../src/state/selectors/axisSelectors";
import { mockGetBoundingClientRect } from "../../helper/mockGetBoundingClientRect";
import { expectLastCalledWith } from "../../helper/expectLastCalledWith";
import { expectLastCalledWithScale } from "../../helper/expectScale";
import { assertNotNull } from "../../helper/assertNotNull";

/*
 * Ported from recharts 3.8.1 test/component/Tooltip/Tooltip.multipleDataArrays.spec.tsx
 * (reproducing https://github.com/recharts/recharts/issues/3044 — two <Line>s each
 * with their own `data`). Ported the robust, soup-free selector value assertions
 * (combined item data, displayed data, golden scale + scale.map). Omitted: the
 * activeTooltipDataPoints/active-index tests (this port names the selector
 * differently — selectActiveIndex with explicit args), `expectLines` (helper not
 * ported), and the `toBeRechartsScale` custom matcher (use expectLastCalledWithScale).
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
        <Line dataKey="y1" data={data1} />
        <Line dataKey="y2" data={data2} />
        {props.children}
      </ComposedChart>
    ));

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
  });
});
