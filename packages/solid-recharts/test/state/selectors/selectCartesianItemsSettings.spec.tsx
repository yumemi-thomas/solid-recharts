import { describe, expect, it } from "vitest";
import type { RechartsRootState } from "../../../src/state/store";
import { selectCartesianItemsSettings } from "../../../src/state/selectors/axisSelectors";
import {
  shouldReturnFromInitialState,
  shouldReturnUndefinedOutOfContext,
} from "../../helper/selectorTestHelpers";
import { createSelectorTestCase } from "../../helper/createSelectorTestCase";
import { Line, LineChart, XAxis } from "../../../src";
import { PageData } from "../../_data";
import { defaultAxisId } from "../../../src/state/cartesianAxisSlice";

/*
 * Ported from recharts 3.8.1 test/state/selectors/selectCartesianItemsSettings.spec.tsx.
 * The "stable between renders" test is omitted (reselect stability — N/A here).
 */

describe("selectCartesianItemsSettings", () => {
  const selector = (state: RechartsRootState) =>
    selectCartesianItemsSettings(state, "xAxis", defaultAxisId);

  shouldReturnUndefinedOutOfContext(selector);
  shouldReturnFromInitialState(selector, []);

  it("should return one item from a simple chart", () => {
    // NB: the wrapper reads `props.children` (NOT destructured) so the Spy mounts
    // INSIDE the chart's store — see the test-wrapper-no-destructure-children rule.
    const renderTestCase = createSelectorTestCase((props) => (
      <LineChart width={100} height={100}>
        <Line data={PageData} dataKey="pv" />
        <XAxis dataKey="name" />
        {props.children}
      </LineChart>
    ));
    const { spy } = renderTestCase(selector);
    expect(spy).toHaveBeenLastCalledWith([
      {
        data: [
          { amt: 2400, name: "Page A", pv: 2400, uv: 400 },
          { amt: 2400, name: "Page B", pv: 4567, uv: 300 },
          { amt: 2400, name: "Page C", pv: 1398, uv: 300 },
          { amt: 2400, name: "Page D", pv: 9800, uv: 200 },
          { amt: 2400, name: "Page E", pv: 3908, uv: 278 },
          { amt: 2400, name: "Page F", pv: 4800, uv: 189 },
        ],
        dataKey: "pv",
        hide: false,
        id: expect.stringMatching(/recharts-line-.+/),
        isPanorama: false,
        type: "line",
        xAxisId: 0,
        yAxisId: 0,
        zAxisId: 0,
      },
    ]);
  });
});
