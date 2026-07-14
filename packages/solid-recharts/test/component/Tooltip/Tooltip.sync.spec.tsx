import { beforeEach, describe, expect, it, test } from "vitest";

import { createRechartsStore } from "../../../src/state/store";
import {
  selectActiveCoordinate,
  selectActiveIndex,
  selectIsTooltipActive,
} from "../../../src/state/selectors/tooltipSelectors";
import type { JSX } from "solid-js";
import {
  Area,
  AreaChart,
  BarChart,
  Bar,
  ComposedChart,
  LineChart,
  Line,
  Tooltip,
  XAxis,
  YAxis,
} from "../../../src";
import { PageData } from "../../_data";
import {
  createSelectorTestCase,
  createSynchronisedSelectorTestCase,
} from "../../helper/createSelectorTestCase";
import {
  expectTooltipNotVisible,
  expectTooltipPayload,
  getTooltip,
  hideTooltip,
  showTooltip,
} from "./tooltipTestHelpers";
import {
  areaChartMouseHoverTooltipSelector,
  barChartMouseHoverTooltipSelector,
  composedChartMouseHoverTooltipSelector,
  lineChartMouseHoverTooltipSelector,
} from "./tooltipMouseHoverSelectors";
import { mockGetBoundingClientRect } from "../../helper/mockGetBoundingClientRect";
import { assertNotNull } from "../../helper/assertNotNull";
import { selectSyncId, selectSyncMethod } from "../../../src/state/selectors/rootPropsSelectors";
import { expectLastCalledWith } from "../../helper/expectLastCalledWith";

/*
 * Ported from recharts 3.8.1 test/component/Tooltip/Tooltip.sync.spec.tsx.
 *
 * The pure-store selector cases (`selectActiveCoordinate`/`selectIsTooltipActive`/
 * `selectActiveIndex`) drive a bare `createRechartsStore()`. The CROSS-CHART
 * synchronisation cases (two charts sharing a `syncId`) are now ported on top of
 * the Solid-native sync registry (src/synchronisation/syncRegistry.ts +
 * useChartSynchronisation.tsx). The full vendored spec covers every chart family
 * × syncMethod permutation (2000+ lines); this port covers the representative
 * mechanism cases: index-sync receipt/visibility, value-sync label matching, and
 * the syncId/syncMethod state wiring.
 *
 * Solid adaptations:
 *  - Redux `store.dispatch(actionCreator(payload))` -> Solid slice action
 *    `store.actions.tooltip.<fn>(payload)` + `flush()` (store writes are batched).
 *  - `store.getState()` -> `store.state`.
 *  - tooltip selector exports live in `state/selectors/tooltipSelectors`.
 *  - the receiving chart updates through the module-level `syncEventCenter`
 *    (no mitt) — emission happens from a Solid effect on the emitting Tooltip.
 */

describe("Tooltip synchronization", () => {
  describe("selectActiveCoordinate", () => {
    it("should return undefined for initial state", () => {
      const store = createRechartsStore();
      const actual = selectActiveCoordinate(store.state, "axis", "hover", undefined);
      expect(actual).toEqual(undefined);
    });

    it("should return coordinate after mouseMoveAction", () => {
      const store = createRechartsStore();
      store.actions.tooltip.setMouseOverAxisIndex({
        activeCoordinate: { x: 3, y: 4 },
        activeDataKey: "uv",
        activeIndex: "1",
      });
      const actual = selectActiveCoordinate(store.state, "axis", "hover", undefined);
      expect(actual).toEqual({ x: 3, y: 4 });
    });

    it("should return coordinate after setSyncInteraction", () => {
      const store = createRechartsStore();
      store.actions.tooltip.setSyncInteraction({
        active: true,
        coordinate: { x: 5, y: 6 },
        dataKey: "uv",
        index: "1",
        label: "Page B",
        sourceViewBox: { x: 0, y: 0, width: 100, height: 100 },
        graphicalItemId: undefined,
      });
      const actual = selectActiveCoordinate(store.state, "axis", "hover", undefined);
      expect(actual).toEqual({ x: 5, y: 6 });
    });
  });

  describe("selectIsTooltipActive", () => {
    it("should return false for initial state", () => {
      const store = createRechartsStore();
      const actual = selectIsTooltipActive(store.state, "axis", "hover", undefined);
      expect(actual).toEqual({
        activeIndex: null,
        isActive: false,
      });
    });

    it("should return true after mouseMoveAction", () => {
      const store = createRechartsStore();
      store.actions.tooltip.setMouseOverAxisIndex({
        activeCoordinate: { x: 0, y: 0 },
        activeDataKey: "uv",
        activeIndex: "1",
      });
      const actual = selectIsTooltipActive(store.state, "axis", "hover", undefined);
      expect(actual).toEqual({
        activeIndex: "1",
        isActive: true,
      });
    });

    it("should return true after setSyncInteraction", () => {
      const store = createRechartsStore();
      store.actions.tooltip.setSyncInteraction({
        active: true,
        dataKey: "uv",
        index: "1",
        label: "Page B",
        coordinate: { x: 0, y: 0 },
        sourceViewBox: { x: 0, y: 0, width: 100, height: 100 },
        graphicalItemId: undefined,
      });
      const actual = selectIsTooltipActive(store.state, "axis", "hover", undefined);
      expect(actual).toEqual({
        activeIndex: "1",
        isActive: true,
      });
    });
  });

  describe("selectActiveIndex", () => {
    it("should return null for initial state", () => {
      const store = createRechartsStore();
      const actual = selectActiveIndex(store.state, "axis", "hover", undefined);
      expect(actual).toEqual(null);
    });

    it("should return index after mouseMoveAction", () => {
      const store = createRechartsStore();
      store.actions.tooltip.setMouseOverAxisIndex({
        activeCoordinate: { x: 0, y: 0 },
        activeDataKey: "uv",
        activeIndex: "1",
      });
      const actual = selectActiveIndex(store.state, "axis", "hover", undefined);
      expect(actual).toEqual("1");
    });

    it("should return index after setSyncInteraction", () => {
      const store = createRechartsStore();
      store.actions.tooltip.setSyncInteraction({
        active: true,
        dataKey: "uv",
        index: "2",
        label: "Page B",
        coordinate: { x: 0, y: 0 },
        sourceViewBox: { x: 0, y: 0, width: 100, height: 100 },
        graphicalItemId: undefined,
      });
      const actual = selectActiveIndex(store.state, "axis", "hover", undefined);
      expect(actual).toEqual("2");
    });
  });

  // -------------------------------------------------------------------------
  // Cross-chart synchronisation (syncId / syncMethod) — driven by the Solid
  // -native sync registry. One chart's hover updates the other's tooltip.
  // -------------------------------------------------------------------------
  describe("cross-chart synchronisation", () => {
    beforeEach(() => {
      mockGetBoundingClientRect({ width: 100, height: 100 });
    });

    describe("syncMethod=index (default)", () => {
      const renderTestCase = createSelectorTestCase((props) => (
        <>
          <div id="chartOne">
            <BarChart width={400} height={400} data={PageData} syncId="tooltipSync">
              <Bar dataKey="uv" />
              <Tooltip />
              {props.children}
            </BarChart>
          </div>
          <div id="chartTwo">
            <BarChart width={400} height={400} data={PageData} syncId="tooltipSync">
              <Bar dataKey="pv" />
              <Tooltip />
            </BarChart>
          </div>
        </>
      ));

      test("hovering one chart shows the synchronised tooltip on the other", () => {
        const { container } = renderTestCase();
        const wrapperOne = container.querySelector("#chartOne");
        assertNotNull(wrapperOne);
        const wrapperTwo = container.querySelector("#chartTwo");
        assertNotNull(wrapperTwo);

        // Hovering chart one should make chart two show its tooltip too.
        showTooltip(wrapperOne, barChartMouseHoverTooltipSelector);

        const tooltipTwo = getTooltip(wrapperTwo);
        expect(tooltipTwo).toBeVisible();

        // And it hides on both when the source leaves.
        hideTooltip(wrapperOne, barChartMouseHoverTooltipSelector);
        expectTooltipNotVisible(wrapperOne);
        expectTooltipNotVisible(wrapperTwo);
      });

      test("should put the syncId into the state", () => {
        const { spy } = renderTestCase(selectSyncId);
        expectLastCalledWith(spy, "tooltipSync");
      });

      test("should select the default syncMethod", () => {
        const { spy } = renderTestCase(selectSyncMethod);
        expectLastCalledWith(spy, "index");
      });
    });

    describe("when syncMethod=value on the receiving chart", () => {
      const data1 = [
        { name: "Page A", uv: 300 },
        { name: "Page B", uv: 400 },
        { name: "Page C", uv: 500 },
        { name: "Page D", uv: 600 },
        { name: "Page E", uv: 700 },
        { name: "Page F", uv: 800 },
      ];

      const data2 = [
        { name: "Page F", pv: 1800 },
        { name: "Page E", pv: 1700 },
        { name: "Page D", pv: 1600 },
        { name: "Page C", pv: 1500 },
        { name: "Page B", pv: 1400 },
        { name: "Page A", pv: 1300 },
      ];

      const renderTestCase = createSynchronisedSelectorTestCase(
        (props) => (
          <LineChart syncId="tooltipSync" data={data1} width={400} height={400}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            {props.children}
            <Line type="monotone" dataKey="uv" stroke="#8884d8" />
          </LineChart>
        ),
        (props) => (
          <LineChart syncId="tooltipSync" syncMethod="value" data={data2} width={400} height={400}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            {props.children}
            <Line type="monotone" dataKey="pv" stroke="#82ca9d" />
          </LineChart>
        ),
      );

      test("synchronises by the tooltip LABEL, not by data index", () => {
        const { wrapperA, wrapperB } = renderTestCase();

        expectTooltipNotVisible(wrapperA);
        expectTooltipNotVisible(wrapperB);

        showTooltip(wrapperA, lineChartMouseHoverTooltipSelector);

        // The source hovers "Page C"; the receiving chart (reversed data) must
        // match by label → Page C → pv 1500, NOT the same array index.
        expectTooltipPayload(wrapperA, "Page C", ["uv : 500"]);
        expectTooltipPayload(wrapperB, "Page C", ["pv : 1500"]);

        hideTooltip(wrapperA, lineChartMouseHoverTooltipSelector);

        expectTooltipNotVisible(wrapperA);
        expectTooltipNotVisible(wrapperB);
      });
    });
  });
});

/*
 * Coordinate-bounding under index synchronisation: hovering one chart and reading
 * the synced active coordinate on the other must stay within that chart's
 * container bounds. PERMANENT-N/A from the vendored block: the
 * `should scale ... proportionally` cases assert exact recharts forward/reverse
 * ratios (host-coupled pixel scaling), and the radial families (`syncDisabled`)
 * don't sync a cartesian coordinate.
 */
describe("Tooltip coordinate bounding in synchronization", () => {
  beforeEach(() => {
    mockGetBoundingClientRect({ width: 100, height: 100 });
  });

  type ChildrenProps = { children?: JSX.Element };

  describe.each([
    {
      name: "LineChart to LineChart",
      SmallChart: (props: ChildrenProps) => (
        <LineChart syncId="boundingTest" data={PageData} width={200} height={200}>
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Line dataKey="uv" />
          {props.children}
        </LineChart>
      ),
      LargeChart: (props: ChildrenProps) => (
        <LineChart syncId="boundingTest" data={PageData} width={600} height={400}>
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Line dataKey="pv" />
          {props.children}
        </LineChart>
      ),
      mouseHoverSelector: lineChartMouseHoverTooltipSelector,
    },
    {
      name: "AreaChart to AreaChart",
      SmallChart: (props: ChildrenProps) => (
        <AreaChart syncId="boundingTest" data={PageData} width={200} height={200}>
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Area dataKey="uv" />
          {props.children}
        </AreaChart>
      ),
      LargeChart: (props: ChildrenProps) => (
        <AreaChart syncId="boundingTest" data={PageData} width={600} height={400}>
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Area dataKey="pv" />
          {props.children}
        </AreaChart>
      ),
      mouseHoverSelector: areaChartMouseHoverTooltipSelector,
    },
    {
      name: "BarChart to BarChart",
      SmallChart: (props: ChildrenProps) => (
        <BarChart syncId="boundingTest" data={PageData} width={200} height={200}>
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="uv" />
          {props.children}
        </BarChart>
      ),
      LargeChart: (props: ChildrenProps) => (
        <BarChart syncId="boundingTest" data={PageData} width={600} height={400}>
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="pv" />
          {props.children}
        </BarChart>
      ),
      mouseHoverSelector: barChartMouseHoverTooltipSelector,
    },
    {
      name: "ComposedChart to ComposedChart",
      SmallChart: (props: ChildrenProps) => (
        <ComposedChart syncId="boundingTest" data={PageData} width={200} height={200}>
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Line dataKey="uv" />
          {props.children}
        </ComposedChart>
      ),
      LargeChart: (props: ChildrenProps) => (
        <ComposedChart syncId="boundingTest" data={PageData} width={600} height={400}>
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Line dataKey="pv" />
          {props.children}
        </ComposedChart>
      ),
      mouseHoverSelector: composedChartMouseHoverTooltipSelector,
    },
  ])(
    "when using syncMethod=index with different chart dimensions: $name",
    ({ SmallChart, LargeChart, mouseHoverSelector }) => {
      const renderBoundingTestCase = createSynchronisedSelectorTestCase(SmallChart, LargeChart);

      it("should bound coordinates within chart container when x exceeds maxX", () => {
        const { wrapperB, spyA, spyB } = renderBoundingTestCase((state) =>
          selectActiveCoordinate(state, "axis", "hover", undefined),
        );

        expect(spyA).toHaveBeenLastCalledWith(undefined);
        expect(spyB).toHaveBeenLastCalledWith(undefined);

        showTooltip(wrapperB, mouseHoverSelector);

        expect(spyA).toHaveBeenCalled();
        const lastCallA = spyA.mock.lastCall?.[0];

        assertNotNull(lastCallA);
        expect(typeof lastCallA).toBe("object");
        expect(lastCallA).toHaveProperty("x");
        expect(lastCallA.x).toBeLessThanOrEqual(200);
        expect(lastCallA.x).toBeGreaterThanOrEqual(0);
      });

      it("should preserve coordinate properties while bounding x and y", () => {
        const { wrapperB, spyA, spyB } = renderBoundingTestCase((state) =>
          selectActiveCoordinate(state, "axis", "hover", undefined),
        );

        showTooltip(wrapperB, mouseHoverSelector);

        expect(spyA).toHaveBeenCalled();
        expect(spyB).toHaveBeenCalled();

        const lastCallA = spyA.mock.lastCall?.[0];
        const lastCallB = spyB.mock.lastCall?.[0];

        assertNotNull(lastCallA);
        expect(lastCallA).toHaveProperty("x");
        expect(lastCallA).toHaveProperty("y");
        expect(lastCallA.x).toBeLessThanOrEqual(200);
        expect(lastCallA.y).toBeLessThanOrEqual(200);
        expect(lastCallA.x).toBeGreaterThanOrEqual(0);
        expect(lastCallA.y).toBeGreaterThanOrEqual(0);

        assertNotNull(lastCallB);
        expect(lastCallB).toHaveProperty("x");
        expect(lastCallB).toHaveProperty("y");
        expect(lastCallB.x).toBeLessThanOrEqual(600);
        expect(lastCallB.y).toBeLessThanOrEqual(400);
      });

      it("should not modify coordinates when they are within bounds", () => {
        const { wrapperA, spyA, spyB } = renderBoundingTestCase((state) =>
          selectActiveCoordinate(state, "axis", "hover", undefined),
        );

        showTooltip(wrapperA, mouseHoverSelector);

        expect(spyA.mock.calls.length).toBeGreaterThan(0);
        expect(spyB.mock.calls.length).toBeGreaterThan(0);
      });
    },
  );

  // Cross-chart-type synchronisation: the synced coordinate forwarded to a chart
  // of a DIFFERENT type/size must still bound to the receiving chart's container.
  // PERMANENT-N/A: the radial cross-type cases (to/from Radar/RadialBar) don't
  // forward a cartesian coordinate, so there's no bounded coordinate to assert.
  describe("cross-chart type synchronization", () => {
    type ChildrenProps = { children?: JSX.Element };

    it("should bound coordinates when synchronizing from AreaChart to LineChart", () => {
      const renderTestCase = createSynchronisedSelectorTestCase(
        (props: ChildrenProps) => (
          <LineChart syncId="areaToLineTest" data={PageData} width={200} height={150}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Line dataKey="uv" />
            {props.children}
          </LineChart>
        ),
        (props: ChildrenProps) => (
          <AreaChart syncId="areaToLineTest" data={PageData} width={400} height={300}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Area dataKey="pv" />
            {props.children}
          </AreaChart>
        ),
      );

      const { wrapperB, spyA } = renderTestCase((state) =>
        selectActiveCoordinate(state, "axis", "hover", undefined),
      );

      showTooltip(wrapperB, areaChartMouseHoverTooltipSelector);

      expect(spyA).toHaveBeenCalled();
      const lastCallA = spyA.mock.lastCall?.[0];
      assertNotNull(lastCallA);
      expect(lastCallA).toHaveProperty("x");
      expect(lastCallA).toHaveProperty("y");
      expect(lastCallA.x).toBeLessThanOrEqual(200);
      expect(lastCallA.x).toBeGreaterThanOrEqual(0);
      expect(lastCallA.y).toBeLessThanOrEqual(150);
      expect(lastCallA.y).toBeGreaterThanOrEqual(0);
    });

    it("should bound coordinates when synchronizing from LineChart to AreaChart", () => {
      const renderTestCase = createSynchronisedSelectorTestCase(
        (props: ChildrenProps) => (
          <AreaChart syncId="lineToAreaTest" data={PageData} width={300} height={200}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Area dataKey="uv" />
            {props.children}
          </AreaChart>
        ),
        (props: ChildrenProps) => (
          <LineChart syncId="lineToAreaTest" data={PageData} width={500} height={350}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Line dataKey="pv" />
            {props.children}
          </LineChart>
        ),
      );

      const { wrapperB, spyA } = renderTestCase((state) =>
        selectActiveCoordinate(state, "axis", "hover", undefined),
      );

      showTooltip(wrapperB, lineChartMouseHoverTooltipSelector);

      expect(spyA).toHaveBeenCalled();
      const lastCallA = spyA.mock.lastCall?.[0];
      assertNotNull(lastCallA);
      expect(lastCallA).toHaveProperty("x");
      expect(lastCallA).toHaveProperty("y");
      expect(lastCallA.x).toBeLessThanOrEqual(300);
      expect(lastCallA.x).toBeGreaterThanOrEqual(0);
      expect(lastCallA.y).toBeLessThanOrEqual(200);
      expect(lastCallA.y).toBeGreaterThanOrEqual(0);
    });

    it("should handle BarChart to ComposedChart synchronization", () => {
      const renderTestCase = createSynchronisedSelectorTestCase(
        (props: ChildrenProps) => (
          <ComposedChart syncId="barToComposedTest" data={PageData} width={250} height={180}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Line dataKey="uv" />
            {props.children}
          </ComposedChart>
        ),
        (props: ChildrenProps) => (
          <BarChart syncId="barToComposedTest" data={PageData} width={450} height={320}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="pv" />
            {props.children}
          </BarChart>
        ),
      );

      const { wrapperB, spyA } = renderTestCase((state) =>
        selectActiveCoordinate(state, "axis", "hover", undefined),
      );

      showTooltip(wrapperB, barChartMouseHoverTooltipSelector);

      expect(spyA).toHaveBeenCalled();
      const lastCallA = spyA.mock.lastCall?.[0];
      assertNotNull(lastCallA);
      expect(lastCallA).toHaveProperty("x");
      expect(lastCallA).toHaveProperty("y");
      expect(lastCallA.x).toBeLessThanOrEqual(250);
      expect(lastCallA.x).toBeGreaterThanOrEqual(0);
      expect(lastCallA.y).toBeLessThanOrEqual(180);
      expect(lastCallA.y).toBeGreaterThanOrEqual(0);
    });

    it("should handle ComposedChart to AreaChart synchronization", () => {
      const renderTestCase = createSynchronisedSelectorTestCase(
        (props: ChildrenProps) => (
          <AreaChart syncId="composedToAreaTest" data={PageData} width={280} height={220}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Area dataKey="uv" />
            {props.children}
          </AreaChart>
        ),
        (props: ChildrenProps) => (
          <ComposedChart syncId="composedToAreaTest" data={PageData} width={520} height={380}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Area dataKey="pv" />
            <Line dataKey="amt" />
            {props.children}
          </ComposedChart>
        ),
      );

      const { wrapperB, spyA } = renderTestCase((state) =>
        selectActiveCoordinate(state, "axis", "hover", undefined),
      );

      showTooltip(wrapperB, composedChartMouseHoverTooltipSelector);

      expect(spyA).toHaveBeenCalled();
      const lastCallA = spyA.mock.lastCall?.[0];
      assertNotNull(lastCallA);
      expect(lastCallA).toHaveProperty("x");
      expect(lastCallA).toHaveProperty("y");
      expect(lastCallA.x).toBeLessThanOrEqual(280);
      expect(lastCallA.x).toBeGreaterThanOrEqual(0);
      expect(lastCallA.y).toBeLessThanOrEqual(220);
      expect(lastCallA.y).toBeGreaterThanOrEqual(0);
    });
  });
});
