import { describe } from "vitest";
import type { RechartsRootState } from "../../../src/state/store";
import { selectAxisRangeWithReverse } from "../../../src/state/selectors/axisSelectors";
import {
  shouldReturnFromInitialState,
  shouldReturnUndefinedOutOfContext,
} from "../../helper/selectorTestHelpers";

/*
 * Ported from recharts 3.8.1 test/state/selectors/selectAxisRangeWithReverse.spec.tsx.
 * Omitted: the "stable between rerenders" and "should not recompute …" tests —
 * both assert reselect reference stability across a Redux dispatch, which is N/A
 * in this no-reselect Solid rewrite (no dispatch, no selector memoization).
 */

describe("selectAxisRangeWithReverse", () => {
  const selector = (state: RechartsRootState) =>
    selectAxisRangeWithReverse(state, "xAxis", "0", false);

  shouldReturnUndefinedOutOfContext(selector);
  shouldReturnFromInitialState(selector, [5, 5]);
});
