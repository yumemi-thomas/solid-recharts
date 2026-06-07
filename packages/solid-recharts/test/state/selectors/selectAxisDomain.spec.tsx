import { describe } from "vitest";
import type { RechartsRootState } from "../../../src/state/store";
import { selectAxisDomain } from "../../../src/state/selectors/axisSelectors";
import {
  shouldReturnFromInitialState,
  shouldReturnUndefinedOutOfContext,
} from "../../helper/selectorTestHelpers";
import { defaultAxisId } from "../../../src/state/cartesianAxisSlice";

/*
 * Ported from recharts 3.8.1 test/state/selectors/selectAxisDomain.spec.tsx.
 * The "stable between renders" test is omitted (reselect stability — N/A here).
 */

describe("selectAxisDomain stable rendering", () => {
  const selector = (state: RechartsRootState) =>
    selectAxisDomain(state, "xAxis", defaultAxisId, false);

  shouldReturnUndefinedOutOfContext(selector);
  shouldReturnFromInitialState(selector, undefined);
});
