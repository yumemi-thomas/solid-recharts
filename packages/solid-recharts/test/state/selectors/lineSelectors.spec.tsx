import { describe, expect, it } from "vitest";
import type { RechartsRootState } from "../../../src/state/store";
import {
  shouldReturnFromInitialState,
  shouldReturnUndefinedOutOfContext,
} from "../../helper/selectorTestHelpers";
import { selectLinePoints } from "../../../src/state/selectors/lineSelectors";
import { CartesianGrid, Line, LineChart, Tooltip, XAxis } from "../../../src";
import { PageData } from "../../_data";
import type { LinePointItem } from "../../../src/cartesian/Line";
import { createSelectorTestCase } from "../../helper/createSelectorTestCase";

/*
 * Ported from recharts 3.8.1 test/state/selectors/lineSelectors.spec.tsx.
 * The recharts render tests drive React `useState`/`act` button clicks and assert
 * exact render COUNTS + reselect `toBe` stability — both N/A in the Solid rewrite.
 * Ported instead: the pure value assertions, and the golden POINT GEOMETRY for a
 * simple Line chart (the assertion that actually pins recharts' layout math).
 */

describe("selectLinePoints", () => {
  const selector = (state: RechartsRootState) => selectLinePoints(state, 0, 0, false, "my-line-id");

  shouldReturnUndefinedOutOfContext(selector);
  shouldReturnFromInitialState(selector, undefined);

  it("should compute the line points geometry in a simple Line chart", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <LineChart width={400} height={400} data={PageData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <Line dataKey="uv" id="my-line-id" />
        <Tooltip />
        {props.children}
      </LineChart>
    ));

    const expectedLines: ReadonlyArray<LinePointItem> = [
      { payload: { amt: 2400, name: "Page A", pv: 2400, uv: 400 }, value: 400, x: 5, y: 5 },
      { payload: { amt: 2400, name: "Page B", pv: 4567, uv: 300 }, value: 300, x: 83, y: 95 },
      { payload: { amt: 2400, name: "Page C", pv: 1398, uv: 300 }, value: 300, x: 161, y: 95 },
      { payload: { amt: 2400, name: "Page D", pv: 9800, uv: 200 }, value: 200, x: 239, y: 185 },
      {
        payload: { amt: 2400, name: "Page E", pv: 3908, uv: 278 },
        value: 278,
        x: 317,
        y: 114.80000000000001,
      },
      {
        payload: { amt: 2400, name: "Page F", pv: 4800, uv: 189 },
        value: 189,
        x: 395,
        y: 194.90000000000003,
      },
    ];

    const { spy } = renderTestCase(selector);
    expect(spy).toHaveBeenLastCalledWith(expectedLines);
  });
});
