import { describe, expect, it } from "vitest";
import type { RechartsRootState } from "../../../src/state/store";
import { createRechartsStore } from "../../../src/state/store";
import { selectAxisScale } from "../../../src/state/selectors/axisSelectors";
import { shouldReturnUndefinedOutOfContext } from "../../helper/selectorTestHelpers";
import { Bar, BarChart, XAxis } from "../../../src";
import { expectXAxisTicks } from "../../helper/expectAxisTicks";
import { PageData } from "../../_data";
import { expectLastCalledWithScale } from "../../helper/expectScale";
import { createSelectorTestCase } from "../../helper/createSelectorTestCase";

/*
 * Ported from recharts 3.8.1 test/state/selectors/selectAxisScale.spec.tsx.
 * Omitted: the reselect `toBe` stability tests and the Redux `dispatch(...)`
 * "should not recompute" test (N/A — no reselect/dispatch in this Solid rewrite).
 * Ported: the value assertions (implicit scale, real scale) and the golden
 * domain/range + rendered X-axis tick geometry.
 */

describe("selectAxisScale", () => {
  shouldReturnUndefinedOutOfContext((state: RechartsRootState) =>
    selectAxisScale(state, "xAxis", "foo", false),
  );

  it("should return implicit scale if there is no XAxis with this ID", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <BarChart data={PageData} width={100} height={100}>
        <Bar dataKey="uv" />
        <XAxis dataKey="name" />
        {props.children}
      </BarChart>
    ));
    const { container, spy } = renderTestCase((state: RechartsRootState) =>
      selectAxisScale(state, "xAxis", "this id is not present in the chart", false),
    );
    expect(container.querySelector(".recharts-xAxis")).toBeTruthy();
    expectLastCalledWithScale(spy, { domain: [0, 1, 2, 3, 4, 5], range: [5, 95] });
  });

  it("should return scale if there is an Axis in the chart", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <BarChart data={PageData} width={100} height={100}>
        <Bar dataKey="uv" />
        <XAxis dataKey="name" />
        {props.children}
      </BarChart>
    ));
    const { container, spy } = renderTestCase((state: RechartsRootState) =>
      selectAxisScale(state, "xAxis", "0", false),
    );
    expect(container.querySelector(".recharts-xAxis")).toBeTruthy();
    expectLastCalledWithScale(spy, {
      domain: ["Page A", "Page B", "Page C", "Page D", "Page E", "Page F"],
      range: [5, 95],
    });
  });

  it("should set the scale domain and range based on the axis type, and data", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <BarChart data={PageData} width={100} height={100}>
        <Bar dataKey="uv" />
        <XAxis dataKey="name" />
        {props.children}
      </BarChart>
    ));
    const { container } = renderTestCase((state: RechartsRootState) =>
      selectAxisScale(state, "xAxis", "0", false),
    );
    expectXAxisTicks(container, [
      { textContent: "Page A", x: "12.5", y: "73" },
      { textContent: "Page B", x: "27.5", y: "73" },
      { textContent: "Page C", x: "42.5", y: "73" },
      { textContent: "Page D", x: "57.5", y: "73" },
      { textContent: "Page E", x: "72.5", y: "73" },
      { textContent: "Page F", x: "87.5", y: "73" },
    ]);
  });

  it("should not change when an irrelevant property in the state changes", () => {
    const store = createRechartsStore();
    const result1 = selectAxisScale(store.state, "xAxis", "0", false);
    store.actions.tooltip.setActiveMouseOverItemIndex({
      activeCoordinate: undefined,
      activeDataKey: "x",
      activeIndex: "7",
      activeGraphicalItemId: "foo",
    });
    const result2 = selectAxisScale(store.state, "xAxis", "0", false);
    expect(result1).toEqual(result2);
  });
});
