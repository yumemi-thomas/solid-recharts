import { describe } from "vitest";
import type { RechartsRootState } from "../../../src/state/store";
import { selectRealScaleType } from "../../../src/state/selectors/axisSelectors";
import {
  shouldReturnFromInitialState,
  shouldReturnUndefinedOutOfContext,
} from "../../helper/selectorTestHelpers";

/*
 * Ported from recharts 3.8.1 test/state/selectors/selectRealScaleType.spec.tsx.
 * The "stable between renders" test is omitted (reselect stability — N/A here).
 */

describe("selectRealScaleType", () => {
  const selector = (state: RechartsRootState) => selectRealScaleType(state, "xAxis", 0);

  shouldReturnUndefinedOutOfContext(selector);
  shouldReturnFromInitialState(selector, "band");
});
