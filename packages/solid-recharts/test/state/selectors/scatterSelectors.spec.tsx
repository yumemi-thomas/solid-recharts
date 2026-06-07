import { describe, expect, it } from "vitest";
import { selectScatterPoints } from "../../../src/state/selectors/scatterSelectors";
import { Pie, PieChart } from "../../../src";
import {
  shouldReturnFromInitialState,
  shouldReturnUndefinedOutOfContext,
} from "../../helper/selectorTestHelpers";
import type { RechartsRootState } from "../../../src/state/store";
import { createSelectorTestCase } from "../../helper/createSelectorTestCase";

/*
 * Ported from recharts 3.8.1 test/state/selectors/scatterSelectors.spec.tsx.
 * The "computed scatter points" golden test depends on the storybook `pageData`
 * dataset (not available here) and is omitted. Ported: the pure value assertions
 * and the "chart that does not support Scatter → undefined" guard.
 * Note: this port's selectScatterPoints signature is
 * (state, xAxisId, yAxisId, zAxisId, id, isPanorama, cells?).
 */

describe("selectScatterPoints", () => {
  const selector = (state: RechartsRootState) =>
    selectScatterPoints(state, 0, 0, 0, "scatter-id", false);

  shouldReturnUndefinedOutOfContext(selector);
  shouldReturnFromInitialState(selector, undefined);

  describe("in a chart that does not support Scatter", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <PieChart width={100} height={200}>
        <Pie
          data={[{ uv: 1 }]}
          dataKey="uv"
          isAnimationActive={false}
          cx="50%"
          cy="50%"
          outerRadius={80}
        />
        {props.children}
      </PieChart>
    ));

    it("should return undefined", () => {
      const { spy } = renderTestCase(selector);
      expect(spy).toHaveBeenCalledWith(undefined);
    });
  });
});
