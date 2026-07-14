// Port of recharts 3.8.1 test/state/selectors/selectStackGroups.spec.tsx (commit 7a23854).
// Tier-B selector values, golden-anchored. Harness deltas: render+Comp+spy →
// createSelectorTestCase; `useAppSelectorWithStableTest` → plain selector (no reselect
// stability in the Solid store). Stacked-data golden uses the toBeRechartsStackedData
// matcher registered by expectStackGroups (side-effect import). React render-count
// (toHaveBeenCalledTimes) assertions dropped.
// The "keep the order ... after hiding one item and displaying it again" case uses a
// Solid signal (in place of React useState) for the hidden-items set, toggled via the
// Legend onClick + a fireEvent.click on the legend item. (Parity fix shipped alongside:
// <Legend> now forwards onClick/onMouseEnter/onMouseLeave to <DefaultLegendContent>,
// which already wires them onto each .recharts-legend-item.)
import { createSignal } from "solid-js";
import type { JSX } from "solid-js";
import { describe, expect, it } from "vitest";
import { fireEvent } from "@solidjs/testing-library";
import type { RechartsRootState } from "../../../src/state/store";
import { selectStackGroups } from "../../../src/state/selectors/axisSelectors";
import {
  shouldReturnFromInitialState,
  shouldReturnUndefinedOutOfContext,
} from "../../helper/selectorTestHelpers";
import { createSelectorTestCase } from "../../helper/createSelectorTestCase";
import { expectLastCalledWith } from "../../helper/expectLastCalledWith";
import { assertNotNull } from "../../helper/assertNotNull";
import { Area, AreaChart, Bar, BarChart, Legend, type LegendPayload } from "../../../src";
import { PageData } from "../../_data";
import "../../helper/expectStackGroups"; // registers toBeRechartsStackedData (expect.extend)

const selector = (state: RechartsRootState) => selectStackGroups(state, "xAxis", 0, false);

const barSettings = (dataKey: string, stackId: string) => ({
  id: expect.stringMatching("^recharts-bar-[:a-z0-9]+$"),
  barSize: undefined,
  data: undefined,
  dataKey,
  hasCustomShape: false,
  hide: false,
  isPanorama: false,
  maxBarSize: undefined,
  minPointSize: 0,
  stackId,
  type: "bar",
  xAxisId: 0,
  yAxisId: 0,
  zAxisId: 0,
});

describe("selectStackGroups", () => {
  shouldReturnUndefinedOutOfContext(selector);
  shouldReturnFromInitialState(selector, {});

  it("should return empty object in an empty BarChart", () => {
    const { spy } = createSelectorTestCase((props) => (
      <BarChart width={100} height={100}>
        {props.children}
      </BarChart>
    ))(selector);
    expectLastCalledWith(spy, {});
  });

  it("should return object keyed by stack IDs, with bar settings and stacked data", () => {
    const { spy } = createSelectorTestCase((props) => (
      <BarChart width={100} height={100} data={PageData}>
        <Bar dataKey="uv" stackId="a" />
        <Bar dataKey="pv" stackId="a" />
        <Bar dataKey="uv" stackId="b" />
        <Bar dataKey="amt" stackId="b" />
        {props.children}
      </BarChart>
    ))(selector);
    expectLastCalledWith(spy, {
      a: {
        graphicalItems: [barSettings("uv", "a"), barSettings("pv", "a")],
        stackedData: expect.toBeRechartsStackedData([
          [
            [0, 400],
            [0, 300],
            [0, 300],
            [0, 200],
            [0, 278],
            [0, 189],
          ],
          [
            [400, 2800],
            [300, 4867],
            [300, 1698],
            [200, 10000],
            [278, 4186],
            [189, 4989],
          ],
        ]),
      },
      b: {
        graphicalItems: [barSettings("uv", "b"), barSettings("amt", "b")],
        stackedData: expect.toBeRechartsStackedData([
          [
            [0, 400],
            [0, 300],
            [0, 300],
            [0, 200],
            [0, 278],
            [0, 189],
          ],
          [
            [400, 2800],
            [300, 2700],
            [300, 2700],
            [200, 2600],
            [278, 2678],
            [189, 2589],
          ],
        ]),
      },
    });
  });

  it("should return empty object for Bars without stackId", () => {
    const { spy } = createSelectorTestCase((props) => (
      <BarChart width={100} height={100} data={PageData}>
        <Bar dataKey="uv" />
        <Bar dataKey="pv" />
        <Bar dataKey="amt" />
        {props.children}
      </BarChart>
    ))(selector);
    expectLastCalledWith(spy, {});
  });

  it("should select two graphical items in stack group in the DOM insertion order", () => {
    const { spy } = createSelectorTestCase((props) => (
      <AreaChart width={100} height={100} data={PageData}>
        <Area dataKey="uv" stackId="a" />
        <Area dataKey="pv" stackId="a" />
        {props.children}
      </AreaChart>
    ))(selector);
    const expectedArea = (dataKey: string) => ({
      id: expect.stringMatching("^recharts-area-[:a-z0-9]+$"),
      barSize: undefined,
      baseValue: undefined,
      connectNulls: false,
      data: undefined,
      dataKey,
      hide: false,
      isPanorama: false,
      stackId: "a",
      type: "area",
      xAxisId: 0,
      yAxisId: 0,
      zAxisId: 0,
    });
    expectLastCalledWith(spy, {
      a: {
        graphicalItems: [expectedArea("uv"), expectedArea("pv")],
        stackedData: expect.toBeRechartsStackedData([
          [
            [0, 400],
            [0, 300],
            [0, 300],
            [0, 200],
            [0, 278],
            [0, 189],
          ],
          [
            [400, 2800],
            [300, 4867],
            [300, 1698],
            [200, 10000],
            [278, 4186],
            [189, 4989],
          ],
        ]),
      },
    });
  });

  describe("when items in chart get hidden and then displayed again", () => {
    function MyTestCase(props: { children: JSX.Element }) {
      const [hiddenItems, setHiddenItems] = createSignal<ReadonlyArray<string>>([]);

      const handleClick = (data: LegendPayload) => {
        const dataKey = data.dataKey;
        if (typeof dataKey !== "string") {
          return;
        }
        setHiddenItems((prev) =>
          prev.includes(dataKey) ? prev.filter((key) => key !== dataKey) : [...prev, dataKey],
        );
      };

      return (
        <AreaChart width={100} height={100} data={PageData}>
          <Legend onClick={handleClick} />
          <Area dataKey="uv" stackId="a" hide={hiddenItems().includes("uv")} />
          <Area dataKey="pv" stackId="a" hide={hiddenItems().includes("pv")} />
          {props.children}
        </AreaChart>
      );
    }

    const renderTestCase = createSelectorTestCase(MyTestCase);

    describe("after hiding one item and displaying it again", () => {
      // https://github.com/recharts/recharts/issues/5992
      it("should keep the order of graphical items in stack group", () => {
        const { container, spy } = renderTestCase((state: RechartsRootState) =>
          selectStackGroups(state, "xAxis", 0, false),
        );

        expectLastCalledWith(spy, {
          a: expect.objectContaining({
            graphicalItems: [
              expect.objectContaining({ dataKey: "uv", hide: false }),
              expect.objectContaining({ dataKey: "pv", hide: false }),
            ],
          }),
        });

        // Re-query the legend item before each click: Solid's <For> recreates the
        // legend-item DOM node when the payload re-renders (React would reuse it), so a
        // node captured before a toggle is stale by the next click.
        const clickUvLegendItem = (): void => {
          const items = container.querySelectorAll(".recharts-legend-item");
          expect(items).toHaveLength(2);
          const uvItem = items[1];
          assertNotNull(uvItem);
          expect(uvItem.textContent).toBe("uv");
          fireEvent.click(uvItem);
        };

        clickUvLegendItem();

        expectLastCalledWith(spy, {
          a: expect.objectContaining({
            graphicalItems: [expect.objectContaining({ dataKey: "pv", hide: false })],
          }),
        });

        clickUvLegendItem();

        expectLastCalledWith(spy, {
          a: expect.objectContaining({
            graphicalItems: [
              // This should be in the same order as before hiding
              expect.objectContaining({ dataKey: "uv", hide: false }),
              expect.objectContaining({ dataKey: "pv", hide: false }),
            ],
          }),
        });
      });
    });
  });

  describe("reverseStackOrder", () => {
    it("should reverse the order of graphical items and stacked data when reverseStackOrder is true", () => {
      const { spy } = createSelectorTestCase((props) => (
        <BarChart width={100} height={100} data={PageData} reverseStackOrder>
          <Bar dataKey="uv" stackId="a" />
          <Bar dataKey="pv" stackId="a" />
          {props.children}
        </BarChart>
      ))(selector);
      expectLastCalledWith(spy, {
        a: {
          graphicalItems: [barSettings("pv", "a"), barSettings("uv", "a")],
          stackedData: expect.toBeRechartsStackedData([
            [
              [0, 2400],
              [0, 4567],
              [0, 1398],
              [0, 9800],
              [0, 3908],
              [0, 4800],
            ],
            [
              [2400, 2800],
              [4567, 4867],
              [1398, 1698],
              [9800, 10000],
              [3908, 4186],
              [4800, 4989],
            ],
          ]),
        },
      });
    });

    it("should maintain original order when reverseStackOrder is false", () => {
      const { spy } = createSelectorTestCase((props) => (
        <BarChart width={100} height={100} data={PageData} reverseStackOrder={false}>
          <Bar dataKey="uv" stackId="a" />
          <Bar dataKey="pv" stackId="a" />
          {props.children}
        </BarChart>
      ))(selector);
      expectLastCalledWith(spy, {
        a: {
          graphicalItems: [barSettings("uv", "a"), barSettings("pv", "a")],
          stackedData: expect.toBeRechartsStackedData([
            [
              [0, 400],
              [0, 300],
              [0, 300],
              [0, 200],
              [0, 278],
              [0, 189],
            ],
            [
              [400, 2800],
              [300, 4867],
              [300, 1698],
              [200, 10000],
              [278, 4186],
              [189, 4989],
            ],
          ]),
        },
      });
    });
  });
});
