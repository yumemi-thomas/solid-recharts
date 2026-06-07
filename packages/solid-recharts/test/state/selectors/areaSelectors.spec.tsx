import { describe, expect, it } from "vitest";
import type { RechartsRootState } from "../../../src/state/store";
import { selectArea } from "../../../src/state/selectors/areaSelectors";
import type { ComputedArea } from "../../../src/cartesian/Area";
import {
  shouldReturnFromInitialState,
  shouldReturnUndefinedOutOfContext,
} from "../../helper/selectorTestHelpers";
import { createSelectorTestCase } from "../../helper/createSelectorTestCase";
import { Area, AreaChart, XAxis } from "../../../src";
import { PageData } from "../../_data";

/*
 * Ported from recharts 3.8.1 test/state/selectors/areaSelectors.spec.tsx.
 * The render-count / reselect `toBe` stability assertions and the
 * useState-button dataKey-change re-render test are omitted (React-specific /
 * N/A in this Solid rewrite). Ported: the pure value assertions and the golden
 * area geometry (points + baseLine + isRange) for a simple Area chart.
 */

describe("selectArea", () => {
  const selector = (state: RechartsRootState) => selectArea(state, "area-0", false);

  shouldReturnUndefinedOutOfContext(selector);
  shouldReturnFromInitialState(selector, undefined);

  it("should compute points, baseLine and inRange for a simple Area chart", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <AreaChart width={400} height={400} data={PageData}>
        <XAxis dataKey="name" />
        <Area dataKey="uv" id="area-0" />
        {props.children}
      </AreaChart>
    ));

    const expectedResult: ComputedArea = {
      baseLine: 365,
      isRange: false,
      points: [
        { payload: { amt: 2400, name: "Page A", pv: 2400, uv: 400 }, value: [0, 400], x: 5, y: 5 },
        {
          payload: { amt: 2400, name: "Page B", pv: 4567, uv: 300 },
          value: [0, 300],
          x: 83,
          y: 95,
        },
        {
          payload: { amt: 2400, name: "Page C", pv: 1398, uv: 300 },
          value: [0, 300],
          x: 161,
          y: 95,
        },
        {
          payload: { amt: 2400, name: "Page D", pv: 9800, uv: 200 },
          value: [0, 200],
          x: 239,
          y: 185,
        },
        {
          payload: { amt: 2400, name: "Page E", pv: 3908, uv: 278 },
          value: [0, 278],
          x: 317,
          y: 114.80000000000001,
        },
        {
          payload: { amt: 2400, name: "Page F", pv: 4800, uv: 189 },
          value: [0, 189],
          x: 395,
          y: 194.90000000000003,
        },
      ],
    };

    const { spy } = renderTestCase(selector);
    expect(spy).toHaveBeenLastCalledWith(expectedResult);
  });
});
